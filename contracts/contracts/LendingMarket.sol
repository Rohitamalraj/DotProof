// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {BackingMonitor} from "./BackingMonitor.sol";
import {CircuitBreaker} from "./CircuitBreaker.sol";
import {Backstop} from "./Backstop.sol";

/// @title LendingMarket
/// @notice Isolated market: one collateral token (backed by a reserve), native POT as the borrow asset.
/// @dev Valuation needs no price oracle. Collateral and debt are both POT-denominated, so
///      collateral value = amount * backing ratio. Every borrow re-checks backing in the same
///      transaction, and fresh collateral is "seasoned" for N blocks before it can back a loan.
contract LendingMarket is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 private constant BPS = 10_000;
    uint256 private constant YEAR = 365 days;
    uint256 private constant INDEX_ONE = 1e18;

    struct Params {
        uint256 ltvBps;
        uint256 liqThresholdBps;
        uint256 tightenedLiqThresholdBps; // applied while the breaker is tripped
        uint256 liqBonusBps;
        uint256 seasoningBlocks;
        uint256 minBackingBps; // borrow reverts below this
        uint256 supplyCap;
        uint256 borrowCap;
        uint256 collateralCap;
        uint256 baseRateBps; // annual
        uint256 slopeBps; // annual, added at 100% utilization
        uint256 reserveFactorBps; // share of interest routed to the backstop
    }

    struct Position {
        uint256 seasoned; // collateral that can back a loan
        uint256 pending; // collateral still inside its seasoning window
        uint256 pendingSince; // block of the latest deposit into pending
        uint256 debt; // debt as of `index`
        uint256 index; // borrow index snapshot
    }

    IERC20 public immutable collateral;
    BackingMonitor public immutable monitor;
    CircuitBreaker public immutable breaker;
    Backstop public immutable backstop;
    Params public params;

    mapping(address => Position) public positions;
    mapping(address => uint256) public supplyShares;

    uint256 public totalShares;
    uint256 public totalSupplied; // lender assets, including lent-out and accrued interest
    uint256 public totalBorrows;
    uint256 public totalCollateral;
    uint256 public backstopPending;
    uint256 public borrowIndex = INDEX_ONE;
    uint256 public lastAccrual;

    error Paused();
    error BackingBelowThreshold(uint256 ratioBps);
    error ZeroAmount();
    error CapExceeded();
    error InsufficientLiquidity();
    error ExceedsBorrowLimit();
    error Healthy();
    error TransferFailed();
    error InsufficientBalance();
    error NotBackstop();

    event Supplied(address indexed lender, uint256 assets, uint256 shares);
    event SupplyWithdrawn(address indexed lender, uint256 assets, uint256 shares);
    event CollateralDeposited(address indexed user, uint256 amount, uint256 seasonedAtBlock);
    event CollateralWithdrawn(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 amount, uint256 ratioBps);
    event Repaid(address indexed user, uint256 amount);
    event Liquidated(address indexed user, address indexed liquidator, uint256 repaid, uint256 seized);
    event BadDebt(address indexed user, uint256 amount, uint256 coveredByBackstop);
    event BackstopFlushed(uint256 amount);

    constructor(address collateral_, address monitor_, address breaker_, address backstop_, Params memory p) {
        collateral = IERC20(collateral_);
        monitor = BackingMonitor(monitor_);
        breaker = CircuitBreaker(breaker_);
        backstop = Backstop(payable(backstop_));
        params = p;
        lastAccrual = block.timestamp;
    }

    receive() external payable {
        if (msg.sender != address(backstop)) revert NotBackstop();
    }

    // ───────────────────────────── views ─────────────────────────────

    function utilizationBps() public view returns (uint256) {
        return totalSupplied == 0 ? 0 : (totalBorrows * BPS) / totalSupplied;
    }

    function borrowRateBps() public view returns (uint256) {
        return params.baseRateBps + (params.slopeBps * utilizationBps()) / BPS;
    }

    function supplyRateBps() external view returns (uint256) {
        return (borrowRateBps() * utilizationBps() * (BPS - params.reserveFactorBps)) / (BPS * BPS);
    }

    function debtOf(address user) public view returns (uint256) {
        Position storage p = positions[user];
        if (p.debt == 0) return 0;
        return (p.debt * _projectedIndex()) / p.index;
    }

    function collateralOf(address user) public view returns (uint256) {
        Position storage p = positions[user];
        return p.seasoned + p.pending;
    }

    /// @notice Collateral that can currently back a loan (the pending bucket matures after seasoning).
    function seasonedCollateralOf(address user) public view returns (uint256) {
        Position storage p = positions[user];
        if (p.pending > 0 && block.number >= p.pendingSince + params.seasoningBlocks) return p.seasoned + p.pending;
        return p.seasoned;
    }

    function liqThresholdBps() public view returns (uint256) {
        return breaker.isPaused() ? params.tightenedLiqThresholdBps : params.liqThresholdBps;
    }

    /// @notice Collateral value in POT terms: amount scaled by the live backing ratio.
    function valueOf(uint256 amount) public view returns (uint256) {
        return (amount * monitor.ratioBps()) / BPS;
    }

    function maxBorrowOf(address user) public view returns (uint256) {
        uint256 cap = (valueOf(seasonedCollateralOf(user)) * params.ltvBps) / BPS;
        uint256 d = debtOf(user);
        return cap > d ? cap - d : 0;
    }

    /// @notice Health factor scaled by 1e18. Above 1e18 is healthy.
    function healthFactor(address user) public view returns (uint256) {
        uint256 d = debtOf(user);
        if (d == 0) return type(uint256).max;
        return (valueOf(collateralOf(user)) * liqThresholdBps() * 1e18) / (BPS * d);
    }

    // ───────────────────────────── lenders ─────────────────────────────

    function supply() external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        _accrue();
        if (totalSupplied + msg.value > params.supplyCap) revert CapExceeded();
        uint256 shares = totalShares == 0 ? msg.value : (msg.value * totalShares) / totalSupplied;
        supplyShares[msg.sender] += shares;
        totalShares += shares;
        totalSupplied += msg.value;
        emit Supplied(msg.sender, msg.value, shares);
    }

    function withdrawSupply(uint256 shares) external nonReentrant {
        if (shares == 0) revert ZeroAmount();
        if (supplyShares[msg.sender] < shares) revert InsufficientBalance();
        _accrue();
        uint256 assets = (shares * totalSupplied) / totalShares;
        uint256 liquidity = totalSupplied > totalBorrows ? totalSupplied - totalBorrows : 0;
        if (assets > liquidity) {
            // Each repay rounds a wei or so between per-user debt and totalBorrows. Tolerate that
            // dust so the last lender can exit; anything larger is a genuine liquidity shortfall.
            if (assets - liquidity > totalSupplied / 1e12 + 1000) revert InsufficientLiquidity();
            assets = liquidity;
        }
        supplyShares[msg.sender] -= shares;
        totalShares -= shares;
        totalSupplied -= assets;
        _send(msg.sender, assets);
        emit SupplyWithdrawn(msg.sender, assets, shares);
    }

    function supplyAssetsOf(address lender) external view returns (uint256) {
        return totalShares == 0 ? 0 : (supplyShares[lender] * totalSupplied) / totalShares;
    }

    // ───────────────────────────── borrowers ─────────────────────────────

    function depositCollateral(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (breaker.isPaused()) revert Paused();
        if (totalCollateral + amount > params.collateralCap) revert CapExceeded();
        _accrue();
        Position storage p = positions[msg.sender];
        _season(p);
        collateral.safeTransferFrom(msg.sender, address(this), amount);
        p.pending += amount;
        p.pendingSince = block.number; // new deposits restart the clock for the whole pending bucket
        totalCollateral += amount;
        emit CollateralDeposited(msg.sender, amount, block.number + params.seasoningBlocks);
    }

    function borrow(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (breaker.isPaused()) revert Paused();
        // Synchronous backing check: runs in the same transaction as the borrow, so an atomic
        // mint-and-borrow cannot slip past an off-chain monitor.
        uint256 ratio = monitor.ratioBps();
        if (ratio < params.minBackingBps) revert BackingBelowThreshold(ratio);
        _accrue();
        if (totalBorrows + amount > params.borrowCap) revert CapExceeded();
        if (totalSupplied - totalBorrows < amount) revert InsufficientLiquidity();

        Position storage p = positions[msg.sender];
        _season(p);
        uint256 newDebt = debtOf(msg.sender) + amount;
        if (newDebt * BPS > valueOf(p.seasoned) * params.ltvBps) revert ExceedsBorrowLimit();

        p.debt = newDebt;
        p.index = borrowIndex;
        totalBorrows += amount;
        _send(msg.sender, amount);
        emit Borrowed(msg.sender, amount, ratio);
    }

    function repay() external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        _accrue();
        Position storage p = positions[msg.sender];
        uint256 d = debtOf(msg.sender);
        uint256 pay = msg.value > d ? d : msg.value;
        p.debt = d - pay;
        p.index = borrowIndex;
        totalBorrows = pay > totalBorrows ? 0 : totalBorrows - pay;
        if (msg.value > pay) _send(msg.sender, msg.value - pay);
        emit Repaid(msg.sender, pay);
    }

    function withdrawCollateral(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        _accrue();
        Position storage p = positions[msg.sender];
        _season(p);
        if (p.pending + p.seasoned < amount) revert InsufficientBalance();
        // Take from the unseasoned bucket first, so withdrawing never eats borrowing power needlessly.
        uint256 fromPending = amount > p.pending ? p.pending : amount;
        p.pending -= fromPending;
        p.seasoned -= amount - fromPending;
        uint256 d = debtOf(msg.sender);
        if (d > 0 && d * BPS > valueOf(p.seasoned) * params.ltvBps) revert ExceedsBorrowLimit();
        totalCollateral -= amount;
        collateral.safeTransfer(msg.sender, amount);
        emit CollateralWithdrawn(msg.sender, amount);
    }

    // ───────────────────────────── liquidation ─────────────────────────────

    /// @notice Repay an unhealthy borrower's debt with msg.value and seize collateral plus a bonus.
    function liquidate(address user) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        _accrue();
        if (healthFactor(user) >= 1e18) revert Healthy();

        Position storage p = positions[user];
        uint256 d = debtOf(user);
        uint256 col = p.seasoned + p.pending;
        uint256 ratio = monitor.ratioBps();
        uint256 bonusFactor = BPS + params.liqBonusBps;

        uint256 repaid = msg.value > d ? d : msg.value;
        uint256 seize;
        if (ratio == 0) {
            seize = col;
            repaid = 0;
        } else {
            seize = (repaid * bonusFactor) / ratio;
            if (seize > col) {
                seize = col;
                repaid = (col * ratio) / bonusFactor;
            }
        }

        uint256 fromPending = seize > p.pending ? p.pending : seize;
        p.pending -= fromPending;
        p.seasoned -= seize - fromPending;
        totalCollateral -= seize;

        p.debt = d - repaid;
        p.index = borrowIndex;
        totalBorrows = repaid > totalBorrows ? 0 : totalBorrows - repaid;

        if (seize > 0) collateral.safeTransfer(msg.sender, seize);
        if (msg.value > repaid) _send(msg.sender, msg.value - repaid);
        emit Liquidated(user, msg.sender, repaid, seize);

        if (p.seasoned + p.pending == 0 && p.debt > 0) _writeOff(user, p);
    }

    function _writeOff(address user, Position storage p) private {
        uint256 bad = p.debt;
        p.debt = 0;
        totalBorrows = bad > totalBorrows ? 0 : totalBorrows - bad;
        uint256 before = address(this).balance;
        backstop.cover(bad);
        uint256 covered = address(this).balance - before;
        uint256 loss = bad - covered;
        totalSupplied = loss > totalSupplied ? 0 : totalSupplied - loss;
        emit BadDebt(user, bad, covered);
    }

    // ───────────────────────────── backstop ─────────────────────────────

    /// @notice Forward the interest share accrued for the backstop. Permissionless.
    function flushBackstop() external nonReentrant {
        _accrue();
        uint256 amt = backstopPending;
        backstopPending = 0;
        if (amt > 0) {
            (bool ok, ) = address(backstop).call{value: amt}("");
            if (!ok) revert TransferFailed();
        }
        emit BackstopFlushed(amt);
    }

    // ───────────────────────────── internals ─────────────────────────────

    function _projectedIndex() private view returns (uint256) {
        uint256 dt = block.timestamp - lastAccrual;
        if (dt == 0 || totalBorrows == 0) return borrowIndex;
        return borrowIndex + (borrowIndex * borrowRateBps() * dt) / (BPS * YEAR);
    }

    function _accrue() private {
        uint256 dt = block.timestamp - lastAccrual;
        lastAccrual = block.timestamp;
        if (dt == 0 || totalBorrows == 0) return;
        uint256 rate = borrowRateBps();
        uint256 interest = (totalBorrows * rate * dt) / (BPS * YEAR);
        borrowIndex += (borrowIndex * rate * dt) / (BPS * YEAR);
        uint256 cut = (interest * params.reserveFactorBps) / BPS;
        totalBorrows += interest;
        totalSupplied += interest - cut;
        backstopPending += cut;
    }

    function _season(Position storage p) private {
        if (p.pending > 0 && block.number >= p.pendingSince + params.seasoningBlocks) {
            p.seasoned += p.pending;
            p.pending = 0;
        }
    }

    function _send(address to, uint256 amount) private {
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title AgentRegistry
/// @notice Identity, bonds, rewards and slashing for the agent network.
/// @dev Agents post a native-currency bond to register under a role. Whether an alarm was true or false
///      is decided by deterministic contract logic (CircuitBreaker + BackingMonitor), never by the owner:
///      only registered *authorities* can reward or slash, and the owner can only manage that list and
///      fund the reward pool. Slashed bonds go to the Backstop. Rewards are pull-based so a hostile agent
///      contract can never block the breaker by reverting on receipt.
contract AgentRegistry is Ownable {
    enum Role {
        None,
        Sentinel,
        Keeper,
        Guardian
    }

    struct Agent {
        Role role;
        uint256 bond;
        uint64 unbondAt; // non-zero once the agent has asked to leave; they are inactive from then on
        uint32 confirmedAlarms;
        uint32 falseAlarms;
        uint256 earned;
        uint256 slashed;
    }

    mapping(address => Agent) public agents;
    mapping(address => uint256) public claimable;
    mapping(address => bool) public isAuthority;
    mapping(Role => uint256) public minBond;

    address payable public immutable backstop;
    uint256 public immutable slashBps; // share of the current bond taken per false alarm
    uint256 public immutable rewardAmount; // paid per confirmed alarm, capped by the pool
    uint256 public immutable unbondDelay; // seconds between requestUnbond and withdraw

    uint256 public totalBonds;
    uint256 public totalClaimable;

    error NotAuthority();
    error AlreadyRegistered();
    error NotRegistered();
    error BondTooLow();
    error BadRole();
    error NotUnbonding();
    error StillLocked();
    error NothingToClaim();
    error TransferFailed();

    event Registered(address indexed agent, Role role, uint256 bond);
    event ToppedUp(address indexed agent, uint256 amount);
    event AuthoritySet(address indexed authority, bool allowed);
    event Rewarded(address indexed agent, uint256 amount);
    event Slashed(address indexed agent, uint256 amount);
    event UnbondRequested(address indexed agent, uint64 unlockAt);
    event Withdrawn(address indexed agent, uint256 amount);
    event Claimed(address indexed agent, uint256 amount);
    event PoolFunded(address indexed from, uint256 amount);

    constructor(
        address owner_,
        address payable backstop_,
        uint256 sentinelMin,
        uint256 keeperMin,
        uint256 guardianMin,
        uint256 slashBps_,
        uint256 rewardAmount_,
        uint256 unbondDelay_
    ) Ownable(owner_) {
        backstop = backstop_;
        slashBps = slashBps_;
        rewardAmount = rewardAmount_;
        unbondDelay = unbondDelay_;
        minBond[Role.Sentinel] = sentinelMin;
        minBond[Role.Keeper] = keeperMin;
        minBond[Role.Guardian] = guardianMin;
    }

    // ───────────── owner: list management only, no power over any agent ─────────────

    function setAuthority(address who, bool allowed) external onlyOwner {
        isAuthority[who] = allowed;
        emit AuthoritySet(who, allowed);
    }

    /// @notice Anyone can add to the reward pool.
    function fundRewards() external payable {
        emit PoolFunded(msg.sender, msg.value);
    }

    /// @notice Native currency available for new rewards (excludes bonds and unclaimed rewards).
    function rewardPool() public view returns (uint256) {
        uint256 locked = totalBonds + totalClaimable;
        return address(this).balance > locked ? address(this).balance - locked : 0;
    }

    // ───────────── agents ─────────────

    function register(Role role) external payable {
        if (role == Role.None) revert BadRole();
        if (agents[msg.sender].role != Role.None) revert AlreadyRegistered();
        if (msg.value < minBond[role]) revert BondTooLow();
        agents[msg.sender].role = role;
        agents[msg.sender].bond = msg.value;
        totalBonds += msg.value;
        emit Registered(msg.sender, role, msg.value);
    }

    function topUp() external payable {
        Agent storage a = agents[msg.sender];
        if (a.role == Role.None) revert NotRegistered();
        a.bond += msg.value;
        totalBonds += msg.value;
        emit ToppedUp(msg.sender, msg.value);
    }

    /// @notice Active means: registered under `role`, not unbonding, and bond at or above the minimum.
    function isActive(address agent, Role role) public view returns (bool) {
        Agent storage a = agents[agent];
        return a.role == role && a.unbondAt == 0 && a.bond >= minBond[role];
    }

    /// @notice Start leaving. The agent is inactive immediately but stays slashable until the delay passes.
    function requestUnbond() external {
        Agent storage a = agents[msg.sender];
        if (a.role == Role.None) revert NotRegistered();
        a.unbondAt = uint64(block.timestamp + unbondDelay);
        emit UnbondRequested(msg.sender, a.unbondAt);
    }

    function withdraw() external {
        Agent storage a = agents[msg.sender];
        if (a.unbondAt == 0) revert NotUnbonding();
        if (block.timestamp < a.unbondAt) revert StillLocked();
        uint256 amount = a.bond;
        totalBonds -= amount;
        delete agents[msg.sender];
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(msg.sender, amount);
    }

    function claimRewards() external {
        uint256 amount = claimable[msg.sender];
        if (amount == 0) revert NothingToClaim();
        claimable[msg.sender] = 0;
        totalClaimable -= amount;
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Claimed(msg.sender, amount);
    }

    // ───────────── authorities (the CircuitBreaker) ─────────────

    function recordConfirmed(address agent) external {
        if (!isAuthority[msg.sender]) revert NotAuthority();
        Agent storage a = agents[agent];
        if (a.role == Role.None) return;
        a.confirmedAlarms += 1;
        uint256 pool = rewardPool();
        uint256 pay = rewardAmount > pool ? pool : rewardAmount;
        if (pay > 0) {
            claimable[agent] += pay;
            totalClaimable += pay;
            a.earned += pay;
            emit Rewarded(agent, pay);
        }
    }

    function recordFalseAlarm(address agent) external {
        if (!isAuthority[msg.sender]) revert NotAuthority();
        Agent storage a = agents[agent];
        if (a.role == Role.None) return;
        a.falseAlarms += 1;
        uint256 penalty = (a.bond * slashBps) / 10_000;
        if (penalty == 0) return;
        a.bond -= penalty;
        a.slashed += penalty;
        totalBonds -= penalty;
        (bool ok, ) = backstop.call{value: penalty}("");
        if (!ok) revert TransferFailed();
        emit Slashed(agent, penalty);
    }
}

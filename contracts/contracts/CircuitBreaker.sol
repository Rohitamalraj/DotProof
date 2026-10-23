// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BackingMonitor} from "./BackingMonitor.sol";
import {AgentRegistry} from "./AgentRegistry.sol";

/// @title CircuitBreaker
/// @notice Per-market pause. Agents can only tighten; nobody can unpause by decree.
/// @dev Two ways to be paused:
///      1. A registered, active Sentinel calls trip(): a time-limited pause that expires on its own.
///      2. Anyone calls confirm() while BackingMonitor reports under-backing: a hard pause that only
///         release() can lift, and only once backing is restored. This is the deterministic condition.
///      Every trip is later judged by that same condition and the Sentinel is paid or slashed through the
///      AgentRegistry: true alarm (backing really was below threshold) is rewarded, a false alarm that
///      expires while the market is fully backed is slashed. There is no owner and no admin key.
contract CircuitBreaker {
    BackingMonitor public immutable monitor;
    AgentRegistry public immutable registry;
    uint256 public immutable thresholdBps;
    uint256 public immutable pauseTtl; // seconds

    uint256 public pausedUntil;
    bool public confirmed;

    address public tripper; // sentinel behind the latest trip
    bool public tripPending; // true until that trip has been judged

    error NotSentinel();
    error StillBacked();
    error NotConfirmed();
    error BackingNotRestored();
    error TripPending();
    error NothingToSettle();
    error NotExpired();

    event Tripped(address indexed by, uint256 until, string reason);
    event Confirmed(address indexed by, uint256 ratioBps);
    event Released(address indexed by);
    event AlarmJudged(address indexed sentinel, bool wasTrue);

    constructor(address monitor_, uint256 thresholdBps_, uint256 pauseTtl_, address registry_) {
        monitor = BackingMonitor(monitor_);
        thresholdBps = thresholdBps_;
        pauseTtl = pauseTtl_;
        registry = AgentRegistry(registry_);
    }

    function isPaused() public view returns (bool) {
        return confirmed || block.timestamp < pausedUntil;
    }

    /// @notice Sentinel-initiated, expiring pause. One unjudged trip at a time.
    function trip(string calldata reason) external {
        if (!registry.isActive(msg.sender, AgentRegistry.Role.Sentinel)) revert NotSentinel();
        if (tripPending) revert TripPending();
        tripper = msg.sender;
        tripPending = true;
        pausedUntil = block.timestamp + pauseTtl;
        emit Tripped(msg.sender, pausedUntil, reason);
    }

    /// @notice Permissionless: promote to a hard pause when backing is provably below threshold.
    ///         If a Sentinel's trip is pending, the alarm is judged true and rewarded.
    function confirm() external {
        if (monitor.isBacked(thresholdBps)) revert StillBacked();
        confirmed = true;
        emit Confirmed(msg.sender, monitor.ratioBps());
        _judge(true);
    }

    /// @notice Permissionless: settle an expired trip. Under-backed now means the alarm was true
    ///         (and becomes a hard pause); fully backed means a false alarm and the Sentinel is slashed.
    function settleExpired() external {
        if (!tripPending) revert NothingToSettle();
        if (block.timestamp < pausedUntil) revert NotExpired();
        if (monitor.isBacked(thresholdBps)) {
            _judge(false);
        } else {
            confirmed = true;
            emit Confirmed(msg.sender, monitor.ratioBps());
            _judge(true);
        }
    }

    /// @notice Permissionless: lift a hard pause once backing is back above threshold.
    function release() external {
        if (!confirmed) revert NotConfirmed();
        if (!monitor.isBacked(thresholdBps)) revert BackingNotRestored();
        confirmed = false;
        emit Released(msg.sender);
    }

    function _judge(bool wasTrue) private {
        if (!tripPending) return;
        tripPending = false;
        address s = tripper;
        if (wasTrue) registry.recordConfirmed(s);
        else registry.recordFalseAlarm(s);
        emit AlarmJudged(s, wasTrue);
    }
}

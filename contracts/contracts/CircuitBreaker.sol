// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {BackingMonitor} from "./BackingMonitor.sol";

/// @title CircuitBreaker
/// @notice Per-market pause. Agents can only tighten; nobody can unpause by decree.
/// @dev Two ways to be paused:
///      1. A sentinel calls trip(): a time-limited pause that expires on its own unless confirmed.
///      2. Anyone calls confirm() while BackingMonitor reports under-backing: a hard pause that only
///         release() can lift, and only once backing is restored. This is the deterministic condition.
///      The owner can manage the sentinel list but has no unpause power.
contract CircuitBreaker is Ownable {
    BackingMonitor public immutable monitor;
    uint256 public immutable thresholdBps;
    uint256 public immutable pauseTtl; // seconds

    mapping(address => bool) public isSentinel;
    uint256 public pausedUntil;
    bool public confirmed;

    error NotSentinel();
    error StillBacked();
    error NotConfirmed();
    error BackingNotRestored();

    event SentinelSet(address indexed sentinel, bool allowed);
    event Tripped(address indexed by, uint256 until, string reason);
    event Confirmed(address indexed by, uint256 ratioBps);
    event Released(address indexed by);

    constructor(address monitor_, uint256 thresholdBps_, uint256 pauseTtl_, address owner_) Ownable(owner_) {
        monitor = BackingMonitor(monitor_);
        thresholdBps = thresholdBps_;
        pauseTtl = pauseTtl_;
    }

    function setSentinel(address who, bool allowed) external onlyOwner {
        isSentinel[who] = allowed;
        emit SentinelSet(who, allowed);
    }

    function isPaused() public view returns (bool) {
        return confirmed || block.timestamp < pausedUntil;
    }

    /// @notice Sentinel-initiated, expiring pause.
    function trip(string calldata reason) external {
        if (!isSentinel[msg.sender]) revert NotSentinel();
        pausedUntil = block.timestamp + pauseTtl;
        emit Tripped(msg.sender, pausedUntil, reason);
    }

    /// @notice Permissionless: promote a pause to a hard pause when backing is provably below threshold.
    function confirm() external {
        if (monitor.isBacked(thresholdBps)) revert StillBacked();
        confirmed = true;
        emit Confirmed(msg.sender, monitor.ratioBps());
    }

    /// @notice Permissionless: lift a hard pause once backing is back above threshold.
    function release() external {
        if (!confirmed) revert NotConfirmed();
        if (!monitor.isBacked(thresholdBps)) revert BackingNotRestored();
        confirmed = false;
        emit Released(msg.sender);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Gateway} from "../Gateway.sol";

/// @title WeakGateway
/// @notice EXPLOIT REPRODUCTION FIXTURE. NOT A PRODUCTION BRIDGE.
/// @dev Adds a privileged mint path that creates bPOT with no reserve behind it. This mirrors how the
///      KelpDAO attacker obtained unbacked tokens through a forged cross-chain message. It exists only
///      so the BackingMonitor and CircuitBreaker have something real to catch in the demo.
contract WeakGateway is Gateway {
    address public immutable attacker;

    error NotAttacker();

    constructor(address attacker_) {
        attacker = attacker_;
    }

    /// @notice The deliberately broken path: mint without locking anything.
    function forgedMint(address to, uint256 amount) external {
        if (msg.sender != attacker) revert NotAttacker();
        token.mint(to, amount);
    }
}

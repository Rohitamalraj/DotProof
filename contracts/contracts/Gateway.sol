// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {BPOT} from "./BPOT.sol";

/// @title Gateway
/// @notice Mints bPOT 1:1 against native POT it holds, and burns it on withdrawal.
/// @dev The Gateway itself is the reserve: the native POT backing bPOT sits in this contract's balance.
///      (An earlier design used a separate Reserve contract; merging them saves a contract's fixed
///      deposit on Portaldot V3.) Amounts are in the chain's EVM-side unit, 1e18 per tPOT.
contract Gateway is ReentrancyGuard {
    BPOT public immutable token;

    error ZeroAmount();
    error TransferFailed();

    event Minted(address indexed account, uint256 amount);
    event Redeemed(address indexed account, uint256 amount);

    constructor() {
        token = new BPOT(address(this));
    }

    /// @notice Address that holds the backing. Read by BackingMonitor.
    function reserve() external view returns (address) {
        return address(this);
    }

    /// @notice Native POT currently backing bPOT.
    function balance() external view returns (uint256) {
        return address(this).balance;
    }

    function deposit() external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        token.mint(msg.sender, msg.value);
        emit Minted(msg.sender, msg.value);
    }

    /// @notice Burns bPOT and releases POT. If the reserve is short, this reverts (first come, first served).
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        token.burn(msg.sender, amount);
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Redeemed(msg.sender, amount);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Backstop
/// @notice First-loss reserve funded by a share of market interest and drawn on bad debt.
contract Backstop is Ownable {
    mapping(address => bool) public isMarket;

    error NotMarket();
    error TransferFailed();

    event MarketRegistered(address indexed market);
    event Funded(address indexed from, uint256 amount);
    event Covered(address indexed market, uint256 requested, uint256 paid);

    constructor(address owner_) Ownable(owner_) {}

    function registerMarket(address market) external onlyOwner {
        isMarket[market] = true;
        emit MarketRegistered(market);
    }

    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }

    /// @notice Pays up to `need` to the calling market. Returns what was actually paid.
    function cover(uint256 need) external returns (uint256 paid) {
        if (!isMarket[msg.sender]) revert NotMarket();
        uint256 bal = address(this).balance;
        paid = need > bal ? bal : need;
        if (paid > 0) {
            (bool ok, ) = msg.sender.call{value: paid}("");
            if (!ok) revert TransferFailed();
        }
        emit Covered(msg.sender, need, paid);
    }
}

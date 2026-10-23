// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISupply {
    function totalSupply() external view returns (uint256);
}

interface IReserveBalance {
    function balance() external view returns (uint256);
}

/// @title BackingMonitor
/// @notice Reusable primitive: reserve balance divided by token supply, computed on-chain.
/// @dev Works for any token whose backing is held as native currency by one reserve contract.
contract BackingMonitor {
    uint256 public constant FULL = 10_000; // 100.00% in basis points

    ISupply public immutable token;
    IReserveBalance public immutable reserve;

    constructor(address token_, address reserve_) {
        token = ISupply(token_);
        reserve = IReserveBalance(reserve_);
    }

    function reserves() public view returns (uint256) {
        return reserve.balance();
    }

    function supply() public view returns (uint256) {
        return token.totalSupply();
    }

    /// @notice Backing ratio in basis points, capped at 100%. An empty supply counts as fully backed.
    function ratioBps() public view returns (uint256) {
        uint256 s = supply();
        if (s == 0) return FULL;
        uint256 r = (reserves() * FULL) / s;
        return r > FULL ? FULL : r;
    }

    function isBacked(uint256 minBps) public view returns (bool) {
        return ratioBps() >= minBps;
    }
}

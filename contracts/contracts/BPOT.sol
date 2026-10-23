// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title bPOT
/// @notice Lock-and-mint wrapped POT. Only the Gateway that deployed it can mint or burn.
/// @dev A minimal ERC-20, written by hand to keep deployed bytecode small. Contract code on Portaldot V3
///      carries a storage deposit of roughly 0.06 tPOT per byte, so size matters. 18 decimals,
///      matching the chain's EVM-side unit (revive.nativeToEthRatio maps 14 native decimals to 18).
contract BPOT {
    string public constant name = "Backed POT";
    string public constant symbol = "bPOT";
    uint8 public constant decimals = 18;

    address public immutable gateway;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    error NotGateway();
    error InsufficientBalance();
    error InsufficientAllowance();

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(address gateway_) {
        gateway = gateway_;
    }

    function mint(address to, uint256 amount) external {
        if (msg.sender != gateway) revert NotGateway();
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function burn(address from, uint256 amount) external {
        if (msg.sender != gateway) revert NotGateway();
        if (balanceOf[from] < amount) revert InsufficientBalance();
        unchecked {
            balanceOf[from] -= amount;
        }
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _move(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 a = allowance[from][msg.sender];
        if (a != type(uint256).max) {
            if (a < amount) revert InsufficientAllowance();
            unchecked {
                allowance[from][msg.sender] = a - amount;
            }
        }
        _move(from, to, amount);
        return true;
    }

    function _move(address from, address to, uint256 amount) private {
        if (balanceOf[from] < amount) revert InsufficientBalance();
        unchecked {
            balanceOf[from] -= amount;
        }
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}

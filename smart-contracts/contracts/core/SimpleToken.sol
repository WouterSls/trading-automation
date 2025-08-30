// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleToken
 * @dev A simple ERC20 token with permit functionality (EIP-712 signatures)
 * This demonstrates basic smart contract development in your trading engine repo
 */
contract SimpleToken is ERC20, ERC20Permit, Ownable {
    uint8 private _decimals;
    
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        uint256 initialSupply,
        address owner
    ) ERC20(name, symbol) ERC20Permit(name) Ownable(owner) {
        _decimals = decimals_;
        _mint(owner, initialSupply * 10**decimals_);
    }
    
    /**
     * @dev Override decimals to allow custom precision
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    /**
     * @dev Mint new tokens (only owner)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Burn tokens from caller's account
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
    
    /**
     * @dev Get domain separator for EIP-712 (inherited from ERC20Permit)
     * This is useful for your trading engine's signature verification
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
    
    /**
     * @dev Get current nonce for an account (useful for permit signatures)
     */
    function getNonce(address owner) external view returns (uint256) {
        return nonces(owner);
    }
}

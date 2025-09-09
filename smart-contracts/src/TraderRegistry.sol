// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ITraderRegistry} from "./interfaces/ITraderRegistry.sol";
import {Types} from "./libraries/Types.sol";

/**
 * @title TraderRegistry
 * @notice Registry for managing DEX protocol implementations
 * @dev Uses enum-based protocol identification for better type safety and gas efficiency
 */
contract TraderRegistry is ITraderRegistry {
    error ProtocolNotSupported(Types.Protocol protocol);
    error ProtocolAlreadyRegistered(Types.Protocol protocol);
    error ZeroAddress();
    error EmptyName();
    error OnlyOwner();

    address public owner;
    mapping(Types.Protocol => Types.ProtocolInfo) public protocols;

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier validAddress(address addr) {
        if (addr == address(0)) revert ZeroAddress();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Check if a protocol is supported and active
     * @param protocol The protocol to check
     * @return bool Whether the protocol is supported
     */
    function isProtocolSupported(Types.Protocol protocol) external view returns (bool) {
        return protocols[protocol].active;
    }

    /**
     * @notice Get the implementation address for a protocol
     * @param protocol The protocol to get the implementation for
     * @return address The implementation contract address
     */
    function getTrader(Types.Protocol protocol) external view returns (address) {
        if (!protocols[protocol].active) revert ProtocolNotSupported(protocol);
        return protocols[protocol].implementation;
    }

    /**
     * @notice Get complete information about a protocol
     * @param protocol The protocol to get information for
     * @return ProtocolInfo Complete protocol information
     */
    function getProtocolInfo(Types.Protocol protocol) external view returns (Types.ProtocolInfo memory) {
        return protocols[protocol];
    }

    /**
     * @notice Register a new protocol implementation
     * @param protocol The protocol enum to register
     * @param implementation The implementation contract address
     * @param name Human-readable name for the protocol
     */
    function registerProtocol(
        Types.Protocol protocol,
        address implementation,
        string calldata name
    ) external onlyOwner validAddress(implementation) {
        if (bytes(name).length == 0) revert EmptyName();
        if (protocols[protocol].implementation != address(0)) revert ProtocolAlreadyRegistered(protocol);

        protocols[protocol] = Types.ProtocolInfo({
            implementation: implementation,
            active: true,
            version: block.timestamp,
            name: name
        });

        emit ProtocolRegistered(protocol, implementation, name);
    }

    /**
     * @notice Update an existing protocol implementation
     * @param protocol The protocol to update
     * @param newImplementation The new implementation contract address
     */
    function updateProtocol(
        Types.Protocol protocol,
        address newImplementation
    ) external onlyOwner validAddress(newImplementation) {
        if (protocols[protocol].implementation == address(0)) revert ProtocolNotSupported(protocol);

        protocols[protocol].implementation = newImplementation;
        protocols[protocol].version = block.timestamp;

        emit ProtocolUpdated(protocol, newImplementation);
    }

    /**
     * @notice Enable or disable a protocol
     * @param protocol The protocol to update
     * @param active Whether the protocol should be active
     */
    function setProtocolStatus(Types.Protocol protocol, bool active) external onlyOwner {
        if (protocols[protocol].implementation == address(0)) revert ProtocolNotSupported(protocol);

        protocols[protocol].active = active;

        emit ProtocolStatusChanged(protocol, active);
    }

    /**
     * @notice Transfer ownership to a new owner
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) external onlyOwner validAddress(newOwner) {
        owner = newOwner;
    }
}

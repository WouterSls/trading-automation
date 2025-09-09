// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Types} from "../libraries/Types.sol";

interface ITraderRegistry {
    event ProtocolRegistered(Types.Protocol indexed protocol, address indexed implementation, string name);
    event ProtocolUpdated(Types.Protocol indexed protocol, address indexed newImplementation);
    event ProtocolStatusChanged(Types.Protocol indexed protocol, bool active);

    function getTrader(Types.Protocol protocol) external view returns (address);
    function isProtocolSupported(Types.Protocol protocol) external view returns (bool);
    function registerProtocol(Types.Protocol protocol, address implementation, string calldata name) external;
    function updateProtocol(Types.Protocol protocol, address newImplementation) external;
    function setProtocolStatus(Types.Protocol protocol, bool active) external;
    function getProtocolInfo(Types.Protocol protocol) external view returns (Types.ProtocolInfo memory);
}
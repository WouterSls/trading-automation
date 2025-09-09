// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ITrader} from "./interfaces/ITrader.sol";
import {ExecutorValidation} from "./libraries/ExecutorValidation.sol";

contract TraderRegistry {
    struct TraderInfo {
        address implementation;
        bool active;
        uint256 version;
    }

    error TraderNotAllowed();

    address public owner;
    mapping(address => TraderInfo) public traders;

    function isTraderSupported(address trader) external view returns (bool) {
        return traders[trader].active;
    }

    function getTrader(address trader) external view returns (address) {
        return traders[trader].implementation;
    }

    function registerTrader(address trader, address implementation) external onlyOwner {
        traders[trader] = TraderInfo(implementation, true, block.timestamp);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }
}

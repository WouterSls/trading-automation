// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library Types {
    enum Protocol {
        UNISWAP_V2,
        UNISWAP_V3,
        SUSHISWAP,
        BALANCER_V2,
        CURVE,
        PANCAKESWAP_V2,
        PANCAKESWAP_V3,
        TRADER_JOE,
        QUICKSWAP
    }

    struct ProtocolInfo {
        address implementation;
        bool active;
        uint256 version;
        string name;
    }
}

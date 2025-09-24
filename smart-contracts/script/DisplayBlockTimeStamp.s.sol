// SPDX-License-Identifier: MIT 

pragma solidity ^0.8.20;


import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

contract DisplayTimeStamp is Script {
    function run() external {
        console.log("Current block timestamp:", block.timestamp);
        console.log("Chain id:", block.chainid);
    }
}
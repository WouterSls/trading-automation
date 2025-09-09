// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {TraderRegistry} from "../src/TraderRegistry.sol";

contract DeployExecutorBase is Script {
    // UniswapV3 SwapRouter02 address (same across chains)
    address private constant UNIV3_ROUTER = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;

    function run() external returns (TraderRegistry) {
        uint256 pk = vm.envUint("DEPLOYER_KEY");
        vm.startBroadcast(pk);
        TraderRegistry registry = new TraderRegistry();
        vm.stopBroadcast();
        return registry;
    }
}

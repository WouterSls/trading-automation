// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {Executor} from "../src/Executor.sol";

contract DeployExecutorBase is Script {
    function run() external returns (Executor) {
        uint256 pk = vm.envUint("DEPLOYER_KEY");
        vm.startBroadcast(pk);
        Executor executor = new Executor();
        vm.stopBroadcast();
        return executor;
    }
}

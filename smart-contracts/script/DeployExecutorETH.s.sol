// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Executor} from "../src/Executor.sol";
import {ERC20Mock} from "../lib/openzeppelin-contracts/contracts/mocks/token/ERC20Mock.sol";

contract DeployExecutorBase is Script {
    function run() external returns (Executor) {
        uint256 pk = vm.envUint("DEPLOYER_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);
        Executor executor = new Executor();
        ERC20Mock tokenA = new ERC20Mock();
        ERC20Mock tokenB = new ERC20Mock();

        tokenA.mint(deployer,1 * 10**18);
        vm.stopBroadcast();

        console.log("DEPLOYER ADDRESS:");
        console.log(deployer);
        console.log();

        console.log("EXECUTOR ADDRESS:");
        console.log(address(executor));
        console.log();

        console.log("TOKEN A ADDRESS:");
        console.log(address(tokenA));
        console.log();

        console.log("TOKEN B ADDRESS:");
        console.log(address(tokenB));
        console.log();

        console.log("OWNER:");
        console.log(executor.owner());
        console.log();


        return executor;
    }
}

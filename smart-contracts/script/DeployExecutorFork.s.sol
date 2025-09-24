// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Executor} from "../src/Executor.sol";
import {ERC20Mock} from "../lib/openzeppelin-contracts/contracts/mocks/token/ERC20Mock.sol";

contract DeployExecutorBase is Script {
    function run() external returns (Executor) {
        uint256 pk = vm.envUint("DEPLOYER_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);
        //Permit2 permit2 = new Permit2();
        address permit2Address = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
        
        // Deploy Executor with Permit2 address
        Executor executor = new Executor(permit2Address);
        
        // Deploy mock tokens
        ERC20Mock tokenA = new ERC20Mock();
        ERC20Mock tokenB = new ERC20Mock();

        vm.stopBroadcast();

        console.log("DEPLOYER ADDRESS:");
        console.log(deployer);
        console.log();

        console.log("PERMIT2 ADDRESS:");
        console.log(permit2Address);
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

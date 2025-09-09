// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {UniswapV3Trader} from "../src/traders/UniswapV3Trader.sol";

contract DeployExecutorBase is Script {
    // UniswapV3 SwapRouter02 address (same across chains)
    address private constant UNIV3_ROUTER = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;

    function run() external returns (UniswapV3Trader) {
        uint256 pk = vm.envUint("DEPLOYER_KEY");
        vm.startBroadcast(pk);
        UniswapV3Trader trader = new UniswapV3Trader();
        vm.stopBroadcast();
        return trader;
    }
}

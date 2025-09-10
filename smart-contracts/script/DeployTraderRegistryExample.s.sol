// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {TraderRegistry} from "../src/TraderRegistry.sol";
import {UniswapV3Trader} from "../src/traders/UniswapV3Trader.sol";
import {Types} from "../src/libraries/Types.sol";

/**
 * @title DeployTraderRegistryExample
 * @notice Example deployment script showing how to set up the new registry pattern
 * @dev This demonstrates the improved enum-based protocol registration
 */
contract DeployTraderRegistryExample is Script {
    address private constant EXECUTOR = address(0);

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy the registry
        TraderRegistry registry = new TraderRegistry();
        console.log("TraderRegistry deployed at:", address(registry));

        // 2. Deploy trader implementations
        UniswapV3Trader uniswapV3Trader = new UniswapV3Trader(EXECUTOR);
        console.log("UniswapV3Trader deployed at:", address(uniswapV3Trader));

        // 3. Register protocols using the new enum-based system
        registry.registerProtocol(
            Types.Protocol.UNISWAP_V3,
            address(uniswapV3Trader),
            "Uniswap V3"
        );

        // Example: Register more protocols (you would deploy these implementations first)
        // registry.registerProtocol(
        //     Types.Protocol.UNISWAP_V2,
        //     address(uniswapV2Trader),
        //     "Uniswap V2"
        // );
        
        // registry.registerProtocol(
        //     Types.Protocol.SUSHISWAP,
        //     address(sushiswapTrader),
        //     "SushiSwap"
        // );

        // 4. Verify registration
        bool isSupported = registry.isProtocolSupported(Types.Protocol.UNISWAP_V3);
        address implementation = registry.getTrader(Types.Protocol.UNISWAP_V3);
        
        console.log("UNISWAP_V3 supported:", isSupported);
        console.log("UNISWAP_V3 implementation:", implementation);

        // 5. Get protocol info
        Types.ProtocolInfo memory info = registry.getProtocolInfo(Types.Protocol.UNISWAP_V3);
        console.log("Protocol name:", info.name);
        console.log("Protocol active:", info.active);

        vm.stopBroadcast();
    }
}

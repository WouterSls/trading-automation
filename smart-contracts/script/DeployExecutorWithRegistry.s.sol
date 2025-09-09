// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Executor} from "../src/Executor.sol";

/**
 * @title DeployExecutor
 * @notice Foundry deployment script for the Executor contract
 * @dev Usage: forge script script/DeployExecutor.s.sol --rpc-url <RPC_URL> --private-key <PRIVATE_KEY> --broadcast
 */
contract DeployExecutor is Script {
    // Known contract addresses across chains
    address constant UNIV3_ROUTER = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;
    address constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    address constant REGISTRY_ADDRESS = address(0);

    function run() external returns (Executor executor) {
        console.log("Deploying Executor contract...");
        console.log("Deployer:", msg.sender);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast();

        // Deploy the Executor contract
        executor = new Executor();
        console.log("Executor deployed at:", address(executor));

        // Setup initial configuration
        console.log("Setting up initial router allowlist...");

        // Allow UniswapV3 SwapRouter02
        executor.updateTraderRegistry(REGISTRY_ADDRESS);
        console.log("updated trader registry with address: ", REGISTRY_ADDRESS);

        vm.stopBroadcast();

        // Log deployment summary
        _logDeploymentSummary(executor);

        return executor;
    }

    function _logDeploymentSummary(Executor executor) internal view {
        console.log("\nDeployment Summary:");
        console.log("=====================================");
        console.log("Executor Address:", address(executor));
        console.log("Owner:", executor.owner());
        console.log("Chain ID:", block.chainid);
        console.log("Registry Address:", REGISTRY_ADDRESS);
        console.log("Permit2 Address:", PERMIT2);

        console.log("\nNext Steps:");
        console.log("1. Update EXECUTOR_CONTRACT_ADDRESS in your TypeScript code");
        console.log("2. Verify contract on block explorer if deploying to mainnet");
        console.log("3. Test with small amounts on testnet first");
        console.log("4. Consider adding additional routers via setAllowedRouter()");

        // Environment-specific notes
        if (block.chainid == 1) {
            console.log("\nEthereum Mainnet Deployment");
            console.log("Use extreme caution - real funds at risk!");
        } else if (block.chainid == 5) {
            console.log("\nGoerli Testnet Deployment");
            console.log("Perfect for testing with testnet tokens");
        } else if (block.chainid == 11155111) {
            console.log("\nSepolia Testnet Deployment");
            console.log("Perfect for testing with testnet tokens");
        }
    }

    /**
     * @notice Helper function to verify deployment
     * @dev Can be called after deployment to verify contract state
     */
    function verifyDeployment(address executorAddress) external view {
        Executor executor = Executor(payable(executorAddress));

        console.log("Verifying deployment at:", executorAddress);

        // Check basic properties
        require(executor.owner() != address(0), "Owner not set");

        console.log("Deployment verification passed");
        console.log("Owner:", executor.owner());
    }
}

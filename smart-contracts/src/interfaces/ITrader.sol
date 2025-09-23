// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ExecutorValidation} from "../libraries/ExecutorValidation.sol";

interface ITrader {
    /**
     * @notice Execute a trade using DEX-specific logic
     * @param signedOrder The limit order containing trade parameters
     * @param routeData Route-specific data (path, fees, etc.)
     * @return amountOut The actual amount of output tokens received
     */
    function trade(ExecutorValidation.SignedOrder calldata signedOrder, ExecutorValidation.RouteData calldata routeData) external returns (uint256 amountOut);

    /**
     * @notice Get the address of the contract this trader uses trade (Router, Exchange, Swapper)
     * @return The address for approvals and calls
     */
    function getTraderAddress() external view returns (address);

    /**
     * @notice A function to recover funds that are stuck in the contract
     * @param token The token to recover
     * @param to The recipient of the token
     */
    function emergencyRecover(address token, address to) external;
}

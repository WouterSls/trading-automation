// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ExecutorValidation} from "../libraries/ExecutorValidation.sol";
import {ITrader} from "../interfaces/ITrader.sol";
import {SafeERC20} from "../../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "../../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IUniswapV3Router} from "../interfaces/IUniswapV3Router.sol";

/**
 * @title UniswapV3Trader
 * @notice Handles trades through Uniswap V3 with proper token management
 * @dev This contract receives tokens from Executor, trades via Uniswap, sends output to user
 */
contract UniswapV3Trader is ITrader {
    using SafeERC20 for IERC20;

    address private constant UNIV3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    
    address public immutable EXECUTOR;
    
    error OnlyExecutor();
    error InsufficientBalance();
    error TradeReverted();

    constructor(address _executor) {
        EXECUTOR = _executor;
    }

    modifier onlyExecutor() {
        if (msg.sender != EXECUTOR) revert OnlyExecutor();
        _;
    }

    /**
     * @notice Execute a token swap via Uniswap V3
     * @param order The limit order containing swap parameters
     * @param routeData Route configuration for single-hop or multi-hop swaps
     * @return amountOut The amount of output tokens received
     */
    function trade(
        ExecutorValidation.LimitOrder calldata order,
        ExecutorValidation.RouteData calldata routeData
    ) external override onlyExecutor returns (uint256 amountOut) {
        uint256 balance = IERC20(order.inputToken).balanceOf(address(this));
        if (balance < order.inputAmount) revert InsufficientBalance();
    
        IERC20(order.inputToken).forceApprove(UNIV3_ROUTER, order.inputAmount);
    
        if (routeData.isMultiHop) {
            amountOut = _executeMultiHopSwap(order, routeData);
        } else {
            amountOut = _executeSingleHopSwap(order, routeData);
        }
    
        IERC20(order.inputToken).forceApprove(UNIV3_ROUTER, 0);
    }
    
    function _executeMultiHopSwap(
        ExecutorValidation.LimitOrder calldata order,
        ExecutorValidation.RouteData calldata routeData
    ) private returns (uint256) {
        IUniswapV3Router.ExactInputParams memory params = IUniswapV3Router.ExactInputParams({
            path: routeData.encodedPath,
            recipient: order.maker,
            deadline: order.expiry,
            amountIn: order.inputAmount,
            amountOutMinimum: order.minAmountOut
        });
        return IUniswapV3Router(UNIV3_ROUTER).exactInput(params);
    }
    
    function _executeSingleHopSwap(
        ExecutorValidation.LimitOrder calldata order,
        ExecutorValidation.RouteData calldata routeData
    ) private returns (uint256) {
        IUniswapV3Router.ExactInputSingleParams memory params = IUniswapV3Router.ExactInputSingleParams({
            tokenIn: order.inputToken,
            tokenOut: order.outputToken,
            fee: routeData.fee,
            recipient: order.maker,
            deadline: order.expiry,
            amountIn: order.inputAmount,
            amountOutMinimum: order.minAmountOut,
            sqrtPriceLimitX96: 0
        });
        return IUniswapV3Router(UNIV3_ROUTER).exactInputSingle(params);
    }

    function getTraderAddress() external pure override returns (address) {
        return UNIV3_ROUTER;
    }

    function emergencyRecover(address token, address to) external override onlyExecutor {
        IERC20(token).safeTransfer(to, IERC20(token).balanceOf(address(this)));
    }
}

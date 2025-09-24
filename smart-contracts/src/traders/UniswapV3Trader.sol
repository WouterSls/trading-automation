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
     * @param params Route configuration for single-hop or multi-hop swaps
     * @return amountOut The amount of output tokens received
     */
    function trade(
        TradeParameters calldata params
    ) external override onlyExecutor returns (uint256 amountOut) {
        uint256 balance = IERC20(params.inputToken).balanceOf(address(this));
        if (balance < params.inputAmount) revert InsufficientBalance();
    
        IERC20(params.inputToken).forceApprove(UNIV3_ROUTER, params.inputAmount);
    
        if (params.routeData.isMultiHop) {
            amountOut = _executeMultiHopSwap(params, params.routeData);
        } else {
            amountOut = _executeSingleHopSwap(params, params.routeData);
        }
    
        IERC20(params.inputToken).forceApprove(UNIV3_ROUTER, 0);
    }
    
    function _executeMultiHopSwap(
        TradeParameters calldata _params,
        ExecutorValidation.RouteData calldata routeData
    ) private returns (uint256) {
        IUniswapV3Router.ExactInputParams memory params = IUniswapV3Router.ExactInputParams({
            path: routeData.encodedPath,
            recipient: EXECUTOR, // to maker for gas optimization?
            //deadline: params.expiry,
            deadline: block.timestamp + 1,
            amountIn: _params.inputAmount,
            amountOutMinimum: 0
        });
        return IUniswapV3Router(UNIV3_ROUTER).exactInput(params);
    }
    
    function _executeSingleHopSwap(
        TradeParameters calldata _params,
        ExecutorValidation.RouteData calldata routeData
    ) private returns (uint256) {
        IUniswapV3Router.ExactInputSingleParams memory params = IUniswapV3Router.ExactInputSingleParams({
            tokenIn: _params.inputToken,
            tokenOut: _params.outputToken,
            fee: routeData.fee,
            recipient: EXECUTOR, //maker for gas optimization?
            //deadline: order.expiry,
            deadline: block.timestamp + 1,
            amountIn: _params.inputAmount,
            //amountOutMinimum: order.minAmountOut,
            amountOutMinimum: 0,
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

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ExecutorValidation} from "../libraries/ExecutorValidation.sol";
import {ITrader} from "../interfaces/ITrader.sol";

import {EIP712} from "../../lib/openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";
import {SafeERC20} from "../../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "../../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IPermit2} from "../interfaces/IPermit2.sol";
import {IUniswapV3Router} from "../interfaces/IUniswapV3Router.sol";
import {ITrader} from "../interfaces/ITrader.sol";

import {ExecutorValidation} from "../libraries/ExecutorValidation.sol";

contract UniswapV3Trader is ITrader {
    using SafeERC20 for IERC20;

    address private constant UNIV3_ROUTER = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    function trade(ExecutorValidation.LimitOrder calldata order) external override returns (uint256 amountOut) {
        ExecutorValidation.RouteData memory tempRoute =
            ExecutorValidation.RouteData({encodedPath: bytes("0X0009809809"), fee: 3000, isMultiHop: false});

        return _executeUniswapV3Trade(order, tempRoute);
    }

    function _executeUniswapV3Trade(
        ExecutorValidation.LimitOrder calldata order,
        //ExecutorValidation.RouteData calldata routeData
        ExecutorValidation.RouteData memory routeData
    ) internal returns (uint256 amountOut) {
        IERC20(order.inputToken).approve(UNIV3_ROUTER, order.inputAmount);

        if (routeData.isMultiHop) {
            IUniswapV3Router.ExactInputParams memory params = IUniswapV3Router.ExactInputParams({
                path: routeData.encodedPath,
                recipient: order.maker,
                deadline: order.expiry,
                amountIn: order.inputAmount,
                amountOutMinimum: order.minAmountOut
            });

            amountOut = IUniswapV3Router(UNIV3_ROUTER).exactInput(params);
        } else {
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

            amountOut = IUniswapV3Router(UNIV3_ROUTER).exactInputSingle(params);
        }

        // Reset approval for security
        IERC20(order.inputToken).approve(UNIV3_ROUTER, 0);
    }
}

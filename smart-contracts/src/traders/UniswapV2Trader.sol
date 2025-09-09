// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ExecutorValidation} from "../libraries/ExecutorValidation.sol";
import {ITrader} from "../interfaces/ITrader.sol";

abstract contract UniswapV3Trader is ITrader {
    function trade(ExecutorValidation.LimitOrder calldata order) external override returns (uint256 amountOut) {
        return 0;
    }

    function _executeUniswapV2Trade() internal returns (uint256 amountOut) {}
}

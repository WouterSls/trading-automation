// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ExecutorValidation} from "../libraries/ExecutorValidation.sol";
import {ITrader} from "../interfaces/ITrader.sol";
import {Types} from "../libraries/Types.sol";

abstract contract UniswapV2Trader is ITrader {
    error IncorrectProtocol();
    function trade(ExecutorValidation.LimitOrder calldata order) external pure override returns (uint256 amountOut) {
        ExecutorValidation.validateProtocol(order, Types.Protocol.UNISWAP_V2);
        if (order.protocol != Types.Protocol.UNISWAP_V2) revert IncorrectProtocol();
        return 0;
    }

    function _executeUniswapV2Trade() internal returns (uint256 amountOut) {}
}

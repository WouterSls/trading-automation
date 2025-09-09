// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ExecutorValidation} from "../libraries/ExecutorValidation.sol";

interface ITrader {
    function trade(ExecutorValidation.LimitOrder calldata order) external returns (uint256 amountOut);
}

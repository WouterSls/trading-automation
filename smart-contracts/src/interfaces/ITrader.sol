// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ExecutorValidation} from "../libraries/ExecutorValidation.sol";

interface ITrader {
    function trade(ExecutorValidation.LimitOrder calldata order) external returns (uint256 amountOut);
}

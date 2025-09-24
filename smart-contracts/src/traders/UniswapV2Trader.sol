// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ExecutorValidation} from "../libraries/ExecutorValidation.sol";
import {ITrader} from "../interfaces/ITrader.sol";
import {SafeERC20} from "../../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "../../lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol";

abstract contract UniswapV2Trader is ITrader {
    using SafeERC20 for IERC20;

    address private constant UNIV2_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    
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
    
        IERC20(params.inputToken).forceApprove(UNIV2_ROUTER, params.inputAmount);

        if (params.routeData.isMultiHop) {

        }
    
        //amountOut = IUniswapV2Router(UNIV2_ROUTER).swapExactETHForTokens();

        amountOut = 0;
    
        IERC20(params.inputToken).forceApprove(UNIV2_ROUTER, 0);

    }
    
    function getTraderAddress() external pure override returns (address) {
        return UNIV2_ROUTER;
    }

    function emergencyRecover(address token, address to) external override onlyExecutor {
        IERC20(token).safeTransfer(to, IERC20(token).balanceOf(address(this)));
    }
}

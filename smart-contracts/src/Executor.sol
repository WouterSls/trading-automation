// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {EIP712} from "../lib/openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";
import {SafeERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IPermit2} from "./interfaces/IPermit2.sol";
import {IUniswapV3Router} from "./interfaces/IUniswapV3Router.sol";

// Import validation libraries
import {ExecutorValidation} from "./libraries/ExecutorValidation.sol";

/**
 * @title Executor
 * @notice Executes signed off-chain orders with validation libraries
 * @dev Clean separation of concerns with modular validation
 */
contract Executor is EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;

    string private constant NAME = "Executor";
    string private constant VERSION = "1";

    // UniswapV3 SwapRouter02 address (same across chains)
    address private constant UNIV3_ROUTER = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;
    // Permit2 contract address (same across chains)
    address private constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    address public owner;
    mapping(address => bool) public allowedRouter;
    mapping(address => mapping(uint256 => bool)) public usedNonce;

    // Re-export library errors for ABI
    error OrderExpired();
    error RouterNotAllowed();
    error NonceAlreadyUsed();
    error InvalidSignature();
    error CallFailed();
    error InvalidRouter();
    error InsufficientOutput();
    error ZeroAddress();
    error ZeroAmount();
    error InvalidArrayLength();
    error InvalidRouteData();
    error TokenMismatch();
    error InvalidFee();
    error InvalidPath();
    error PermitExpired();
    error InvalidPermitSignature();
    error PermitAmountMismatch();

    event RouterAllowed(address indexed router, bool allowed);
    event OrderExecuted(address indexed maker, address indexed router, uint256 amountIn, uint256 amountOut);

    constructor() EIP712(NAME, VERSION) {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    /**
     * @notice Execute a signed off-chain order using modular validation
     * @param order The signed order fields
     * @param routeData Route information for trade execution
     * @param orderSignature EIP-712 signature by order.maker
     * @param permit2Data Permit2 authorization data
     * @param permit2Signature EIP-712 signature for Permit2
     */
    function executeOrder(
        ExecutorValidation.LimitOrder calldata order,
        ExecutorValidation.RouteData calldata routeData,
        bytes calldata orderSignature,
        ExecutorValidation.PermitSingle calldata permit2Data,
        bytes calldata permit2Signature
    ) external nonReentrant {
        // Use validation libraries
        ExecutorValidation.validateInputs(order, routeData, permit2Data);
        ExecutorValidation.validateBusinessLogic(order, usedNonce, allowedRouter);
        ExecutorValidation.validateOrderSignature(order, orderSignature, _domainSeparatorV4());
        ExecutorValidation.validatePermit2Signature(permit2Data, permit2Signature);
        ExecutorValidation.validateRouteData(routeData);

        // Mark nonce as used BEFORE external calls
        usedNonce[order.maker][order.nonce] = true;

        // Execute Permit2 transfer
        _executePermit2Transfer(order, permit2Data, permit2Signature);

        // Execute the trade
        uint256 amountOut = _executeUniswapV3Trade(order, routeData);

        // Verify minimum output
        if (amountOut < order.minAmountOut) revert InsufficientOutput();

        emit OrderExecuted(order.maker, UNIV3_ROUTER, order.inputAmount, amountOut);
    }

    // ========================================
    // ADMIN FUNCTIONS
    // ========================================

    function setAllowedRouter(address router, bool allowed) external onlyOwner {
        allowedRouter[router] = allowed;
        emit RouterAllowed(router, allowed);
    }

    function cancelNonce(uint256 nonce) external {
        usedNonce[msg.sender][nonce] = true;
    }

    function emergencyWithdrawToken(address token, address to) external onlyOwner {
        if (token == address(0)) {
            uint256 bal = address(this).balance;
            (bool sent,) = to.call{value: bal}("");
            require(sent, "withdraw ETH failed");
        } else {
            IERC20(token).safeTransfer(to, IERC20(token).balanceOf(address(this)));
        }
    }

    // ========================================
    // INTERNAL FUNCTIONS
    // ========================================

    function _executePermit2Transfer(
        ExecutorValidation.LimitOrder calldata order,
        ExecutorValidation.PermitSingle calldata permit2Data,
        bytes calldata permit2Signature
    ) internal {
        IPermit2.PermitSingle memory permit2Transfer = IPermit2.PermitSingle({
            details: IPermit2.PermitDetails({token: permit2Data.details.token, amount: permit2Data.details.amount}),
            spender: permit2Data.spender,
            sigDeadline: permit2Data.sigDeadline,
            nonce: permit2Data.nonce
        });

        IPermit2(PERMIT2).permitTransferFrom(
            permit2Transfer,
            IPermit2.SignatureTransferDetails({to: address(this), requestedAmount: order.inputAmount}),
            order.maker,
            permit2Signature
        );
    }

    function _executeUniswapV3Trade(
        ExecutorValidation.LimitOrder calldata order,
        ExecutorValidation.RouteData calldata routeData
    ) internal returns (uint256 amountOut) {
        if (!allowedRouter[UNIV3_ROUTER]) revert InvalidRouter();

        // Approve router to spend tokens
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

    receive() external payable {}
}

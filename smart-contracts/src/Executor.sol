// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {EIP712} from "../lib/openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";
import {SafeERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IPermit2} from "./interfaces/IPermit2.sol";
import {ITrader} from "./interfaces/ITrader.sol";
import {ITraderRegistry} from "./interfaces/ITraderRegistry.sol";

import {ExecutorValidation} from "./libraries/ExecutorValidation.sol";

/**
 * @title Executor
 * @notice Executes signed off-chain orders with validation libraries
 * @dev Clean separation of concerns with modular validation
 */
contract Executor is EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;

    string private constant NAME = "EVM Trading Engine";
    string private constant VERSION = "1";

    address private constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    address public owner;
    ITraderRegistry public traderRegistry;

    mapping(address => mapping(uint256 => bool)) public usedNonce;

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

    event TraderRegistryUpdated(address indexed newRegistry, address indexed updater);
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
        ExecutorValidation.PermitSingle calldata permit2Data,
        bytes calldata permit2Signature,
        ExecutorValidation.LimitOrder calldata order,
        bytes calldata orderSignature,
        ExecutorValidation.RouteData calldata routeData
    ) external nonReentrant {
        ExecutorValidation.validateInputs(order, routeData, permit2Data);
        ExecutorValidation.validateBusinessLogic(order, usedNonce);

        ExecutorValidation.validateOrderSignature(order, orderSignature, _domainSeparatorV4());
        ExecutorValidation.validatePermit2Signature(permit2Data, permit2Signature);
        ExecutorValidation.validateRouteData(routeData);

        usedNonce[order.maker][order.nonce] = true;

        _executePermit2Transfer(order, permit2Data, permit2Signature);

        address trader = traderRegistry.getTrader(order.protocol);

        IERC20(order.inputToken).safeTransfer(trader, order.inputAmount);

        uint256 amountOut = ITrader(trader).trade(order, routeData);

        if (amountOut < order.minAmountOut) revert InsufficientOutput();

        emit OrderExecuted(order.maker, trader, order.inputAmount, amountOut);
    }

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

    function cancelNonce(uint256 nonce) external {
        usedNonce[msg.sender][nonce] = true;
    }

    function updateTraderRegistry(address newRegistry) external onlyOwner {
        traderRegistry = ITraderRegistry(newRegistry);
        address updater = msg.sender;
        emit TraderRegistryUpdated(newRegistry, updater);
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

    receive() external payable {}
}

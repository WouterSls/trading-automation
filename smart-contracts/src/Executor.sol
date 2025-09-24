// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {EIP712} from "../lib/openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";
import {SafeERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {ISignatureTransfer} from "../lib/permit2/src/interfaces/ISignatureTransfer.sol";
import {ITrader} from "./interfaces/ITrader.sol";
import {ITraderRegistry} from "./interfaces/ITraderRegistry.sol";

// USER EIP712Verifier.sol in contracts/mocks

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

    error InvalidTrader();
    error CallFailed();
    error InvalidRouter();
    error InsufficientOutput();

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
     * @param signedPermitData EIP-712 signature for Permit2
     * @param signedOrder EIP-712 signature by order.maker
     * @param routeData Route information for trade execution
     */
    function executeOrder(
        ExecutorValidation.SignedPermitData calldata signedPermitData,
        ExecutorValidation.SignedOrder calldata signedOrder,
        ExecutorValidation.RouteData calldata routeData
    ) external nonReentrant {
        ExecutorValidation.validateInputsAndBusinessLogic(signedOrder, routeData, signedPermitData, usedNonce);
        ExecutorValidation.validateSignatures(signedOrder, signedPermitData, _domainSeparatorV4());

        usedNonce[signedOrder.maker][signedOrder.nonce] = true;


        ISignatureTransfer.PermitTransferFrom memory permit = ISignatureTransfer.PermitTransferFrom({
            permitted: ISignatureTransfer.TokenPermissions({
                token: signedPermitData.permit.permitted.token,
                amount: signedPermitData.permit.permitted.amount
            }),
            nonce: signedPermitData.permit.nonce,
            deadline: signedPermitData.permit.deadline
        });

        address trader = traderRegistry.getTrader(routeData.protocol);
        if (trader != signedPermitData.transferDetails.to) revert InvalidTrader(); 

        //Transfer to trader directly to save gas
        ISignatureTransfer.SignatureTransferDetails memory transferDetails  = ISignatureTransfer.SignatureTransferDetails({
            to: signedPermitData.transferDetails.to,
            requestedAmount: signedPermitData.transferDetails.requestedAmount
        });
        ISignatureTransfer(PERMIT2).permitTransferFrom(
            permit,
            transferDetails,
            signedPermitData.owner, // should be identical as order.maker
            signedPermitData.signature 
        );
        //IERC20(signedOrder.inputToken).safeTransfer(trader, signedOrder.inputAmount);

        ITrader.TradeParameters memory tradeParameters = ITrader.TradeParameters({
            inputToken: signedOrder.inputToken,
            inputAmount: signedOrder.inputAmount,
            outputToken: signedOrder.outputToken,
            routeData: routeData
        });
        //uint256 amountOut = ITrader(trader).trade(tradeParameters);

        //if (amountOut < signedOrder.minAmountOut) revert InsufficientOutput();

        //emit OrderExecuted(signedOrder.maker, trader, signedOrder.inputAmount, amountOut);
    }

    function _executePermit2Transfer(
        ExecutorValidation.SignedOrder calldata order,
        ExecutorValidation.SignedPermitData calldata signedPermitData,
        bytes calldata permit2Signature
    ) internal {

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

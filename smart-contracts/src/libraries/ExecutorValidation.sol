// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ECDSA} from "../../lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import {Types} from "./Types.sol";

library ExecutorValidation {
    using ECDSA for bytes32;

    error ZeroAddress();
    error ZeroAmount();
    error InvalidArrayLength();
    error TokenMismatch();
    error PermitAmountMismatch();
    error InvalidFee();
    error InvalidPath();
    error OrderExpired();
    error NonceAlreadyUsed();
    error RouterNotAllowed();
    error InvalidSignature();
    error PermitExpired();
    error InvalidPermitSignature();
    error IncorrectProtocol(Types.Protocol expected, Types.Protocol actual);

    struct LimitOrder {
        address maker;
        address inputToken;
        address outputToken;
        Types.Protocol protocol;
        uint256 inputAmount;
        uint256 minAmountOut;
        uint256 maxSlippageBps;
        uint256 expiry;
        uint256 nonce;
    }

    struct RouteData {
        bytes encodedPath;
        uint24 fee;
        bool isMultiHop;
    }

    struct PermitDetails {
        address token;
        uint256 amount;
    }

    struct PermitSingle {
        PermitDetails details;
        address spender;
        uint256 sigDeadline;
        uint256 nonce;
    }

    bytes32 internal constant LIMIT_ORDER_TYPEHASH = keccak256(
        "LimitOrder(address maker,address inputToken,address outputToken,uint8 protocol,uint256 inputAmount,uint256 minAmountOut,uint256 maxSlippageBps,uint256 expiry,uint256 nonce)"
    );

    function validateInputs(LimitOrder calldata order, RouteData calldata routeData, PermitSingle calldata permit2Data)
        internal
        pure
    {
        _validateAddresses(order, permit2Data);
        _validateAmounts(order, permit2Data);
        _validateConsistency(order, permit2Data);
        _validateRouteStructure(routeData);
    }

    function validateBusinessLogic(
        LimitOrder calldata order,
        mapping(address => mapping(uint256 => bool)) storage usedNonces
    ) internal view {
        _validateExpiry(order);
        _validateNonce(order, usedNonces);
    }

    function validateProtocol(LimitOrder calldata order, Types.Protocol expectedProtocol) internal pure {
        if (order.protocol != expectedProtocol) {
            revert IncorrectProtocol(expectedProtocol, order.protocol);
        }
    }

    function validateOrderSignature(LimitOrder calldata order, bytes calldata signature, bytes32 domainSeparator)
        internal
        pure
    {
        bytes32 orderHash = keccak256(
            abi.encode(
                LIMIT_ORDER_TYPEHASH,
                order.maker,
                order.inputToken,
                order.outputToken,
                order.protocol,
                order.inputAmount,
                order.minAmountOut,
                order.maxSlippageBps,
                order.expiry,
                order.nonce
            )
        );

        bytes32 orderDigest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, orderHash));

        address recoveredSigner = orderDigest.recover(signature);
        if (recoveredSigner != order.maker) revert InvalidSignature();
    }

    function validatePermit2Signature(PermitSingle calldata permit2Data, bytes calldata signature) internal view {
        if (block.timestamp > permit2Data.sigDeadline) revert PermitExpired();
        if (signature.length == 0) revert InvalidPermitSignature();

        // Note: Full signature validation delegated to Permit2 contract
        // for gas efficiency and to avoid duplicate validation
    }

    function validateRouteData(RouteData calldata routeData) internal pure {
        if (routeData.isMultiHop) {
            if (routeData.encodedPath.length < 43) revert InvalidPath();
        } else {
            if (routeData.fee != 100 && routeData.fee != 500 && routeData.fee != 3000 && routeData.fee != 10000) {
                revert InvalidFee();
            }
        }
    }

    function _validateAddresses(LimitOrder calldata order, PermitSingle calldata permit2Data) private pure {
        if (order.maker == address(0)) revert ZeroAddress();
        if (order.inputToken == address(0)) revert ZeroAddress();
        if (order.outputToken == address(0)) revert ZeroAddress();
        if (permit2Data.details.token == address(0)) revert ZeroAddress();
        if (permit2Data.spender == address(0)) revert ZeroAddress();
    }

    function _validateAmounts(LimitOrder calldata order, PermitSingle calldata permit2Data) private pure {
        if (order.inputAmount == 0) revert ZeroAmount();
        if (order.minAmountOut == 0) revert ZeroAmount();
        if (permit2Data.details.amount == 0) revert ZeroAmount();
    }

    function _validateConsistency(LimitOrder calldata order, PermitSingle calldata permit2Data) private pure {
        if (order.inputToken != permit2Data.details.token) revert TokenMismatch();
        if (order.inputAmount != permit2Data.details.amount) revert PermitAmountMismatch();
    }

    function _validateRouteStructure(RouteData calldata routeData) private pure {
        if (routeData.isMultiHop && routeData.encodedPath.length == 0) revert InvalidPath();
        if (!routeData.isMultiHop && routeData.fee == 0) revert InvalidFee();
    }

    function _validateExpiry(LimitOrder calldata order) private view {
        if (block.timestamp > order.expiry) revert OrderExpired();
    }

    function _validateNonce(LimitOrder calldata order, mapping(address => mapping(uint256 => bool)) storage usedNonces)
        private
        view
    {
        if (usedNonces[order.maker][order.nonce]) revert NonceAlreadyUsed();
    }
}

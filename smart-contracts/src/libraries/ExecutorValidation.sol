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
    error InvalidProtocol();
    error ProtocolMismatch();

    struct Order {
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

    bytes32 internal constant ORDER_TYPEHASH = keccak256(
        "Order(address maker,address inputToken,address outputToken,uint8 protocol,uint256 inputAmount,uint256 minAmountOut,uint256 maxSlippageBps,uint256 expiry,uint256 nonce)"
    );

    function validateInputsAndBusinessLogic(
        Order calldata order,
        RouteData calldata routeData,
        PermitSingle calldata permit2Data,
        mapping(address => mapping(uint256 => bool)) storage usedNonces
    ) internal view {
        // Address validations
        if (order.maker == address(0)) revert ZeroAddress();
        if (order.inputToken == address(0)) revert ZeroAddress();
        if (order.outputToken == address(0)) revert ZeroAddress();
        if (permit2Data.details.token == address(0)) revert ZeroAddress();
        if (permit2Data.spender == address(0)) revert ZeroAddress();
        
        // Amount validations
        if (order.inputAmount == 0) revert ZeroAmount();
        if (order.minAmountOut == 0) revert ZeroAmount();
        if (permit2Data.details.amount == 0) revert ZeroAmount();
        
        // Consistency checks
        if (order.inputToken != permit2Data.details.token) revert TokenMismatch();
        if (order.inputAmount != permit2Data.details.amount) revert PermitAmountMismatch();

        // Protocol validation - check if protocol is valid
        if (uint8(order.protocol) > uint8(Types.Protocol.QUICKSWAP)) {
            revert InvalidProtocol();
        }
        
        // Route structure validation
        if (routeData.isMultiHop && routeData.encodedPath.length == 0) revert InvalidPath();
        if (!routeData.isMultiHop && routeData.fee == 0) revert InvalidFee();
        
        // Route data validation
        if (routeData.isMultiHop) {
            if (routeData.encodedPath.length < 43) revert InvalidPath();
        } else {
            if (routeData.fee != 100 && routeData.fee != 500 && routeData.fee != 3000 && routeData.fee != 10000) {
                revert InvalidFee();
            }
        }
        
        // Business logic validations
        if (block.timestamp > order.expiry) revert OrderExpired();
        if (usedNonces[order.maker][order.nonce]) revert NonceAlreadyUsed();
    }

    function validateSignatures(
        Order calldata order,
        PermitSingle calldata permit2Data,
        bytes calldata orderSignature,
        bytes calldata permit2Signature,
        bytes32 domainSeparator
    ) internal view {
        // Permit2 signature validation first (simpler)
        if (block.timestamp > permit2Data.sigDeadline) revert PermitExpired();
        if (permit2Signature.length == 0) revert InvalidPermitSignature();
        
        // Order signature validation using helper function
        if (_generateOrderDigest(order, domainSeparator).recover(orderSignature) != order.maker) {
            revert InvalidSignature();
        }
        
        // Note: Full permit2 signature validation delegated to Permit2 contract
        // for gas efficiency and to avoid duplicate validation
    }

    function validateProtocol(Order calldata order, Types.Protocol expectedProtocol) internal pure {
        if (order.protocol != expectedProtocol) {
            revert ProtocolMismatch();
        }
    }

    /// @notice Helper function to generate order hash without local variable overload
    /// @dev Reduces stack depth in signature validation
    function _generateOrderDigest(
        Order calldata order,
        bytes32 domainSeparator
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            "\x19\x01", 
            domainSeparator, 
            keccak256(abi.encode(
                ORDER_TYPEHASH,
                order.maker,
                order.inputToken,
                order.outputToken,
                order.protocol,
                order.inputAmount,
                order.minAmountOut,
                order.maxSlippageBps,
                order.expiry,
                order.nonce
            ))
        ));
    }
}

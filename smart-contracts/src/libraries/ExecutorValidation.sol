// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ECDSA} from "../../lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import {Types} from "./Types.sol";
import {ISignatureTransfer} from "../../lib/permit2/src/interfaces/ISignatureTransfer.sol";
import {IAllowanceTransfer} from "../../lib/permit2/src/interfaces/IAllowanceTransfer.sol";

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

    struct SignedOrder {
        address maker;
        address inputToken;
        address outputToken;
        Types.Protocol protocol;
        uint256 inputAmount;
        uint256 minAmountOut;
        uint256 maxSlippageBps;
        uint256 expiry;
        uint256 nonce;
        bytes signature;
    }

    struct RouteData {
        bytes encodedPath;
        uint24 fee;
        bool isMultiHop;
    }

    // Single signature transfer permit2 interaction
    struct SignedPermitData {
        ISignatureTransfer.PermitTransferFrom permit; // -> TypeData 
        ISignatureTransfer.SignatureTransferDetails transferDetails; // -> details
        address owner; // -> signature validation = act in account of
        bytes signature; // -> signature to verify operation
    }

    // Allowance based permit2 interaction
    struct SignedPermitAllowanceData {
        IAllowanceTransfer.PermitSingle permitSingle;
        address owner;
        bytes signature;
    }


    bytes32 internal constant ORDER_TYPEHASH = keccak256(
        "Order(address maker,address inputToken,address outputToken,uint8 protocol,uint256 inputAmount,uint256 minAmountOut,uint256 maxSlippageBps,uint256 expiry,uint256 nonce)"
    );

    function validateInputsAndBusinessLogic(
        SignedOrder calldata signedOrder,
        RouteData calldata routeData,
        SignedPermitData calldata signedPermitData,
        mapping(address => mapping(uint256 => bool)) storage usedNonces
    ) internal view {
        // Address validations
        if (signedOrder.maker == address(0)) revert ZeroAddress();
        if (signedOrder.inputToken == address(0)) revert ZeroAddress();
        if (signedOrder.outputToken == address(0)) revert ZeroAddress();
        if (signedPermitData.permit.permitted.token == address(0)) revert ZeroAddress();
        
        // Amount validations
        if (signedOrder.inputAmount == 0) revert ZeroAmount();
        if (signedOrder.minAmountOut == 0) revert ZeroAmount();
        if (signedPermitData.permit.permitted.amount == 0) revert ZeroAmount();
        if (signedPermitData.transferDetails.requestedAmount == 0) revert ZeroAmount();
        
        // Consistency checks
        if (signedOrder.inputToken != signedPermitData.permit.permitted.token) revert TokenMismatch();
        if (signedOrder.inputAmount != signedPermitData.transferDetails.requestedAmount) revert PermitAmountMismatch();
        if (signedPermitData.transferDetails.requestedAmount > signedPermitData.permit.permitted.amount) revert PermitAmountMismatch();

        // Protocol validation - check if protocol is valid
        if (uint8(signedOrder.protocol) > uint8(Types.Protocol.QUICKSWAP)) {
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
        if (block.timestamp > signedOrder.expiry) revert OrderExpired();
        if (usedNonces[signedOrder.maker][signedOrder.nonce]) revert NonceAlreadyUsed();
    }

    function validateSignatures(
        SignedOrder calldata signedOrder,
        SignedPermitData calldata signedPermitData,
        bytes32 domainSeparator
    ) internal view {
        // Permit2 signature validation first (simpler)
        if (block.timestamp > signedPermitData.permit.deadline) revert PermitExpired();
        
        // Order signature validation using helper function
        if (_generateOrderDigest(signedOrder, domainSeparator).recover(signedOrder.signature) != signedOrder.maker) {
            revert InvalidSignature();
        }
        
        // Note: Full permit2 signature validation delegated to Permit2 contract
        // for gas efficiency and to avoid duplicate validation
    }

    /// @notice Helper function to generate order hash without local variable overload
    /// @dev Reduces stack depth in signature validation
    function _generateOrderDigest(
        SignedOrder calldata order,
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

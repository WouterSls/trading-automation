// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPermit2 {
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

    struct SignatureTransferDetails {
        address to;
        uint256 requestedAmount;
    }

    function permitTransferFrom(
        PermitSingle calldata permit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes calldata signature
    ) external;
}

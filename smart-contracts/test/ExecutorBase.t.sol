// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {Executor} from "../src/Executor.sol";
import {ExecutorValidation} from "../src/libraries/ExecutorValidation.sol";
import {Types} from "../src/libraries/Types.sol";

contract ExecutorBase is Test {
    Executor public executor;

    // Mock contract addresses (we'll use vm.mockCall for these)
    address public constant UNIV3_ROUTER = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;
    address public constant UNIV3_TRADER = 0x00000000000072a70ecDf485e0E4C7bD8665fc45;
    address public constant TRADER_REGISTRY = address(0);
    address public constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    // Test tokens
    address public tokenA;
    address public tokenB;
    address public tokenC;

    // Test accounts
    address public deployer;
    address public user;
    address public unauthorizedUser;

    // Private keys for signing (test keys only)
    uint256 public constant DEPLOYER_PRIVATE_KEY = 0x1234;
    uint256 public constant USER_PRIVATE_KEY = 0x5678;

    function setUp() public virtual {
        console.log("Setting up ExecutorBase test environment...");

        deployer = vm.addr(DEPLOYER_PRIVATE_KEY);
        user = vm.addr(USER_PRIVATE_KEY);

        unauthorizedUser = makeAddr("unauthorized");

        vm.prank(deployer);
        executor = new Executor();

        console.log("ExecutorBase setup complete");
    }

    function test_InputValidation_ZeroAddresses() public {
        console.log("Testing zero address validations...");

        (ExecutorValidation.PermitSingle memory permit2Data, bytes memory permit2Signature) = _createValidPermit2();
        (ExecutorValidation.LimitOrder memory order, bytes memory orderSignature) = _createValidOrderInput();
        ExecutorValidation.RouteData memory routeData =
            ExecutorValidation.RouteData({encodedPath: "", fee: 3000, isMultiHop: false});

        // Test zero maker address
        order.maker = address(0);
        vm.expectRevert(Executor.ZeroAddress.selector);
        executor.executeOrder(permit2Data, permit2Signature, order, orderSignature, routeData);

        // Reset and test zero input token
        (order,) = _createValidOrderInput();
        order.inputToken = address(0);
        vm.expectRevert(Executor.ZeroAddress.selector);
        executor.executeOrder(permit2Data, permit2Signature, order, orderSignature, routeData);

        // Reset and test zero output token
        (order,) = _createValidOrderInput();
        order.outputToken = address(0);
        vm.expectRevert(Executor.ZeroAddress.selector);
        executor.executeOrder(permit2Data, permit2Signature, order, orderSignature, routeData);

        console.log("Zero address validation tests passed");
    }

    function test_InputValidation_ZeroAmounts() public {
        console.log("Testing zero amount validations...");

        (ExecutorValidation.LimitOrder memory order, bytes memory orderSignature) = _createValidOrderInput();
        ExecutorValidation.RouteData memory routeData =
            ExecutorValidation.RouteData({encodedPath: "", fee: 3000, isMultiHop: false});
        (ExecutorValidation.PermitSingle memory permit2Data, bytes memory permit2Signature) = _createValidPermit2();

        // Test zero input amount
        order.inputAmount = 0;
        permit2Data.details.amount = 0; // Keep consistent
        vm.expectRevert(Executor.ZeroAmount.selector);
        executor.executeOrder(permit2Data, permit2Signature, order, orderSignature, routeData);

        // Reset and test zero min amount out
        (order,) = _createValidOrderInput();
        (permit2Data,) = _createValidPermit2();
        order.minAmountOut = 0;
        vm.expectRevert(Executor.ZeroAmount.selector);
        executor.executeOrder(permit2Data, permit2Signature, order, orderSignature, routeData);

        console.log("Zero amount validation tests passed");
    }

    function test_InputValidation_TokenMismatch() public {
        console.log("Testing token mismatch validation...");

        (ExecutorValidation.LimitOrder memory order, bytes memory orderSignature) = _createValidOrderInput();
        ExecutorValidation.RouteData memory routeData =
            ExecutorValidation.RouteData({encodedPath: "", fee: 3000, isMultiHop: false});
        (ExecutorValidation.PermitSingle memory permit2Data, bytes memory permit2Signature) = _createValidPermit2();

        // Make tokens mismatch
        permit2Data.details.token = tokenB; // Order uses tokenA, permit2 uses tokenB

        vm.expectRevert(Executor.TokenMismatch.selector);
        executor.executeOrder(permit2Data, permit2Signature, order, orderSignature, routeData);

        console.log("Token mismatch validation test passed");
    }

    // ========================================
    // HELPER FUNCTIONS
    // ========================================

    function _createValidOrderInput() internal
        view
        returns (ExecutorValidation.LimitOrder memory order, bytes memory orderSignature)
    {
        order = ExecutorValidation.LimitOrder({
            maker: user,
            inputToken: tokenA,
            outputToken: tokenB,
            inputAmount: 1000e18,
            protocol: Types.Protocol.UNISWAP_V2,
            minAmountOut: 900e18,
            maxSlippageBps: 1000,
            expiry: block.timestamp,
            nonce: 1
        });

        // Empty signature for basic tests (signature validation tested separately)
        orderSignature = "";
    }

    function _createValidPermit2()
        internal
        view
        returns (ExecutorValidation.PermitSingle memory permit2, bytes memory permit2Signature)
    {
        permit2 = ExecutorValidation.PermitSingle({
            details: ExecutorValidation.PermitDetails({token: tokenA, amount: 1000e18}),
            spender: address(executor),
            sigDeadline: block.timestamp + 1 hours,
            nonce: 1
        });

        // Empty signature for basic tests (signature validation tested separately)
        permit2Signature = "";
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

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
    address public owner;
    address public maker;
    address public relayer;
    address public unauthorizedUser;

    // Private keys for signing (test keys only)
    uint256 public constant MAKER_PRIVATE_KEY = 0x1234;
    uint256 public constant RELAYER_PRIVATE_KEY = 0x5678;

    function setUp() public virtual {
        console.log("Setting up ExecutorBase test environment...");

        // Create test accounts
        owner = makeAddr("owner");
        maker = vm.addr(MAKER_PRIVATE_KEY);
        relayer = vm.addr(RELAYER_PRIVATE_KEY);
        unauthorizedUser = makeAddr("unauthorized");

        // Create test tokens
        tokenA = makeAddr("tokenA");
        tokenB = makeAddr("tokenB");
        tokenC = makeAddr("tokenC");

        // Deploy Executor contract as owner
        vm.prank(owner);
        executor = new Executor();

        // Setup initial trader registry
        vm.prank(owner);
        executor.updateTraderRegistry(TRADER_REGISTRY);

        console.log("ExecutorBase setup complete");
    }

    // ========================================
    // INPUT VALIDATION TESTS
    // ========================================

    function test_InputValidation_ZeroAddresses() public {
        console.log("Testing zero address validations...");

        (ExecutorValidation.LimitOrder memory order, bytes memory orderSignature) = _createValidOrderInput();
        ExecutorValidation.RouteData memory routeData =
            ExecutorValidation.RouteData({encodedPath: "", fee: 3000, isMultiHop: false});
        (ExecutorValidation.PermitSingle memory permit2Data, bytes memory permit2Signature) = _createValidPermit2();

        // Test zero maker address
        order.maker = address(0);
        vm.expectRevert(Executor.ZeroAddress.selector);
        executor.executeOrder(order, routeData, orderSignature, permit2Data, permit2Signature);

        // Reset and test zero input token
        (order,) = _createValidOrderInput();
        order.inputToken = address(0);
        vm.expectRevert(Executor.ZeroAddress.selector);
        executor.executeOrder(order, routeData, orderSignature, permit2Data, permit2Signature);

        // Reset and test zero output token
        (order,) = _createValidOrderInput();
        order.outputToken = address(0);
        vm.expectRevert(Executor.ZeroAddress.selector);
        executor.executeOrder(order, routeData, orderSignature, permit2Data, permit2Signature);

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
        executor.executeOrder(order, routeData, orderSignature, permit2Data, permit2Signature);

        // Reset and test zero min amount out
        (order,) = _createValidOrderInput();
        (permit2Data,) = _createValidPermit2();
        order.minAmountOut = 0;
        vm.expectRevert(Executor.ZeroAmount.selector);
        executor.executeOrder(order, routeData, orderSignature, permit2Data, permit2Signature);

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
        executor.executeOrder(order, routeData, orderSignature, permit2Data, permit2Signature);

        console.log("Token mismatch validation test passed");
    }

    function test_InputValidation_AmountMismatch() public {
        console.log("Testing amount mismatch validation...");

        (ExecutorValidation.LimitOrder memory order, bytes memory orderSignature) = _createValidOrderInput();
        ExecutorValidation.RouteData memory routeData =
            ExecutorValidation.RouteData({encodedPath: "", fee: 3000, isMultiHop: false});
        (ExecutorValidation.PermitSingle memory permit2Data, bytes memory permit2Signature) = _createValidPermit2();

        // Make amounts mismatch
        permit2Data.details.amount = 2000e18; // Order uses 1000e18, permit2 uses 2000e18

        vm.expectRevert(Executor.PermitAmountMismatch.selector);
        executor.executeOrder(order, routeData, orderSignature, permit2Data, permit2Signature);

        console.log("Amount mismatch validation test passed");
    }

    // Router array validation test removed - no longer needed with simplified validation

    function test_InputValidation_RouteData() public {
        console.log("Testing route data validation...");

        (ExecutorValidation.LimitOrder memory order, bytes memory orderSignature) = _createValidOrderInput();
        (ExecutorValidation.PermitSingle memory permit2Data, bytes memory permit2Signature) = _createValidPermit2();

        // Test invalid fee for single-hop (zero fee)
        ExecutorValidation.RouteData memory routeData =
            ExecutorValidation.RouteData({encodedPath: "", fee: 0, isMultiHop: false});
        vm.expectRevert(Executor.InvalidFee.selector);
        executor.executeOrder(order, routeData, orderSignature, permit2Data, permit2Signature);

        // Test multi-hop with empty path
        routeData = ExecutorValidation.RouteData({encodedPath: "", fee: 0, isMultiHop: true});
        vm.expectRevert(Executor.InvalidPath.selector);
        executor.executeOrder(order, routeData, orderSignature, permit2Data, permit2Signature);

        console.log("Route data validation tests passed");
    }

    // ========================================
    // BUSINESS LOGIC VALIDATION TESTS
    // ========================================

    function test_BusinessLogic_OrderExpired() public {
        console.log("Testing OrderExpired revert condition...");

        (ExecutorValidation.LimitOrder memory order, bytes memory orderSignature) = _createValidOrderInput();
        ExecutorValidation.RouteData memory routeData =
            ExecutorValidation.RouteData({encodedPath: "", fee: 3000, isMultiHop: false});
        (ExecutorValidation.PermitSingle memory permit2Data, bytes memory permit2Signature) = _createValidPermit2();

        console.log("Order expiry before test:");
        console.log(order.expiry);

        // Test 1: Order expired by 1 second
        console.log("Test 1: Order expired by exactly 1 second");
        vm.warp(order.expiry + 1);

        vm.expectRevert(Executor.OrderExpired.selector);
        executor.executeOrder(order, routeData, orderSignature, permit2Data, permit2Signature);

        // Test 2: Order expired by a long time
        console.log("Test 2: Order expired by 1 day");
        vm.warp(order.expiry + 1 days);

        vm.expectRevert(Executor.OrderExpired.selector);
        executor.executeOrder(order, routeData, orderSignature, permit2Data, permit2Signature);

        console.log("OrderExpired tests completed");
    }

    function test_BusinessLogic_NonceAlreadyUsed() public {
        console.log("Testing nonce already used validation...");

        (ExecutorValidation.LimitOrder memory order, bytes memory orderSignature) = _createValidOrderInput();
        ExecutorValidation.RouteData memory routeData =
            ExecutorValidation.RouteData({encodedPath: "", fee: 3000, isMultiHop: false});
        (ExecutorValidation.PermitSingle memory permit2Data, bytes memory permit2Signature) = _createValidPermit2();

        // Manually mark nonce as used
        vm.prank(maker);
        executor.cancelNonce(order.nonce);

        vm.expectRevert(Executor.NonceAlreadyUsed.selector);
        executor.executeOrder(order, routeData, orderSignature, permit2Data, permit2Signature);

        console.log("Nonce already used validation test passed");
    }

    //TODO: refactor
    function test_BusinessLogic_RouterNotAllowed() public {
        console.log("Testing contract-level router not allowed validation...");

        (ExecutorValidation.LimitOrder memory order, bytes memory orderSignature) = _createValidOrderInput();
        ExecutorValidation.RouteData memory routeData =
            ExecutorValidation.RouteData({encodedPath: "", fee: 3000, isMultiHop: false});
        (ExecutorValidation.PermitSingle memory permit2Data, bytes memory permit2Signature) = _createValidPermit2();

        // Remove the router from contract allowlist
        //vm.prank(owner);
        //executor.setAllowedRouter(UNIV3_ROUTER, false);

        vm.expectRevert(Executor.RouterNotAllowed.selector);
        executor.executeOrder(order, routeData, orderSignature, permit2Data, permit2Signature);

        console.log("Contract-level router validation test passed");
    }

    // ========================================
    // VALIDATION ORDER TESTS
    // ========================================

    function test_ValidationOrder_InputsFirst() public {
        console.log("Testing that input validation happens first...");

        (ExecutorValidation.LimitOrder memory order, bytes memory orderSignature) = _createValidOrderInput();
        ExecutorValidation.RouteData memory routeData =
            ExecutorValidation.RouteData({encodedPath: "", fee: 3000, isMultiHop: false});
        (ExecutorValidation.PermitSingle memory permit2Data, bytes memory permit2Signature) = _createValidPermit2();

        // Set both input validation error (zero address) and business logic error (expired)
        order.maker = address(0); // Input validation error
        order.expiry = block.timestamp - 1; // Business logic error

        // Should fail with input validation error (ZeroAddress), not business logic error (OrderExpired)
        vm.expectRevert(Executor.ZeroAddress.selector);
        executor.executeOrder(order, routeData, orderSignature, permit2Data, permit2Signature);

        console.log("Input validation priority test passed");
    }

    // ========================================
    // HELPER FUNCTIONS
    // ========================================

    function _createValidOrderInput()
        internal
        view
        returns (ExecutorValidation.LimitOrder memory order, bytes memory orderSignature)
    {
        // No longer need routers array

        order = ExecutorValidation.LimitOrder({
            maker: maker,
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

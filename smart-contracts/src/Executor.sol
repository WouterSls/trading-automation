// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {EIP712} from "../lib/openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "../lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import {SafeERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract Executor is EIP712, ReentrancyGuard {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    string private constant NAME = "Executor";
    string private constant VERSION = "1";

    address private constant UNIV3_ADDRESS = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;

    address public owner;
    //TODO: add chain to address mapping
    mapping(address => bool) public allowedTarget; // allowlist for router/target addresses
    mapping(address => mapping(uint256 => bool)) public usedNonce;

    event TargetAllowed(address indexed target, bool allowed);
    event OrderExecuted(address indexed maker, address indexed target, uint256 amountIn);

    constructor() EIP712(NAME, VERSION) {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    // Admin
    function setAllowedTarget(address target, bool allowed) external onlyOwner {
        allowedTarget[target] = allowed;
        emit TargetAllowed(target, allowed);
    }

    // Order structure. 
    struct LimitCallOrder {
        address maker;         // signer
        address tokenIn;       // token the maker is selling. address(0) for ETH
        uint256 amountIn;      // amount of tokenIn to pull or expect in msg.value if ETH
        address target;        // allowlisted address to call (router / aggregator)
        address tokenOut;      // expected output token (address(0) for ETH)
        uint256 minAmountOut;  // minimum acceptable output across executor+recipient
        // TODO:
        // add encodedPath parmateres for v3 multihop transactions
        address recipient;     // who ultimately gets tokenOut
        uint256 deadline;      // unix timestamp
        uint256 nonce;         // maker nonce
    }

    // The EIP-712 type string must match the TypeScript typed data EXACTLY
    bytes32 public constant LIMITCALL_ORDER_TYPEHASH = keccak256(
        "LimitCallOrder(address maker,address tokenIn,uint256 amountIn,address target,address tokenOut,uint256 minAmountOut,address recipient,uint256 deadline,uint256 nonce)"
    );

    /**
     * @notice Execute a signed off-chain order that contains an allow-listed target and calldata.
     * @param order The signed order fields (must match the signed typed data).
     * @param orderSignature EIP-712 signature by order.maker.
     *
     * Notes:
     * TODO: implement relayer that takes signer eth
     * - If tokenIn == address(0): caller must include msg.value == amountIn (taker/relayer pays ETH).
     * - If tokenIn != address(0): maker must have approved this executor for amountIn.
     */
    function executeOrder(
        LimitCallOrder calldata order,
        bytes calldata orderSignature
        // Permit2 calldata permit2,
        // bytes calldata permit2Signature
    ) external payable nonReentrant {
        require(block.timestamp <= order.deadline, "order expired");
        require(allowedTarget[order.target], "target not allowed");
        require(!usedNonce[order.maker][order.nonce], "nonce used");

        // Recreate EIP-712 digest
        bytes32 structHash = keccak256(abi.encode(
            LIMITCALL_ORDER_TYPEHASH,
            order.maker,
            order.tokenIn,
            order.amountIn,
            order.target,
            order.tokenOut,
            order.minAmountOut,
            order.recipient,
            order.deadline,
            order.nonce
        ));

        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, orderSignature);
        require(recovered == order.maker, "invalid signature");

        // mark nonce BEFORE external effects
        usedNonce[order.maker][order.nonce] = true;

        // TODO: replace by either uniswap permit2 or permit on token
        // ERC20 case: pull from maker (maker must have approved)
        IERC20(order.tokenIn).safeTransferFrom(order.maker, address(this), order.amountIn);

        // TODO: check: does this work?
        // approve the target for tokenIn; set to zero first for safety on some tokens
        IERC20(order.tokenIn).approve(order.target, 0);
        IERC20(order.tokenIn).approve(order.target, order.amountIn);

        bool ok = false;

        if (order.target == UNIV3_ADDRESS) {
            require(order.tokenIn == address(0), 'No input address provided');
            IUniswapV3Router.ExactInputSingleParams memory input = IUniswapV3Router.ExactInputSingleParams({
                tokenIn: order.tokenIn,
                tokenOut: order.tokenOut,
                fee: 3000, // You'll need to determine the appropriate fee tier
                recipient: order.recipient, // or order.recipient depending on your logic
                deadline: order.deadline,
                amountIn: order.amountIn,
                amountOutMinimum: order.minAmountOut,
                sqrtPriceLimitX96: 0 // 0 means no price limit
            });

            IUniswapV3Router(UNIV3_ADDRESS).exactInputSingle(input);
            ok = true;
        }

        require(ok, "target call failed");

        // cleanup approval if ERC20
        if (order.tokenIn != address(0)) {
            IERC20(order.tokenIn).approve(order.target, 0);
        }

        emit OrderExecuted(order.maker, order.target, order.amountIn);
    }

    // allow maker to cancel their own nonce on-chain
    function cancelNonce(uint256 nonce) external {
        usedNonce[msg.sender][nonce] = true;
    }

    // Admin emergency withdraw (owner)
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

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}
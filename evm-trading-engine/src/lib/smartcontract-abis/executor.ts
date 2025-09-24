import { ethers } from "ethers";

const EXECUTOR_ABI = [
  "function cancelNonce(uint256 nonce)",
  "function eip712Domain() view returns (bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)",
  "function emergencyWithdrawToken(address token, address to)",
  "function executeOrder(tuple(tuple(tuple(address token, uint256 amount) permitted, uint256 nonce, uint256 deadline) permit, tuple(address to, uint256 requestedAmount) transferDetails, address owner, bytes signature) signedPermitData, tuple(address maker, address inputToken, address outputToken, uint256 inputAmount, uint256 minAmountOut, uint256 maxSlippageBps, uint256 expiry, uint256 nonce, bytes signature) signedOrder, tuple(uint8 protocol, address[] path, uint24 fee, bool isMultiHop, bytes encodedPath) routeData)",
  "function owner() view returns (address)",
  "function traderRegistry() view returns (address)",
  "function updateTraderRegistry(address newRegistry)",
  "function usedNonce(address, uint256) view returns (bool)",

  "event EIP712DomainChanged()", 
  "event OrderExecuted(address indexed maker, address indexed router, uint256 amountIn, uint256 amountOut)",
  "event TraderRegistryUpdated(address indexed newRegistry, address indexed updater)",

  "error CallFailed()",
  "error ECDSAInvalidSignature()",
  "error ECDSAInvalidSignatureLength(uint256 length)",
  "error ECDSAInvalidSignatureS(bytes32 s)",
  "error InsufficientOutput()",
  "error InvalidFee()",
  "error InvalidPath()",
  "error InvalidPermitSignature()",
  "error InvalidProtocol()",
  "error InvalidRouter()",
  "error InvalidShortString()",
  "error InvalidSignature()",
  "error NonceAlreadyUsed()",
  "error OrderExpired()",
  "error PermitAmountMismatch()",
  "error PermitExpired()",
  "error ReentrancyGuardReentrantCall()",
  "error SafeERC20FailedOperation(address token)",
  "error StringTooLong(string str)",
  "error TokenMismatch()",
  "error ZeroAddress()",
  "error ZeroAmount()"
];

export const EXECUTOR_INTERFACE = new ethers.Interface(EXECUTOR_ABI);

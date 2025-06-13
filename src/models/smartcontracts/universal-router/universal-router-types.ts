import { PoolKey } from "../uniswap-v4/uniswap-v4-types";

/**
 * Enum for Universal Router commands (from Commands.sol)
 * @see https://github.com/Uniswap/universal-router/blob/main/contracts/libraries/Commands.sol
 *
 * UniversalRouter
 * execute(bytes commands, bytes[] inputs)
 *
 * commands = list of commands for contract to execute (in order).
 * Each command is 1 byte (8 bits) with the following structure:
 *    1 bit for revert flag
 *    2 unused bits
 *    5 bits for command type
 *
 */
export enum CommandType {
  V3_SWAP_EXACT_IN = "0x00",
  V3_SWAP_EXACT_OUT = "0x01",
  PERMIT2_TRANSFER_FROM = "0x02",
  PERMIT2_PERMIT_BATCH = "0x03",
  TRANSFER = "0x05",

  V2_SWAP_EXACT_IN = "0x08",
  V2_SWAP_EXACT_OUT = "0x09",
  PERMIT2_PERMIT = "0x0a",
  WRAP_ETH = "0x0b",
  UNWRAP_WETH = "0x0c",
  PERMIT2_TRANSFER_FROM_BATCH = "0x0d",
  BALANCE_CHECK_ERC20 = "0x0e",

  V4_SWAP = "0x10",
  V3_POSITION_MANAGER_PERMIT = "0x11",
  V3_POSITION_MANAGER_CALL = "0x12",
  V4_INITIALIZE_POOL = "0x13",
  V4_POSITION_MANAGER_CALL = "0x14",
}

// ---------------------------- UNI V4 ----------------------------
/**
 * Enum for V4 pool actions
 * @see https://github.com/Uniswap/v4-periphery/blob/main/src/libraries/Actions.sol
 */
export enum V4PoolAction {
  SWAP_EXACT_IN_SINGLE = "0x06",
  SWAP_EXACT_IN = "0x07",
  SWAP_EXACT_OUT_SINGLE = "0x08",
  SWAP_EXACT_OUT = "0x09",
  SETTLE = "0x0b",
  SETTLE_ALL = "0x0c",
  TAKE = "0x0e",
  TAKE_ALL = "0x0f",
}

export enum V4PoolActionConstants {
  OPEN_DELTA = 0,
}

/**
 * V4 Pool actions parameters
 */
export interface IV4ExactInputSingleParams {
  poolKey: PoolKey;
  zeroForOne: boolean;
  amountIn: bigint;
  amountOutMinimum: bigint;
  hookData: string;
}

export interface IV4ExactInputParams {}

export interface IV4SettleParams {
  inputCurrency: string;
  amountIn: bigint;
  bool: boolean;
}

export interface IV4TakeParams {
  outputCurrency: string;
  recipient: string;
  amount: number;
}

// ---------------------------- UNI V3 ----------------------------
export interface IV3SwapExactInput {
  address: string;
  amountIn: number; //uint256
  amountOutMin: number; //uint256
  encodedPath: string; //bytes
  tokensFromSender: boolean;
}

export interface IV3SwapExactOutput {
  address: string;
  amountOut: number; //uint256
  amountInMax: number; //uint256
  encodedPath: string; //bytes
  tokensFromSender: boolean;
}

// ---------------------------- PERMIT2 ----------------------------
export interface IPermitSingle {
  details: {
    token: string;
    amount: bigint;
    expiration: number;
    nonce: bigint;
  };
  spender: string;
  sigDeadline: number;
}

export interface IPermitTransferFrom {
  token: string;
  recipient: string;
  amount: bigint;
}

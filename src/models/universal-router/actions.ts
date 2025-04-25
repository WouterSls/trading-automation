/**
 * Enum for V4 pool actions (from Actions.sol)
 * @see https://github.com/Uniswap/v4-periphery/blob/main/src/libraries/Actions.sol citeturn6view0
 */
export enum Action {
  SWAP_EXACT_IN_SINGLE = 0x06,
  SWAP_EXACT_IN = 0x07,
  SWAP_EXACT_OUT_SINGLE = 0x08,
  SWAP_EXACT_OUT = 0x09,
  SETTLE_ALL = 0x0c,
  TAKE_ALL = 0x0f,
  // ... add other actions as needed
}

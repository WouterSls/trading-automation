import { getEthWallet_1, getOfflineSigner_1 } from "../../../../src/hooks/useSetup";
import { UniswapV3Pool } from "../../../../src/models/blockchain/uniswap-v3";
import { Wallet } from "ethers";

global.fetch = jest.fn();

describe("ETH UniswapV3Pool Config", () => {
  let pool: UniswapV3Pool;
  let ethWallet: Wallet;
  let arbWallet: Wallet;
  let offlineWallet: Wallet;

  beforeEach(() => {
    jest.clearAllMocks();
    ethWallet = getEthWallet_1();
    offlineWallet = getOfflineSigner_1();
  });

  describe("Validate Pool Address", () => {
    it("ethWallet_validateIsPoolValidWallet_returns_true", async () => {});
  });

  describe("Get Liquidity", () => {
    it("ethWallet_getLiquidity_returns_liquidity", async () => {});

    it("ethWallet_getSlot0_returns_slot0", async () => {});
  });
});

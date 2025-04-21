import { getEthWallet_1, getOfflineSigner_1 } from "../../../src/hooks/useSetup";
import { UniswapV3Pool } from "../../../src/models/uniswap-v3";
import {
  V3_POOL_PEPE_ETH_3000_ADDRESS,
} from "../../../src/lib/token-addresses";
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
    const poolAddress = V3_POOL_PEPE_ETH_3000_ADDRESS;
    pool = new UniswapV3Pool(ethWallet, poolAddress);
    offlineWallet = getOfflineSigner_1();
  });

  describe("Validate Pool Address", () => {
    it("ethWallet_validateIsPoolValidWallet_returns_true", async () => {
      // Arrange
      const expectedResult = true;

      // Act
      //const actualResult = await pool.validateIsPool(ethWallet);
      const actualResult = false;

      // Assert
      expect(actualResult).toBe(expectedResult);
    });

  });

  describe("Get Liquidity", () => {
    it("ethWallet_getLiquidity_returns_liquidity", async () => {
      // Arrange
      const expectedLiquidity = 1000000000000000000;

      // Act
      //const actualPoolAddress = await factory.getPoolAddress(ethWallet, ETH_WETH_ADDRESS, ETH_EOA_ACCOUNT_ADDRESS, 3000);
      const actualLiquidity = await pool.getLiquidity();

      // Assert
      expect(actualLiquidity).toEqual(expectedLiquidity);
    });

    it("ethWallet_getSlot0_returns_slot0", async () => {
      // Arrange
      const expectedSlot0 = 1000000000000000000;

      // Act
      const actualSlot0 = await pool.getSlot0();

      // Assert
      expect(actualSlot0).toEqual(expectedSlot0);
    });
  });
});

import { getArbitrumWallet_1, getHardhatWallet_1, getOfflineSigner_1 } from "../../../src/hooks/useSetup";
import { FeeAmount, UniswapV3Factory, UniswapV3Pool } from "../../../src/smartcontracts/uniswap-v3";
import { ChainConfig, ChainType, getChainConfig } from "../../../src/config/chain-config";
import { Wallet } from "ethers";
import { NetworkForkManager } from "../../helpers/network-fork";

const MISSING_PROVIDER_ERROR_MESSAGE = "Wallet has missing provider";
const INVALID_NETWORK_ERROR_MESSAGE = "Wallet and factory are on different networks";
const POOL_NOT_FOUND_ERROR_PREFIX = "Pool not found for";

describe("ETH UniswapV3Factory", () => {
  let factory: UniswapV3Factory;
  let chainConfig: ChainConfig;

  let wallet: Wallet;
  let nonNetworkWallet: Wallet;
  let offlineWallet: Wallet;

  beforeAll(async () => {
    const chain = ChainType.ETH;
    await NetworkForkManager.startHardhatFork(chain);
    chainConfig = getChainConfig(chain);
    factory = new UniswapV3Factory(chain);
    nonNetworkWallet = getArbitrumWallet_1();
    offlineWallet = getOfflineSigner_1();
    wallet = getHardhatWallet_1();
  }, 20_000);

  afterAll(async () => {
    await NetworkForkManager.cleanupHardhatFork();
  });

  describe("Get Pool Address", () => {
    it("should return null when pool doesn't exist", async () => {
      const tokenA = chainConfig.tokenAddresses.weth;
      const tokenB = wallet.address;
      const feeTier = FeeAmount.MEDIUM;

      const poolAddress = await factory.getPoolAddress(wallet, tokenA, tokenB, feeTier);

      expect(poolAddress).toEqual(null);
    });

    it("should return pool address when pool exists", async () => {
      const PEPE_ADDRESS = "0x6982508145454ce325ddbe47a25d4ec3d2311933";
      const tokenA = PEPE_ADDRESS;
      const tokenB = chainConfig.tokenAddresses.weth;
      const feeTier = FeeAmount.MEDIUM;

      const V3_POOL_PEPE_ETH_3000_ADDRESS = "0x11950d141EcB863F01007AdD7D1A342041227b58";
      const expectedPoolAddress = V3_POOL_PEPE_ETH_3000_ADDRESS;

      const actualPoolAddress = await factory.getPoolAddress(wallet, tokenA, tokenB, feeTier);

      expect(actualPoolAddress).toEqual(expectedPoolAddress);
    });
  });

  describe("Get Pool", () => {
    it("should return null when pool doesn't exist", async () => {
      const tokenA = chainConfig.tokenAddresses.weth;
      const tokenB = wallet.address;
      const feeTier = FeeAmount.MEDIUM;

      const poolAddress = await factory.getPoolAddress(wallet, tokenA, tokenB, feeTier);

      expect(poolAddress).toEqual(null);
    });

    it("should return UniswapV3Pool when pool exists", async () => {
      const PEPE_ADDRESS = "0x6982508145454ce325ddbe47a25d4ec3d2311933";
      const tokenA = PEPE_ADDRESS;
      const tokenB = chainConfig.tokenAddresses.weth;
      const feeTier = FeeAmount.MEDIUM;

      const V3_POOL_PEPE_ETH_3000_ADDRESS = "0x11950d141EcB863F01007AdD7D1A342041227b58";
      const expectedPoolAddress = V3_POOL_PEPE_ETH_3000_ADDRESS;

      const pool = await factory.getPool(wallet, tokenA, tokenB, feeTier);

      expect(pool).toBeInstanceOf(UniswapV3Pool);
      expect(pool.getPoolAddress()).toBe(expectedPoolAddress);
    });
  });
});

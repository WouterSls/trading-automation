import { ethers, Wallet } from "ethers";
import { NetworkForkManager } from "../../../helpers/network-fork";
import {
  getArbitrumWallet_1,
  getEthWallet_1,
  getHardhatWallet_1,
  getOfflineSigner_1,
} from "../../../../src/hooks/useSetup";
import { UniswapV2Factory } from "../../../../src/models/blockchain/uniswap-v2/UniswapV2Factory";
import { ChainConfig, ChainType, getChainConfig } from "../../../../src/config/chain-config";

const MISSING_PROVIDER_ERROR_MESSAGE = "Network Validation Failed";
const INVALID_NETWORK_ERROR_MESSAGE = "Wallet on different chain";

describe("ETH UniswapV2Factory", () => {
  let factory: UniswapV2Factory;
  let chainConfig: ChainConfig;

  let wallet: Wallet;
  let nonNetworkWallet: Wallet;
  let offlineWallet: Wallet;

  beforeAll(async () => {
    const chain = ChainType.ETH;
    await NetworkForkManager.startHardhatFork(chain);
    chainConfig = getChainConfig(chain);
    factory = new UniswapV2Factory(chain);
    nonNetworkWallet = getArbitrumWallet_1();
    offlineWallet = getOfflineSigner_1();
    wallet = getHardhatWallet_1();
  },20_000);

  afterAll(async () => {
    await NetworkForkManager.cleanupHardhatFork();
  });

  describe("Get Pair Address", () => {
    it("should throw an error when using a wallet connected to wrong network", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.dai;
      const tokenB = chainConfig.tokenAddresses.usdc;
      // Act | Assert
      await expect(factory.getPairAddress(nonNetworkWallet, tokenA, tokenB)).rejects.toThrow(
        INVALID_NETWORK_ERROR_MESSAGE,
      );
    });

    it("should throw an error when using a wallet without a connection", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.dai;
      const tokenB = chainConfig.tokenAddresses.usdc;
      // Act | Assert
      await expect(factory.getPairAddress(offlineWallet, tokenA, tokenB)).rejects.toThrow(
        MISSING_PROVIDER_ERROR_MESSAGE,
      );
    });

    it("should return zero address when pair address doesn't exist for tokenA & tokenB", async () => {
      // Arrange
      const expectedPairAddress = ethers.ZeroAddress;

      const tokenA = ethers.ZeroAddress;
      const tokenB = chainConfig.tokenAddresses.usdc;

      // Act
      const actualPairAddress = await factory.getPairAddress(wallet, tokenA, tokenB);

      // Assert
      expect(actualPairAddress).toEqual(expectedPairAddress);
    });

    it("should return the actual address when a pair exists for tokenA & tokenB", async () => {
      // Arrange
      const ETH_PEPE_ADDRESS = "0x6982508145454Ce325dDbE47a25d4ec3d2311933";
      const tokenA = ETH_PEPE_ADDRESS;
      const tokenB = chainConfig.tokenAddresses.weth;

      const ETH_V2_PAIR_PEPE_ETH_ADDRESS = "0xA43fe16908251ee70EF74718545e4FE6C5cCEc9f";
      const expectedPairAddress = ETH_V2_PAIR_PEPE_ETH_ADDRESS;

      // Act
      const actualPairAddress = await factory.getPairAddress(wallet, tokenA, tokenB);

      // Assert
      expect(actualPairAddress).toEqual(expectedPairAddress);
    });
  });
});

describe("ARB UniswapV2Factory", () => {
  let factory: UniswapV2Factory;
  let chainConfig: ChainConfig;

  let wallet: Wallet;
  let nonNetworkWallet: Wallet;
  let offlineWallet: Wallet;

  beforeAll(async () => {
    const chain = ChainType.ARB;
    await NetworkForkManager.startHardhatFork(chain);
    chainConfig = getChainConfig(chain);
    factory = new UniswapV2Factory(chain);
  });

  beforeEach(() => {
    wallet = getHardhatWallet_1();
    nonNetworkWallet = getEthWallet_1();
    offlineWallet = getOfflineSigner_1();
  });

  afterAll(async () => {
    await NetworkForkManager.cleanupHardhatFork();
  });

  describe("Get Pair Address", () => {
    it("should throw an error when using a wallet connected to wrong network", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.dai;
      const tokenB = chainConfig.tokenAddresses.usdc;
      // Act | Assert
      await expect(factory.getPairAddress(nonNetworkWallet, tokenA, tokenB)).rejects.toThrow(
        INVALID_NETWORK_ERROR_MESSAGE,
      );
    });

    it("should throw an error when using a wallet without a connection", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.dai;
      const tokenB = chainConfig.tokenAddresses.usdc;
      // Act | Assert
      await expect(factory.getPairAddress(offlineWallet, tokenA, tokenB)).rejects.toThrow(
        MISSING_PROVIDER_ERROR_MESSAGE,
      );
    });

    it("should return zero address when pair address doesn't exist for tokenA & tokenB", async () => {
      // Arrange
      const tokenA = ethers.ZeroAddress;
      const tokenB = chainConfig.tokenAddresses.weth;

      const expectedPairAddress = ethers.ZeroAddress;

      // Act
      const actualPairAddress = await factory.getPairAddress(wallet, tokenA, tokenB);

      // Assert
      expect(actualPairAddress).toEqual(expectedPairAddress);
    });

    it("should return the actual address when a pair exists for tokenA & tokenB", async () => {
      // Arrange
      const ARB_ARB_ADDRESS = "0x912CE59144191C1204E64559FE8253a0e49E6548";
      const tokenA = ARB_ARB_ADDRESS;
      const tokenB = chainConfig.tokenAddresses.weth;

      const ARB_V2_PAIR_ARB_WETH_ADDRESS = "0x103B03051Bf073c44DECfAF8dFd12275254AB97E";
      const expectedPairAddress = ARB_V2_PAIR_ARB_WETH_ADDRESS;

      // Act
      const actualPairAddress = await factory.getPairAddress(wallet, tokenA, tokenB);

      // Assert
      expect(actualPairAddress).toEqual(expectedPairAddress);
    });
  });
});

describe("BASE UniswapV2Factory", () => {
  let factory: UniswapV2Factory;
  let chainConfig: ChainConfig;

  let wallet: Wallet;
  let nonNetworkWallet: Wallet;
  let offlineWallet: Wallet;

  beforeAll(async () => {
    const chain = ChainType.BASE;
    await NetworkForkManager.startHardhatFork(chain);
    chainConfig = getChainConfig(chain);
    factory = new UniswapV2Factory(chain);
  });

  beforeEach(() => {
    wallet = getHardhatWallet_1();
    nonNetworkWallet = getEthWallet_1();
    offlineWallet = getOfflineSigner_1();
  });

  afterAll(async () => {
    await NetworkForkManager.cleanupHardhatFork();
  });

  describe("Get Pair Address", () => {
    it("should throw an error when using a wallet connected to wrong network", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.dai;
      const tokenB = chainConfig.tokenAddresses.usdc;
      // Act | Assert
      await expect(factory.getPairAddress(nonNetworkWallet, tokenA, tokenB)).rejects.toThrow(
        INVALID_NETWORK_ERROR_MESSAGE,
      );
    });

    it("should throw an error when using a wallet without a connection", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.dai;
      const tokenB = chainConfig.tokenAddresses.usdc;
      // Act | Assert
      await expect(factory.getPairAddress(offlineWallet, tokenA, tokenB)).rejects.toThrow(
        MISSING_PROVIDER_ERROR_MESSAGE,
      );
    });

    it("should return zero address when pair address doesn't exist for tokenA & tokenB", async () => {
      // Arrange
      const tokenA = ethers.ZeroAddress;
      const tokenB = chainConfig.tokenAddresses.weth;

      const expectedPairAddress = ethers.ZeroAddress;

      // Act
      const actualPairAddress = await factory.getPairAddress(wallet, tokenA, tokenB);

      // Assert
      expect(actualPairAddress).toEqual(expectedPairAddress);
    });

    it("should return the actual address when a pair exists for tokenA & tokenB", async () => {
      // Arrange
      const BASE_VIRTUAL_ADDRESS = "0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b";
      const tokenA = BASE_VIRTUAL_ADDRESS;
      const tokenB = chainConfig.tokenAddresses.weth;

      const BASE_V2_PAIR_BASE_VIRTUAL_WETH_ADDRESS = "0xE31c372a7Af875b3B5E0F3713B17ef51556da667";
      const expectedPairAddress = BASE_V2_PAIR_BASE_VIRTUAL_WETH_ADDRESS;

      // Act
      const actualPairAddress = await factory.getPairAddress(wallet, tokenA, tokenB);

      // Assert
      expect(actualPairAddress).toEqual(expectedPairAddress);
    });
  });
});

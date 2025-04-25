import {
  getArbitrumWallet_1,
  getEthWallet_1,
  getHardhatWallet_1,
  getOfflineSigner_1,
} from "../../../src/hooks/useSetup";
import { FeeAmount, UniswapV3Factory, UniswapV3Pool } from "../../../src/models/uniswap-v3";
import { ChainType } from "../../../src/config/chain-config";
import {
  ETH_WETH_ADDRESS,
  ETH_PEPE_ADDRESS,
  V3_POOL_PEPE_ETH_3000_ADDRESS,
  ETH_EOA_ACCOUNT_ADDRESS,
  ETH_FLAYER_ADDRESS,
} from "../../../src/lib/token-addresses";
import { ethers, Wallet } from "ethers";

global.fetch = jest.fn();

// Error message constants - use the exact text from the factory implementation
const MISSING_PROVIDER_ERROR_MESSAGE = "Wallet has missing provider";
const INVALID_NETWORK_ERROR_MESSAGE = "Wallet and factory are on different networks";
const POOL_NOT_FOUND_ERROR_PREFIX = "Pool not found for";

describe("ETH UniswapV3Factory Config", () => {
  let factory: UniswapV3Factory;
  let ethWallet: Wallet;
  let arbWallet: Wallet;
  let offlineWallet: Wallet;

  beforeEach(() => {
    jest.clearAllMocks();
    factory = new UniswapV3Factory(ChainType.ETH);
    //ethWallet = getEthWallet_1();
    // Make sure hardhat mainnet fork is running from block > 22_344_527
    // This ensures all provided hardcoded pools addresses exist on the network
    ethWallet = getHardhatWallet_1();
    arbWallet = getArbitrumWallet_1();
    offlineWallet = getOfflineSigner_1();
  });

  describe("Validate Factory Address", () => {
    it("ethWallet_validateIsFactoryValidWallet_returns_true", async () => {
      // Arrange
      const expectedResult = true;

      // Act
      const actualResult = await factory.validateIsFactory(ethWallet);

      // Assert
      expect(actualResult).toBe(expectedResult);
    });

    it("offlineWallet_validateIsFactoryInvalidWallet_throws_MISSING_PROVIDER_ERROR_MESSAGE", async () => {
      await expect(factory.validateIsFactory(offlineWallet)).rejects.toThrow(MISSING_PROVIDER_ERROR_MESSAGE);
    });

    it("arbWallet_validateIsFactoryInvalidWallet_throws_INVALID_NETWORK_ERROR_MESSAGE", async () => {
      await expect(factory.validateIsFactory(arbWallet)).rejects.toThrow(INVALID_NETWORK_ERROR_MESSAGE);
    });
  });

  describe("Get Pool Address", () => {
    it("ethWallet_getPoolAddress_invalidInput_WETH_EOA-ADDRESS_3000_returns_ethersZeroAddress", async () => {
      // Arrange
      const expectedPoolAddress = ethers.ZeroAddress;

      // Act
      const actualPoolAddress = await factory.getPoolAddress(
        ethWallet,
        ETH_WETH_ADDRESS,
        ETH_EOA_ACCOUNT_ADDRESS,
        3000,
      );

      // Assert
      expect(actualPoolAddress).toEqual(expectedPoolAddress);
    });

    it("ethWallet_getPoolAddress_validInput_PEPE_WETH_3000_returns_V3_POOL_PEPE_ETH_3000_ADDRESS", async () => {
      // Arrange
      const expectedPoolAddress = V3_POOL_PEPE_ETH_3000_ADDRESS;

      // Act
      const actualPoolAddress = await factory.getPoolAddress(ethWallet, ETH_PEPE_ADDRESS, ETH_WETH_ADDRESS, 3000);

      // Assert
      expect(actualPoolAddress).toEqual(expectedPoolAddress);
    });
  });

  describe("Get Pool", () => {
    it("ethWallet_getPoolAddress_invalidInput_WETH_EOA-ADDRESS_3000_throws_POOL_NOT_FOUND_ERROR_MESSAGE", async () => {
      // Act / Assert
      await expect(factory.getPool(ethWallet, ETH_WETH_ADDRESS, ETH_EOA_ACCOUNT_ADDRESS, 3000)).rejects.toThrow(
        new RegExp(POOL_NOT_FOUND_ERROR_PREFIX),
      );
    });

    it("ethWallet_getPoolAddress_validInput_WETH_PEPE_3000_returns_UniswapV3Pool", async () => {
      // Act
      const actualPool = await factory.getPool(ethWallet, ETH_PEPE_ADDRESS, ETH_WETH_ADDRESS, 3000);

      // Assert
      expect(actualPool).toBeInstanceOf(UniswapV3Pool);
    });
  });

  describe("Get Token WETH Pool Address", () => {
    it("ethWallet_getPoolAddress_invalidInput_WETH_returns_ethersZeroAddress", async () => {
      // Arrange
      const expectedPoolAddress = ethers.ZeroAddress;

      // Act
      const actualPoolAddress = await factory.getPoolAddress(ethWallet, ETH_WETH_ADDRESS, ETH_WETH_ADDRESS, 3000);

      // Assert
      expect(actualPoolAddress).toEqual(expectedPoolAddress);
    });

    it("ethWallet_getPoolAddress_invalidInput_EOA-ADDRESS_returns_ethersZeroAddress", async () => {
      // Arrange
      const expectedPoolAddress = ethers.ZeroAddress;

      // Act
      const actualPoolAddress = await factory.getPoolAddress(
        ethWallet,
        ETH_EOA_ACCOUNT_ADDRESS,
        ETH_WETH_ADDRESS,
        3000,
      );

      // Assert
      expect(actualPoolAddress).toEqual(expectedPoolAddress);
    });

    it("ethWallet_getPoolAddress_validERC20NoPoolExists_returns_ethersZeroAddress", async () => {
      // Arrange
      const expectedPoolAddress = ethers.ZeroAddress;
      const feeTier = FeeAmount.LOW;

      // Act
      const actualPoolAddress = await factory.getPoolAddress(ethWallet, ETH_FLAYER_ADDRESS, ETH_WETH_ADDRESS, feeTier);

      // Assert
      expect(actualPoolAddress).toEqual(expectedPoolAddress);
    });

    it("ethWallet_getPoolAddress_validERC20PoolExists_returns_V3_POOL_PEPE_ETH_3000_ADDRESS", async () => {
      // Arrange
      const expectedPoolAddress = V3_POOL_PEPE_ETH_3000_ADDRESS;
      const feeTier = FeeAmount.MEDIUM;

      // Act
      const actualPoolAddress = await factory.getPoolAddress(ethWallet, ETH_PEPE_ADDRESS, ETH_WETH_ADDRESS, feeTier);

      // Assert
      expect(actualPoolAddress).toEqual(expectedPoolAddress);
    });

    it("offlineWallet_getPoolAddress_throws_MISSING_PROVIDER_ERROR_MESSAGE", async () => {
      // Act / Assert
      await expect(factory.getPoolAddress(offlineWallet, ETH_WETH_ADDRESS, ETH_WETH_ADDRESS, 3000)).rejects.toThrow(
        MISSING_PROVIDER_ERROR_MESSAGE,
      );
    });
  });

  describe("Get Token WETH Pool", () => {
    it("ethWallet_getPoolAddress_invalidInput_WETH_returns_ethersZeroAddress", async () => {
      // Arrange
      const feeTier = FeeAmount.MEDIUM;

      // Act / Assert
      await expect(factory.getPool(ethWallet, ETH_WETH_ADDRESS, ETH_WETH_ADDRESS, feeTier)).rejects.toThrow(
        new RegExp(POOL_NOT_FOUND_ERROR_PREFIX),
      );
    });

    it("ethWallet_getPool_validInput_PEPE_WETH_3000_returns_UniswapV3Pool", async () => {
      // Arrange
      const feeTier = FeeAmount.MEDIUM;

      // Act
      const actualPool = await factory.getPool(ethWallet, ETH_PEPE_ADDRESS, ETH_WETH_ADDRESS, feeTier);

      // Assert
      expect(actualPool).toBeInstanceOf(UniswapV3Pool);
    });
  });
});

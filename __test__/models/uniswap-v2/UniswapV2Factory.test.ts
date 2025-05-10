import { getArbitrumWallet_1, getBaseWallet_1, getEthWallet_1, getOfflineSigner_1 } from "../../../src/hooks/useSetup";
import { UniswapV2Factory } from "../../../src/models/uniswap-v2";
import { ChainType } from "../../../src/config/chain-config";
import {
  BASE_VIRTUAL_ADDRESS,
  ETH_WETH_ADDRESS,
  ETH_PEPE_ADDRESS,
  ARB_ARB_ADDRESS,
  ARB_WETH_ADDRESS,
  V2_PAIR_ARB_WETH_ADDRESS,
  BASE_WETH_ADDRESS,
  V2_PAIR_BASE_VIRTUAL_WETH_ADDRESS,
  V2_PAIR_PEPE_ETH_ADDRESS,
} from "../../../src/lib/token-addresses";
import { ethers, Wallet } from "ethers";

const MISSING_PROVIDER_ERROR_MESSAGE = "Wallet has missing provider";
const INVALID_NETWORK_ERROR_MESSAGE = "Wallet and factory are on different networks";

describe("ETH UniswapV2Factory Config", () => {
  let factory: UniswapV2Factory;
  let ethWallet: Wallet;
  let arbWallet: Wallet;
  let offlineWallet: Wallet;

  beforeEach(() => {
    factory = new UniswapV2Factory(ChainType.ETH);
    ethWallet = getEthWallet_1();
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

    it("offlineWallet_validateIsFactoryInvalidWallet_throws_error", async () => {
      await expect(factory.validateIsFactory(offlineWallet)).rejects.toThrow(MISSING_PROVIDER_ERROR_MESSAGE);
    });

    it("arbWallet_validateIsFactoryInvalidWallet_throws_error", async () => {
      await expect(factory.validateIsFactory(arbWallet)).rejects.toThrow(INVALID_NETWORK_ERROR_MESSAGE);
    });
  });

  describe("Get Pair Address", () => {
    it("ethWallet_getPairAddressWETH_returnsZeroAddress", async () => {
      // Arrange
      const expectedPairAddress = ethers.ZeroAddress;

      // Act
      const actualPairAddress = await factory.getTokenWETHPairAddress(ethWallet, ETH_WETH_ADDRESS);

      // Assert
      expect(actualPairAddress).toEqual(expectedPairAddress);
    });

    it("ethWallet_getPairAddressInvalidERC20_BASE_VIRTUAL_returnsZeroAddress", async () => {
      // Arrange
      const expectedPairAddress = ethers.ZeroAddress;

      // Act
      const actualPairAddress = await factory.getTokenWETHPairAddress(ethWallet, BASE_VIRTUAL_ADDRESS);

      // Assert
      expect(actualPairAddress).toEqual(expectedPairAddress);
    });

    it("ethWallet_getPairAddressValidERC20NoPoolExists_BERASTONE_returnsZeroAddress", async () => {
      // Arrange
      const expectedPairAddress = ethers.ZeroAddress;

      // Act
      const actualPairAddress = await factory.getTokenWETHPairAddress(ethWallet, BASE_VIRTUAL_ADDRESS);

      // Assert
      expect(actualPairAddress).toEqual(expectedPairAddress);
    });

    it("ethWallet_getPairAddressValidERC20WithPoolExists_PEPE_returns_V3_POOL_PEPE_ETH_3000_ADDRESS", async () => {
      // Arrange
      const expectedPairAddress = V2_PAIR_PEPE_ETH_ADDRESS;

      // Act
      const actualPairAddress = await factory.getTokenWETHPairAddress(ethWallet, ETH_PEPE_ADDRESS);

      // Assert
      expect(actualPairAddress).toEqual(expectedPairAddress);
    });

    it("offlineWallet_getPairAddress_throws_error", async () => {
      // Arrange
      // Act / Assert
      await expect(factory.getTokenWETHPairAddress(offlineWallet, ETH_WETH_ADDRESS)).rejects.toThrow(
        MISSING_PROVIDER_ERROR_MESSAGE,
      );
    });
  });
});

describe("ARB UniswapV2Factory Config", () => {
  let factory: UniswapV2Factory;
  let ethWallet: Wallet;
  let arbWallet: Wallet;
  let offlineWallet: Wallet;

  beforeEach(() => {
    jest.clearAllMocks();
    factory = new UniswapV2Factory(ChainType.ARB);
    ethWallet = getEthWallet_1();
    arbWallet = getArbitrumWallet_1();
    offlineWallet = getOfflineSigner_1();
  });

  describe("Validate Factory Address", () => {
    it("arbWallet_validateIsFactoryValidWallet_returns_true", async () => {
      // Arrange
      const expectedResult = true;

      // Act
      const actualResult = await factory.validateIsFactory(arbWallet);

      // Assert
      expect(actualResult).toBe(expectedResult);
    });

    it("offlineWallet_validateIsFactoryInvalidWallet_throws_error", async () => {
      await expect(factory.validateIsFactory(offlineWallet)).rejects.toThrow(MISSING_PROVIDER_ERROR_MESSAGE);
    });

    it("ethWallet_validateIsFactoryInvalidWallet_throws_error", async () => {
      await expect(factory.validateIsFactory(ethWallet)).rejects.toThrow(INVALID_NETWORK_ERROR_MESSAGE);
    });
  });

  describe("Get Pair Address", () => {
    it("arbWallet_getPairAddressWETH_returnsZeroAddress", async () => {
      // Arrange
      const expectedPairAddress = ethers.ZeroAddress;

      // Act
      const actualPairAddress = await factory.getTokenWETHPairAddress(arbWallet, ARB_WETH_ADDRESS);

      // Assert
      expect(actualPairAddress).toEqual(expectedPairAddress);
    });

    it("arbWallet_getPairAddressValidERC20_ARB_returnsValidAddress", async () => {
      // Arrange
      const expectedPairAddress = V2_PAIR_ARB_WETH_ADDRESS;

      // Act
      const actualPairAddress = await factory.getTokenWETHPairAddress(arbWallet, ARB_ARB_ADDRESS);

      // Assert
      expect(actualPairAddress).not.toEqual(ethers.ZeroAddress);
      expect(actualPairAddress).toEqual(expectedPairAddress);
    });

    it("offlineWallet_getPairAddress_throws_error", async () => {
      // Arrange
      // Act / Assert
      await expect(factory.getTokenWETHPairAddress(offlineWallet, ARB_WETH_ADDRESS)).rejects.toThrow(
        MISSING_PROVIDER_ERROR_MESSAGE,
      );
    });
  });
});

describe("BASE UniswapV2Factory Config", () => {
  let factory: UniswapV2Factory;
  let ethWallet: Wallet;
  let baseWallet: Wallet;
  let offlineWallet: Wallet;

  beforeEach(() => {
    jest.clearAllMocks();
    factory = new UniswapV2Factory(ChainType.BASE);
    ethWallet = getEthWallet_1();
    baseWallet = getBaseWallet_1();
    offlineWallet = getOfflineSigner_1();
  });

  describe("Validate Factory Address", () => {
    it("baseWallet_validateIsFactoryValidWallet_returns_true", async () => {
      // Arrange
      const expectedResult = true;

      // Act
      const actualResult = await factory.validateIsFactory(baseWallet);

      // Assert
      expect(actualResult).toBe(expectedResult);
    });

    it("offlineWallet_validateIsFactoryInvalidWallet_throws_error", async () => {
      // Arrange
      // Act / Assert
      await expect(factory.validateIsFactory(offlineWallet)).rejects.toThrow(MISSING_PROVIDER_ERROR_MESSAGE);
    });

    it("ethWallet_validateIsFactoryInvalidWallet_throws_error", async () => {
      // Arrange
      // Act / Assert
      await expect(factory.validateIsFactory(ethWallet)).rejects.toThrow(INVALID_NETWORK_ERROR_MESSAGE);
    });
  });

  describe("Get Pair Address", () => {
    it("baseWallet_getPairAddressWETH_returnsZeroAddress", async () => {
      // Arrange
      const expectedPairAddress = ethers.ZeroAddress;

      // Act
      const actualPairAddress = await factory.getTokenWETHPairAddress(baseWallet, BASE_WETH_ADDRESS);

      // Assert
      expect(actualPairAddress).toEqual(expectedPairAddress);
    });

    it("arbWallet_getPairAddressValidERC20_ARB_returnsValidAddress", async () => {
      // Arrange
      const expectedPairAddress = V2_PAIR_BASE_VIRTUAL_WETH_ADDRESS;

      // Act
      const actualPairAddress = await factory.getTokenWETHPairAddress(baseWallet, BASE_VIRTUAL_ADDRESS);

      // Assert
      expect(actualPairAddress).not.toEqual(ethers.ZeroAddress);
      expect(actualPairAddress).toEqual(expectedPairAddress);
    });

    it("offlineWallet_getPairAddress_throws_error", async () => {
      // Arrange
      // Act / Assert
      await expect(factory.getTokenWETHPairAddress(offlineWallet, ARB_WETH_ADDRESS)).rejects.toThrow(
        MISSING_PROVIDER_ERROR_MESSAGE,
      );
    });
  });
});

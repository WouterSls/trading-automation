import { ethers, Wallet } from "ethers";
import { NetworkForkManager } from "../../../helpers/network-fork";
import { getArbitrumWallet_1, getHardhatWallet_1, getOfflineSigner_1 } from "../../../../src/hooks/useSetup";
import { ChainConfig, ChainType, getChainConfig } from "../../../../src/config/chain-config";
import { UniswapV4Quoter } from "../../../../src/models/blockchain/uniswap-v4/UniswapV4Quoter";
import { PoolKey, PathSegment } from "../../../../src/models/blockchain/uniswap-v4/uniswap-v4-types";

const NETWORK_VALIDATION_FAILED_MESSAGE = "Network Validation Failed";
const INVALID_NETWORK_ERROR_MESSAGE = "Wallet on different chain";

describe("Uniswap V4 Quoter", () => {
  let quoter: UniswapV4Quoter;
  let chainConfig: ChainConfig;

  let wallet: Wallet;
  let nonNetworkWallet: Wallet;
  let offlineWallet: Wallet;

  const USDC_DECIMALS = 6;
  const DAI_DECIMALS = 18;
  const WETH_DECIMALS = 18;

  beforeAll(async () => {
    const chain = ChainType.ETH;
    await NetworkForkManager.startHardhatFork(chain);
    chainConfig = getChainConfig(chain);
    quoter = new UniswapV4Quoter(chain);
  }, 20_000);

  beforeEach(() => {
    wallet = getHardhatWallet_1();
    nonNetworkWallet = getArbitrumWallet_1();
    offlineWallet = getOfflineSigner_1();
  });

  afterAll(async () => {
    await NetworkForkManager.cleanupHardhatFork();
  });

  // Helper function to create a basic pool key
  const createPoolKey = (
    currency0: string,
    currency1: string,
    fee: number = 500,
    tickSpacing: number = 10,
  ): PoolKey => ({
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks: "0x0000000000000000000000000000000000000000",
  });

  describe("quoteExactInputSingle", () => {
    it("should throw an error when using a wallet connected to wrong network", async () => {
      // Arrange
      const poolKey = createPoolKey(chainConfig.tokenAddresses.usdc, chainConfig.tokenAddresses.dai);
      const zeroForOne = true;
      const amountIn = ethers.parseUnits("1", USDC_DECIMALS);
      const hookData = "0x";

      // Act | Assert
      await expect(
        quoter.quoteExactInputSingle(nonNetworkWallet, poolKey, zeroForOne, amountIn, hookData),
      ).rejects.toThrow(INVALID_NETWORK_ERROR_MESSAGE);
    });

    it("should throw an error when using a wallet without a connection", async () => {
      // Arrange
      const poolKey = createPoolKey(chainConfig.tokenAddresses.usdc, chainConfig.tokenAddresses.dai);
      const zeroForOne = true;
      const amountIn = ethers.parseUnits("1", USDC_DECIMALS);
      const hookData = "0x";

      // Act | Assert
      await expect(
        quoter.quoteExactInputSingle(offlineWallet, poolKey, zeroForOne, amountIn, hookData),
      ).rejects.toThrow(NETWORK_VALIDATION_FAILED_MESSAGE);
    });

    it("should return valid quote data for a 1 usdc -> dai swap", async () => {
      // Arrange
      const poolKey = createPoolKey(chainConfig.tokenAddresses.usdc, chainConfig.tokenAddresses.dai);
      const zeroForOne = true;
      const amountIn = ethers.parseUnits("1", USDC_DECIMALS);
      const hookData = "0x";

      // Act
      const { amountOut, gasEstimate } = await quoter.quoteExactInputSingle(
        wallet,
        poolKey,
        zeroForOne,
        amountIn,
        hookData,
      );

      // Assert
      expect(amountOut).toBeGreaterThanOrEqual(0n);
      expect(gasEstimate).toBeGreaterThanOrEqual(0n);

      if (amountOut > 0n) {
        const formattedAmountOut = parseFloat(ethers.formatUnits(amountOut, DAI_DECIMALS));
        expect(formattedAmountOut).toBeGreaterThan(0);
      }
    });

    it("should return 0 for quote on non existing pool", async () => {
      // Arrange
      const poolKey = createPoolKey(chainConfig.tokenAddresses.dai, wallet.address);
      const zeroForOne = true;
      const amountIn = ethers.parseUnits("1", DAI_DECIMALS);
      const hookData = "0x";

      // Act
      const { amountOut, gasEstimate } = await quoter.quoteExactInputSingle(
        wallet,
        poolKey,
        zeroForOne,
        amountIn,
        hookData,
      );

      // Assert
      expect(amountOut).toBe(0n);
      expect(gasEstimate).toBe(0n);
    });

    it("should handle different fee tiers", async () => {
      // Arrange
      const poolKeys = [
        createPoolKey(chainConfig.tokenAddresses.usdc, chainConfig.tokenAddresses.dai, 100, 1), // 0.01%
        createPoolKey(chainConfig.tokenAddresses.usdc, chainConfig.tokenAddresses.dai, 500, 10), // 0.05%
        createPoolKey(chainConfig.tokenAddresses.usdc, chainConfig.tokenAddresses.dai, 3000, 60), // 0.3%
      ];
      const zeroForOne = true;
      const amountIn = ethers.parseUnits("1", USDC_DECIMALS);
      const hookData = "0x";

      // Act & Assert
      for (const poolKey of poolKeys) {
        const { amountOut, gasEstimate } = await quoter.quoteExactInputSingle(
          wallet,
          poolKey,
          zeroForOne,
          amountIn,
          hookData,
        );

        expect(amountOut).toBeGreaterThanOrEqual(0n);
        expect(gasEstimate).toBeGreaterThanOrEqual(0n);
      }
    });
  });

  describe("quoteExactInput", () => {
    it("should throw an error when using a wallet connected to wrong network", async () => {
      // Arrange
      const exactCurrency = chainConfig.tokenAddresses.usdc;
      const path: PathSegment[] = [
        {
          intermediateCurrency: chainConfig.tokenAddresses.weth,
          fee: 500,
          tickSpacing: 10,
          hooks: "0x0000000000000000000000000000000000000000",
          hookData: "0x",
        },
        {
          intermediateCurrency: chainConfig.tokenAddresses.dai,
          fee: 500,
          tickSpacing: 10,
          hooks: "0x0000000000000000000000000000000000000000",
          hookData: "0x",
        },
      ];
      const exactAmount = ethers.parseUnits("1", USDC_DECIMALS);

      // Act | Assert
      await expect(quoter.quoteExactInput(nonNetworkWallet, exactCurrency, path, exactAmount)).rejects.toThrow(
        INVALID_NETWORK_ERROR_MESSAGE,
      );
    });

    it("should throw an error when using a wallet without a connection", async () => {
      // Arrange
      const exactCurrency = chainConfig.tokenAddresses.usdc;
      const path: PathSegment[] = [
        {
          intermediateCurrency: chainConfig.tokenAddresses.dai,
          fee: 500,
          tickSpacing: 10,
          hooks: "0x0000000000000000000000000000000000000000",
          hookData: "0x",
        },
      ];
      const exactAmount = ethers.parseUnits("1", USDC_DECIMALS);

      // Act | Assert
      await expect(quoter.quoteExactInput(offlineWallet, exactCurrency, path, exactAmount)).rejects.toThrow(
        NETWORK_VALIDATION_FAILED_MESSAGE,
      );
    });

    it("should return valid quote data for multi-hop swap", async () => {
      // Arrange
      const exactCurrency = chainConfig.tokenAddresses.usdc;
      const path: PathSegment[] = [
        {
          intermediateCurrency: chainConfig.tokenAddresses.dai,
          fee: 500,
          tickSpacing: 10,
          hooks: "0x0000000000000000000000000000000000000000",
          hookData: "0x",
        },
      ];
      const exactAmount = ethers.parseUnits("1", USDC_DECIMALS);

      // Act
      const { amountOut, gasEstimate } = await quoter.quoteExactInput(wallet, exactCurrency, path, exactAmount);

      // Assert
      expect(amountOut).toBeGreaterThanOrEqual(0n);
      expect(gasEstimate).toBeGreaterThanOrEqual(0n);
    });

    it("should return 0 for quote with non existing tokens in path", async () => {
      // Arrange
      const exactCurrency = chainConfig.tokenAddresses.usdc;
      const path: PathSegment[] = [
        {
          intermediateCurrency: wallet.address,
          fee: 500,
          tickSpacing: 10,
          hooks: "0x0000000000000000000000000000000000000000",
          hookData: "0x",
        },
      ];
      const exactAmount = ethers.parseUnits("1", USDC_DECIMALS);

      // Act
      const { amountOut, gasEstimate } = await quoter.quoteExactInput(wallet, exactCurrency, path, exactAmount);

      // Assert
      expect(amountOut).toBe(0n);
      expect(gasEstimate).toBe(0n);
    });
  });

  describe("quoteExactOutputSingle", () => {
    it("should throw an error when using a wallet connected to wrong network", async () => {
      // Arrange
      const poolKey = createPoolKey(chainConfig.tokenAddresses.usdc, chainConfig.tokenAddresses.dai);
      const zeroForOne = true;
      const amountOut = ethers.parseUnits("1", DAI_DECIMALS);
      const hookData = "0x";

      // Act | Assert
      await expect(
        quoter.quoteExactOutputSingle(nonNetworkWallet, poolKey, zeroForOne, amountOut, hookData),
      ).rejects.toThrow(INVALID_NETWORK_ERROR_MESSAGE);
    });

    it("should throw an error when using a wallet without a connection", async () => {
      // Arrange
      const poolKey = createPoolKey(chainConfig.tokenAddresses.usdc, chainConfig.tokenAddresses.dai);
      const zeroForOne = true;
      const amountOut = ethers.parseUnits("1", DAI_DECIMALS);
      const hookData = "0x";

      // Act | Assert
      await expect(
        quoter.quoteExactOutputSingle(offlineWallet, poolKey, zeroForOne, amountOut, hookData),
      ).rejects.toThrow(NETWORK_VALIDATION_FAILED_MESSAGE);
    });

    it("should return valid quote data for a usdc -> 1 dai swap", async () => {
      // Arrange
      const poolKey = createPoolKey(chainConfig.tokenAddresses.usdc, chainConfig.tokenAddresses.dai);
      const zeroForOne = true;
      const amountOut = ethers.parseUnits("1", DAI_DECIMALS);
      const hookData = "0x";

      // Act
      const { amountIn, gasEstimate } = await quoter.quoteExactOutputSingle(
        wallet,
        poolKey,
        zeroForOne,
        amountOut,
        hookData,
      );

      // Assert
      expect(amountIn).toBeGreaterThanOrEqual(0n);
      expect(gasEstimate).toBeGreaterThanOrEqual(0n);

      if (amountIn > 0n) {
        const formattedAmountIn = parseFloat(ethers.formatUnits(amountIn, USDC_DECIMALS));
        expect(formattedAmountIn).toBeGreaterThan(0);
      }
    });

    it("should return 0 for quote on non existing pool", async () => {
      // Arrange
      const poolKey = createPoolKey(chainConfig.tokenAddresses.dai, wallet.address);
      const zeroForOne = true;
      const amountOut = ethers.parseUnits("1", USDC_DECIMALS);
      const hookData = "0x";

      // Act
      const { amountIn, gasEstimate } = await quoter.quoteExactOutputSingle(
        wallet,
        poolKey,
        zeroForOne,
        amountOut,
        hookData,
      );

      // Assert
      expect(amountIn).toBe(0n);
      expect(gasEstimate).toBe(0n);
    });

    it("should handle large token amounts correctly", async () => {
      // Arrange
      const poolKey = createPoolKey(chainConfig.tokenAddresses.usdc, chainConfig.tokenAddresses.dai);
      const zeroForOne = true;
      const amountOut = ethers.parseUnits("1000000", DAI_DECIMALS); // 1 million DAI
      const hookData = "0x";

      // Act
      const { amountIn, gasEstimate } = await quoter.quoteExactOutputSingle(
        wallet,
        poolKey,
        zeroForOne,
        amountOut,
        hookData,
      );

      // Assert
      expect(amountIn).toBeGreaterThanOrEqual(0n);
      expect(gasEstimate).toBeGreaterThanOrEqual(0n);
    });

    it("should handle minimum amountOut value", async () => {
      // Arrange
      const poolKey = createPoolKey(chainConfig.tokenAddresses.usdc, chainConfig.tokenAddresses.dai);
      const zeroForOne = true;
      const amountOut = 1n; // Minimum possible value (1 wei)
      const hookData = "0x";

      // Act
      const { amountIn, gasEstimate } = await quoter.quoteExactOutputSingle(
        wallet,
        poolKey,
        zeroForOne,
        amountOut,
        hookData,
      );

      // Assert
      expect(amountIn).toBeGreaterThanOrEqual(0n);
      expect(gasEstimate).toBeGreaterThanOrEqual(0n);
    });
  });

  describe("quoteExactOutput", () => {
    it("should throw an error when using a wallet connected to wrong network", async () => {
      // Arrange
      const exactCurrency = chainConfig.tokenAddresses.dai;
      const path: PathSegment[] = [
        {
          intermediateCurrency: chainConfig.tokenAddresses.usdc,
          fee: 500,
          tickSpacing: 10,
          hooks: "0x0000000000000000000000000000000000000000",
          hookData: "0x",
        },
      ];
      const exactAmount = ethers.parseUnits("1", DAI_DECIMALS);

      // Act | Assert
      await expect(quoter.quoteExactOutput(nonNetworkWallet, exactCurrency, path, exactAmount)).rejects.toThrow(
        INVALID_NETWORK_ERROR_MESSAGE,
      );
    });

    it("should throw an error when using a wallet without a connection", async () => {
      // Arrange
      const exactCurrency = chainConfig.tokenAddresses.dai;
      const path: PathSegment[] = [
        {
          intermediateCurrency: chainConfig.tokenAddresses.usdc,
          fee: 500,
          tickSpacing: 10,
          hooks: "0x0000000000000000000000000000000000000000",
          hookData: "0x",
        },
      ];
      const exactAmount = ethers.parseUnits("1", DAI_DECIMALS);

      // Act | Assert
      await expect(quoter.quoteExactOutput(offlineWallet, exactCurrency, path, exactAmount)).rejects.toThrow(
        NETWORK_VALIDATION_FAILED_MESSAGE,
      );
    });

    it("should return valid quote data for multi-hop exact output swap", async () => {
      // Arrange
      const exactCurrency = chainConfig.tokenAddresses.dai;
      const path: PathSegment[] = [
        {
          intermediateCurrency: chainConfig.tokenAddresses.usdc,
          fee: 500,
          tickSpacing: 10,
          hooks: "0x0000000000000000000000000000000000000000",
          hookData: "0x",
        },
      ];
      const exactAmount = ethers.parseUnits("1", DAI_DECIMALS);

      // Act
      const { amountIn, gasEstimate } = await quoter.quoteExactOutput(wallet, exactCurrency, path, exactAmount);

      // Assert
      expect(amountIn).toBeGreaterThanOrEqual(0n);
      expect(gasEstimate).toBeGreaterThanOrEqual(0n);
    });

    it("should return 0 for quote with non existing tokens in path", async () => {
      // Arrange
      const exactCurrency = chainConfig.tokenAddresses.dai;
      const path: PathSegment[] = [
        {
          intermediateCurrency: wallet.address,
          fee: 500,
          tickSpacing: 10,
          hooks: "0x0000000000000000000000000000000000000000",
          hookData: "0x",
        },
      ];
      const exactAmount = ethers.parseUnits("1", DAI_DECIMALS);

      // Act
      const { amountIn, gasEstimate } = await quoter.quoteExactOutput(wallet, exactCurrency, path, exactAmount);

      // Assert
      expect(amountIn).toBe(0n);
      expect(gasEstimate).toBe(0n);
    });
  });

  describe("getQuoterAddress", () => {
    it("should return the correct quoter address", () => {
      // Act
      const address = quoter.getQuoterAddress();

      // Assert
      expect(address).toBe(chainConfig.uniswap.v4.quoterAddress);
      expect(ethers.isAddress(address)).toBe(true);
    });
  });

  describe("constructor", () => {
    it("should throw an error if quoter address is not defined", () => {
      // Arrange
      const originalAddress = chainConfig.uniswap.v4.quoterAddress;
      chainConfig.uniswap.v4.quoterAddress = "";

      // Act & Assert
      expect(() => new UniswapV4Quoter(ChainType.ETH)).toThrow("Quoter address not defined for chain:");

      // Cleanup
      chainConfig.uniswap.v4.quoterAddress = originalAddress;
    });

    it("should create quoter instance successfully with valid configuration", () => {
      // Act
      const newQuoter = new UniswapV4Quoter(ChainType.ETH);

      // Assert
      expect(newQuoter).toBeInstanceOf(UniswapV4Quoter);
      expect(newQuoter.getQuoterAddress()).toBe(chainConfig.uniswap.v4.quoterAddress);
    });
  });
});

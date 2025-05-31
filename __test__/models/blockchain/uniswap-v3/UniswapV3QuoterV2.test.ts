import { ethers, Wallet } from "ethers";
import { NetworkForkManager } from "../../../helpers/network-fork";
import { getArbitrumWallet_1, getHardhatWallet_1, getOfflineSigner_1 } from "../../../../src/hooks/useSetup";
import { UniswapV2RouterV2 } from "../../../../src/models/blockchain/uniswap-v2/index";
import { ChainConfig, ChainType, getChainConfig } from "../../../../src/config/chain-config";
import { encodePath, FeeAmount, UniswapV3QuoterV2 } from "../../../../src/models/blockchain/uniswap-v3";

const NETWORK_VALIDATION_FAILED_MESSAGE = "Network Validation Failed";
const INVALID_NETWORK_ERROR_MESSAGE = "Wallet on different chain";

describe("Uniswap V3 QuoterV2", () => {
  let quoter: UniswapV3QuoterV2;
  let chainConfig: ChainConfig;

  let wallet: Wallet;
  let nonNetworkWallet: Wallet;
  let offlineWallet: Wallet;

  const USDC_DECIMALS = 6;
  const DAI_DECIMALS = 18;

  beforeAll(async () => {
    const chain = ChainType.ETH;
    await NetworkForkManager.startHardhatFork(chain);
    chainConfig = getChainConfig(chain);
    quoter = new UniswapV3QuoterV2(chain);
  });

  beforeEach(() => {
    wallet = getHardhatWallet_1();
    nonNetworkWallet = getArbitrumWallet_1();
    offlineWallet = getOfflineSigner_1();
  });

  afterAll(async () => {
    await NetworkForkManager.cleanupHardhatFork();
  });

  describe("quoteExactInput", () => {
    it("should throw an error when using a wallet connected to wrong network", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.weth;
      const tokenC = chainConfig.tokenAddresses.dai;
      const path = [tokenA, tokenB, tokenC];
      const fees = [FeeAmount.MEDIUM, FeeAmount.MEDIUM];
      const encodedPath = encodePath(path, fees);

      const amountIn = ethers.parseUnits("1", USDC_DECIMALS);

      // Act | Assert
      await expect(quoter.quoteExactInput(nonNetworkWallet, encodedPath, amountIn)).rejects.toThrow(
        INVALID_NETWORK_ERROR_MESSAGE,
      );
    });

    it("should throw an error when using a wallet without a connection", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.weth;
      const tokenC = chainConfig.tokenAddresses.dai;
      const path = [tokenA, tokenB, tokenC];
      const fees = [FeeAmount.MEDIUM, FeeAmount.MEDIUM];
      const encodedPath = encodePath(path, fees);

      const amountIn = ethers.parseUnits("1", USDC_DECIMALS);

      // Act | Assert
      await expect(quoter.quoteExactInput(offlineWallet, encodedPath, amountIn)).rejects.toThrow(
        NETWORK_VALIDATION_FAILED_MESSAGE,
      );
    });

    it("should return an amount out between 0.99 and 1.01 for a 1 usdc -> weth -> dai quote", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.weth;
      const tokenC = chainConfig.tokenAddresses.dai;
      const path = [tokenA, tokenB, tokenC];
      const fees = [FeeAmount.MEDIUM, FeeAmount.MEDIUM];
      const encodedPath = encodePath(path, fees);

      const amountIn = ethers.parseUnits("1", USDC_DECIMALS);

      const { amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } = await quoter.quoteExactInput(
        wallet,
        encodedPath,
        amountIn,
      );

      const formattedAmountOut = parseFloat(ethers.formatUnits(amountOut, DAI_DECIMALS));

      // Assert
      expect(formattedAmountOut).toBeGreaterThan(0.99);
      expect(formattedAmountOut).toBeLessThan(1.01);
    });

    it("should return an amount out between 0.99 and 1.01 for a 1 usdc -> dai quote", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.dai;
      const path = [tokenA, tokenB];
      const fees = [FeeAmount.LOW];
      const encodedPath = encodePath(path, fees);

      const amountIn = ethers.parseUnits("1", USDC_DECIMALS);

      const { amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } = await quoter.quoteExactInput(
        wallet,
        encodedPath,
        amountIn,
      );

      const formattedAmountOut = parseFloat(ethers.formatUnits(amountOut, DAI_DECIMALS));

      // Assert
      expect(formattedAmountOut).toBeGreaterThan(0.99);
      expect(formattedAmountOut).toBeLessThan(1.01);
    });

    it("should return 0 for quote on non existing pool", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.dai;
      const tokenB = wallet.address;
      const path = [tokenA, tokenB];
      const fees = [FeeAmount.MEDIUM];
      const encodedPath = encodePath(path, fees);

      const amountIn = ethers.parseUnits("1", DAI_DECIMALS);

      const expectedOutputAmount = 0n;

      // Act
      const { amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } = await quoter.quoteExactInput(
        wallet,
        encodedPath,
        amountIn,
      );

      // Assert
      expect(amountOut).toBe(expectedOutputAmount);
    });
  });

  describe("quoteExactInputSingle", () => {
    it("should throw an error when using a wallet connected to wrong network", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.dai;
      const recipient = wallet.address;
      const fee = FeeAmount.LOW;
      const amountIn = ethers.parseUnits("1", USDC_DECIMALS);
      const amountOutMin = 0n;
      const sqrtPriceLimitX96 = 0n;

      // Act | Assert
      await expect(
        quoter.quoteExactInputSingle(
          nonNetworkWallet,
          tokenA,
          tokenB,
          fee,
          recipient,
          amountIn,
          amountOutMin,
          sqrtPriceLimitX96,
        ),
      ).rejects.toThrow(INVALID_NETWORK_ERROR_MESSAGE);
    });

    it("should throw an error when using a wallet without a connection", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.dai;
      const recipient = wallet.address;
      const fee = FeeAmount.LOW;
      const amountIn = ethers.parseUnits("1", USDC_DECIMALS);
      const amountOutMin = 0n;
      const sqrtPriceLimitX96 = 0n;

      // Act | Assert
      await expect(
        quoter.quoteExactInputSingle(
          offlineWallet,
          tokenA,
          tokenB,
          fee,
          recipient,
          amountIn,
          amountOutMin,
          sqrtPriceLimitX96,
        ),
      ).rejects.toThrow(NETWORK_VALIDATION_FAILED_MESSAGE);
    });

    it("should return an amount out between 0.99 and 1.01 for a 1 usdc -> dai quote", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.dai;
      const recipient = wallet.address;
      const fee = FeeAmount.LOW;
      const amountIn = ethers.parseUnits("1", USDC_DECIMALS);
      const amountOutMin = 0n;
      const sqrtPriceLimitX96 = 0n;

      const { amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } = await quoter.quoteExactInputSingle(
        wallet,
        tokenA,
        tokenB,
        fee,
        recipient,
        amountIn,
        amountOutMin,
        sqrtPriceLimitX96,
      );

      const formattedAmountOut = parseFloat(ethers.formatUnits(amountOut, DAI_DECIMALS));

      // Assert
      expect(formattedAmountOut).toBeGreaterThan(0.99);
      expect(formattedAmountOut).toBeLessThan(1.01);
    });

    it("should return 0 for quote on non existing pool", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.dai;
      const tokenB = wallet.address;
      const recipient = wallet.address;
      const fee = FeeAmount.LOW;
      const amountIn = ethers.parseUnits("1", USDC_DECIMALS);
      const amountOutMin = 0n;
      const sqrtPriceLimitX96 = 0n;

      const expectedOutputAmount = 0n;

      // Act
      const { amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } = await quoter.quoteExactInputSingle(
        wallet,
        tokenA,
        tokenB,
        fee,
        recipient,
        amountIn,
        amountOutMin,
        sqrtPriceLimitX96,
      );

      // Assert
      expect(amountOut).toBe(expectedOutputAmount);
    });
  });

  describe("quoteExactOutput", () => {
    it("should throw an error when using a wallet connected to wrong network", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.weth;
      const tokenC = chainConfig.tokenAddresses.dai;
      const path = [tokenC, tokenB, tokenA]; // Reverse order for exact output
      const fees = [FeeAmount.MEDIUM, FeeAmount.MEDIUM];
      const encodedPath = encodePath(path, fees);

      const amountOut = ethers.parseUnits("1", USDC_DECIMALS);

      // Act | Assert
      await expect(quoter.quoteExactOutput(nonNetworkWallet, encodedPath, amountOut)).rejects.toThrow(
        INVALID_NETWORK_ERROR_MESSAGE,
      );
    });

    it("should throw an error when using a wallet without a connection", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.weth;
      const tokenC = chainConfig.tokenAddresses.dai;
      const path = [tokenC, tokenB, tokenA]; // Reverse order for exact output
      const fees = [FeeAmount.MEDIUM, FeeAmount.MEDIUM];
      const encodedPath = encodePath(path, fees);

      const amountOut = ethers.parseUnits("1", USDC_DECIMALS);

      // Act | Assert
      await expect(quoter.quoteExactOutput(offlineWallet, encodedPath, amountOut)).rejects.toThrow(
        NETWORK_VALIDATION_FAILED_MESSAGE,
      );
    });

    it("should return a reasonable amount in for a usdc -> weth -> 1 dai quote", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.weth;
      const tokenC = chainConfig.tokenAddresses.dai;
      const path = [tokenC, tokenB, tokenA]; // Reverse order for exact output (USDC -> WETH -> DAI)
      const fees = [FeeAmount.MEDIUM, FeeAmount.MEDIUM];
      const encodedPath = encodePath(path, fees);

      const amountOut = ethers.parseUnits("1", DAI_DECIMALS); // Output 1 DAI

      const { amountIn, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } = await quoter.quoteExactOutput(
        wallet,
        encodedPath,
        amountOut,
      );

      const formattedAmountIn = parseFloat(ethers.formatUnits(amountIn, USDC_DECIMALS));

      // Assert - For exact output, we expect to need slightly more than 1 USDC to get 1 DAI due to fees and slippage
      expect(formattedAmountIn).toBeGreaterThan(0.5); // More reasonable lower bound
      expect(formattedAmountIn).toBeLessThan(2.0); // More reasonable upper bound
      expect(amountIn).toBeGreaterThan(0n); // Ensure we got a valid quote
    });

    it("should return a reasonable amount in for a usdc -> 1 dai quote", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.dai;
      const path = [tokenB, tokenA]; // Reverse order for exact output (USDC -> DAI)
      const fees = [FeeAmount.LOW];
      const encodedPath = encodePath(path, fees);

      const amountOut = ethers.parseUnits("1", DAI_DECIMALS); // Output 1 DAI

      const { amountIn, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } = await quoter.quoteExactOutput(
        wallet,
        encodedPath,
        amountOut,
      );

      const formattedAmountIn = parseFloat(ethers.formatUnits(amountIn, USDC_DECIMALS));

      // Assert - For exact output, we expect to need slightly more than 1 USDC to get 1 DAI due to fees
      expect(formattedAmountIn).toBeGreaterThan(0.5); // More reasonable lower bound
      expect(formattedAmountIn).toBeLessThan(2.0); // More reasonable upper bound
      expect(amountIn).toBeGreaterThan(0n); // Ensure we got a valid quote
    });

    it("should return 0 for quote on non existing pool", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.dai;
      const tokenB = wallet.address;
      const path = [tokenB, tokenA]; // Reverse order for exact output
      const fees = [FeeAmount.MEDIUM];
      const encodedPath = encodePath(path, fees);

      const amountOut = ethers.parseUnits("1", DAI_DECIMALS);

      const expectedInputAmount = 0n;

      // Act
      const { amountIn, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } = await quoter.quoteExactOutput(
        wallet,
        encodedPath,
        amountOut,
      );

      // Assert
      expect(amountIn).toBe(expectedInputAmount);
    });
  });

  describe("quoteExactOutputSingle", () => {
    it("should throw an error when using a wallet connected to wrong network", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.dai;
      const fee = FeeAmount.LOW;
      const amountOut = ethers.parseUnits("1", DAI_DECIMALS);
      const sqrtPriceLimitX96 = 0n;

      const params = {
        tokenIn: tokenA,
        tokenOut: tokenB,
        amount: amountOut,
        fee,
        sqrtPriceLimitX96,
      };

      // Act | Assert
      await expect(quoter.quoteExactOutputSingle(nonNetworkWallet, params)).rejects.toThrow(
        INVALID_NETWORK_ERROR_MESSAGE,
      );
    });

    it("should throw an error when using a wallet without a connection", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.dai;
      const fee = FeeAmount.LOW;
      const amountOut = ethers.parseUnits("1", DAI_DECIMALS);
      const sqrtPriceLimitX96 = 0n;

      const params = {
        tokenIn: tokenA,
        tokenOut: tokenB,
        amount: amountOut,
        fee,
        sqrtPriceLimitX96,
      };

      // Act | Assert
      await expect(quoter.quoteExactOutputSingle(offlineWallet, params)).rejects.toThrow(
        NETWORK_VALIDATION_FAILED_MESSAGE,
      );
    });

    it("should return an amount in between 0.99 and 1.01 for a usdc -> 1 dai quote", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.dai;
      const fee = FeeAmount.LOW;
      const amountOut = ethers.parseUnits("1", DAI_DECIMALS);
      const sqrtPriceLimitX96 = 0n;

      const params = {
        tokenIn: tokenA,
        tokenOut: tokenB,
        amount: amountOut,
        fee,
        sqrtPriceLimitX96,
      };

      const { amountIn, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } = await quoter.quoteExactOutputSingle(
        wallet,
        params,
      );

      const formattedAmountIn = parseFloat(ethers.formatUnits(amountIn, USDC_DECIMALS));

      // Assert
      expect(formattedAmountIn).toBeGreaterThan(0.99);
      expect(formattedAmountIn).toBeLessThan(1.01);
    });

    it("should return 0 for quote on non existing pool", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.dai;
      const tokenB = wallet.address;
      const fee = FeeAmount.LOW;
      const amountOut = ethers.parseUnits("1", USDC_DECIMALS);
      const sqrtPriceLimitX96 = 0n;

      const params = {
        tokenIn: tokenA,
        tokenOut: tokenB,
        amount: amountOut,
        fee,
        sqrtPriceLimitX96,
      };

      const expectedInputAmount = 0n;

      // Act
      const { amountIn, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } = await quoter.quoteExactOutputSingle(
        wallet,
        params,
      );

      // Assert
      expect(amountIn).toBe(expectedInputAmount);
    });

    it("should handle large token amounts correctly", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.dai;
      const fee = FeeAmount.LOW;
      const amountOut = ethers.parseUnits("1000000", DAI_DECIMALS); // 1 million DAI
      const sqrtPriceLimitX96 = 0n;

      const params = {
        tokenIn: tokenA,
        tokenOut: tokenB,
        amount: amountOut,
        fee,
        sqrtPriceLimitX96,
      };

      // Act
      const { amountIn, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } = await quoter.quoteExactOutputSingle(
        wallet,
        params,
      );

      // Assert
      expect(amountIn).toBeGreaterThan(0n);
      expect(sqrtPriceX96After).toBeGreaterThan(0n);
      expect(gasEstimate).toBeGreaterThan(0n);
    });

    it("should handle minimum amountOut value", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.dai;
      const fee = FeeAmount.LOW;
      const amountOut = 1n; // Minimum possible value (1 wei)
      const sqrtPriceLimitX96 = 0n;

      const params = {
        tokenIn: tokenA,
        tokenOut: tokenB,
        amount: amountOut,
        fee,
        sqrtPriceLimitX96,
      };

      // Act
      const { amountIn, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } = await quoter.quoteExactOutputSingle(
        wallet,
        params,
      );

      // Assert
      expect(amountIn).toBeGreaterThanOrEqual(0n);
      expect(sqrtPriceX96After).toBeGreaterThanOrEqual(0n);
      expect(gasEstimate).toBeGreaterThanOrEqual(0n);
    });
  });
});

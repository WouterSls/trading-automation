import { ethers, Wallet } from "ethers";
import { NetworkForkManager } from "../../../helpers/network-fork";
import { getArbitrumWallet_1, getHardhatWallet_1, getOfflineSigner_1 } from "../../../../src/hooks/useSetup";
import { UniswapV2RouterV2 } from "../../../../src/models/blockchain/uniswap-v2/index";
import { ChainConfig, ChainType, getChainConfig } from "../../../../src/config/chain-config";

const MISSING_PROVIDER_ERROR_MESSAGE = "Wallet has missing provider";
const INVALID_NETWORK_ERROR_MESSAGE = "Wallet and factory are on different networks";

describe("Uniswap V2 Router", () => {
  let router: UniswapV2RouterV2;
  let chainConfig: ChainConfig;

  let wallet: Wallet;
  let nonNetworkWallet: Wallet;
  let offlineWallet: Wallet;

  const USDC_DECIMALS = 6;
  const SWAP_EXACT_ETH_FOR_TOKENS_SIGNATURE = "0x7ff36ab5";
  const SWAP_EXACT_TOKENS_FOR_ETH_SIGNATURE = "0x18cbafe5";
  const SWAP_EXACT_TOKENS_FOR_TOKENS_SINGATURE = "0x38ed1739";

  beforeAll(async () => {
    const chain = ChainType.ETH;
    await NetworkForkManager.startHardhatFork(chain);
    chainConfig = getChainConfig(chain);
    router = new UniswapV2RouterV2(chain);
  });

  beforeEach(() => {
    wallet = getHardhatWallet_1();
    nonNetworkWallet = getArbitrumWallet_1();
    offlineWallet = getOfflineSigner_1();
  });

  afterAll(async () => {
    await NetworkForkManager.cleanupHardhatFork();
  });

  describe("getAmountsOut", () => {
    it("should throw an error when using a wallet connected to wrong network", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.weth;
      const tokenB = chainConfig.tokenAddresses.usdc;

      const amountIn = ethers.parseEther("1");
      const path = [tokenA, tokenB];

      // Act | Assert
      await expect(router.getAmountsOut(nonNetworkWallet, amountIn, path)).rejects.toThrow(
        INVALID_NETWORK_ERROR_MESSAGE,
      );
    });

    it("should throw an error when using a wallet without a connection", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.weth;
      const tokenB = chainConfig.tokenAddresses.usdc;

      const amountIn = ethers.parseEther("1");
      const path = [tokenA, tokenB];

      // Act | Assert
      await expect(router.getAmountsOut(offlineWallet, amountIn, path)).rejects.toThrow(MISSING_PROVIDER_ERROR_MESSAGE);
    });

    it("should return an array of amounts greater than 0 on successful router call", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.weth;
      const tokenB = chainConfig.tokenAddresses.usdc;

      const amountIn = ethers.parseEther("1");
      const path = [tokenA, tokenB];

      // Act
      const amountsOut = await router.getAmountsOut(wallet, amountIn, path);

      // Assert
      expect(amountsOut.length).toBeGreaterThan(0);
      expect(amountsOut[0]).toBeGreaterThan(0n);
      expect(amountsOut[1]).toBeGreaterThan(0n);
    });
  });

  describe("createSwapExactETHForTokensTransaction", () => {
    it("should create a valid transaction with correct parameters", () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.weth;
      const amountOutMin = ethers.parseUnits("100", USDC_DECIMALS);
      const path = [tokenA, tokenB];
      const to = wallet.address;
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

      // Act
      const tx = router.createSwapExactETHForTokensTransaction(amountOutMin, path, to, deadline);

      // Assert
      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
      expect(tx.data).toBeDefined();
    });

    it("should include the correct function signature in the encoded data", () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.weth;
      const amountOutMin = ethers.parseUnits("100", USDC_DECIMALS);
      const path = [tokenA, tokenB];
      const to = wallet.address;
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      // Act
      const tx = router.createSwapExactETHForTokensTransaction(amountOutMin, path, to, deadline);

      // Assert
      // Function signature for swapExactETHForTokens is the first 10 characters (including 0x)
      const functionSignature = tx.data!.toString().substring(0, 10);
      expect(functionSignature).toBe(SWAP_EXACT_ETH_FOR_TOKENS_SIGNATURE);
    });

    it("should handle zero amountOutMin correctly", () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.weth;
      const tokenB = chainConfig.tokenAddresses.usdc;
      const amountOutMin = 0n; // Testing with zero minimum
      const path = [tokenA, tokenB];
      const to = wallet.address;
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      // Act
      const tx = router.createSwapExactETHForTokensTransaction(amountOutMin, path, to, deadline);

      // Assert
      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
    });

    it("should handle a long deadline correctly", () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.weth;
      const amountOutMin = ethers.parseUnits("100", USDC_DECIMALS);
      const path = [tokenA, tokenB];
      const to = wallet.address;
      const deadline = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 1 week

      // Act
      const tx = router.createSwapExactETHForTokensTransaction(amountOutMin, path, to, deadline);

      // Assert
      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
    });

    it("should work with different recipient address", () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.weth;
      const amountOutMin = ethers.parseUnits("100", USDC_DECIMALS);
      const path = [tokenA, tokenB];
      const to = "0x1234567890123456789012345678901234567890";
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      // Act
      const tx = router.createSwapExactETHForTokensTransaction(amountOutMin, path, to, deadline);

      // Assert
      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
    });
  });

  describe("createSwapExactTokensForETHTransaction", () => {
    it("should create a valid transaction with correct parameters", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.weth;
      const amountIn = ethers.parseUnits("100", 6); // 100 USDC
      const amountOutMin = ethers.parseEther("0.01"); // Minimum 0.01 ETH
      const path = [tokenA, tokenB];
      const to = wallet.address;
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      // Act
      const tx = router.createSwapExactTokensForETHTransaction(amountIn, amountOutMin, path, to, deadline);

      // Assert
      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
      expect(tx.data).toBeDefined();
    });

    it("should include the correct function signature in the encoded data", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.weth;
      const amountIn = ethers.parseUnits("100", USDC_DECIMALS);
      const amountOutMin = ethers.parseEther("0.01");
      const path = [tokenA, tokenB];
      const to = wallet.address;
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      // Act
      const tx = router.createSwapExactTokensForETHTransaction(amountIn, amountOutMin, path, to, deadline);

      // Assert
      // Function signature for swapExactTokensForETH is the first 10 characters
      const functionSignature = tx.data!.toString().substring(0, 10);
      expect(functionSignature).toBe(SWAP_EXACT_TOKENS_FOR_ETH_SIGNATURE);
    });

    it("should handle large token amounts correctly", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.weth;
      const amountIn = ethers.parseUnits("1000000", 6); // 1 million USDC
      const amountOutMin = ethers.parseEther("0.01");
      const path = [tokenA, tokenB];
      const to = wallet.address;
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      // Act
      const tx = await router.createSwapExactTokensForETHTransaction(amountIn, amountOutMin, path, to, deadline);

      // Assert
      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
    });

    it("should handle minimum amountOutMin value", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.weth;
      const amountIn = ethers.parseUnits("100", 6);
      const amountOutMin = 1n; // Minimum possible value (1 wei)
      const path = [tokenA, tokenB];
      const to = wallet.address;
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      // Act
      const tx = router.createSwapExactTokensForETHTransaction(amountIn, amountOutMin, path, to, deadline);

      // Assert
      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
    });

    it("should create a transaction with the correct value field (0)", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.weth;
      const amountIn = ethers.parseUnits("100", 6);
      const amountOutMin = ethers.parseEther("0.01");
      const path = [tokenA, tokenB];
      const to = wallet.address;
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      // Act
      const tx = router.createSwapExactTokensForETHTransaction(amountIn, amountOutMin, path, to, deadline);

      // Assert
      expect(tx).toBeDefined();
      expect(tx.value).toBeUndefined();
    });
  });

  describe("createSwapExactTokensForTokensTransaction", () => {
    it("should create a valid transaction with correct parameters", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.dai || "0x6B175474E89094C44Da98b954EedeAC495271d0F"; // Fallback to mainnet DAI address
      const amountIn = ethers.parseUnits("100", 6); // 100 USDC
      const amountOutMin = ethers.parseUnits("99", 18); // Minimum 99 DAI (assuming 18 decimals)
      const path = [tokenA, tokenB];
      const to = wallet.address;
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      // Act
      const tx = router.createSwapExactTokensForTokensTransaction(amountIn, amountOutMin, path, to, deadline);

      // Assert
      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
      expect(tx.data).toBeDefined();
    });

    it("should include the correct function signature in the encoded data", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.dai || "0x6B175474E89094C44Da98b954EedeAC495271d0F";
      const amountIn = ethers.parseUnits("100", 6);
      const amountOutMin = ethers.parseUnits("99", 18);
      const path = [tokenA, tokenB];
      const to = wallet.address;
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      // Act
      const tx = router.createSwapExactTokensForTokensTransaction(amountIn, amountOutMin, path, to, deadline);

      // Assert
      // Function signature for swapExactTokensForTokens is the first 10 characters
      const functionSignature = tx.data!.toString().substring(0, 10);
      expect(functionSignature).toBe(SWAP_EXACT_TOKENS_FOR_TOKENS_SINGATURE);
    });

    it("should handle a multi-hop path correctly", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.weth;
      const tokenC = chainConfig.tokenAddresses.dai || "0x6B175474E89094C44Da98b954EedeAC495271d0F";
      const amountIn = ethers.parseUnits("100", 6);
      const amountOutMin = ethers.parseUnits("99", 18);
      const path = [tokenA, tokenB, tokenC]; // Multi-hop path through WETH
      const to = wallet.address;
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      // Act
      const tx = router.createSwapExactTokensForTokensTransaction(amountIn, amountOutMin, path, to, deadline);

      // Assert
      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
    });

    it("should handle extremely small token amounts", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.dai || "0x6B175474E89094C44Da98b954EedeAC495271d0F";
      const amountIn = 1n; // 1 wei of USDC
      const amountOutMin = 1n; // 1 wei of DAI
      const path = [tokenA, tokenB];
      const to = wallet.address;
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      // Act
      const tx = router.createSwapExactTokensForTokensTransaction(amountIn, amountOutMin, path, to, deadline);

      // Assert
      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
    });

    it("should work with a past deadline (will be rejected on-chain but transaction creation should work)", async () => {
      // Arrange
      const tokenA = chainConfig.tokenAddresses.usdc;
      const tokenB = chainConfig.tokenAddresses.dai || "0x6B175474E89094C44Da98b954EedeAC495271d0F";
      const amountIn = ethers.parseUnits("100", 6);
      const amountOutMin = ethers.parseUnits("99", 18);
      const path = [tokenA, tokenB];
      const to = wallet.address;
      const deadline = Math.floor(Date.now() / 1000) - 60; // 1 minute in the past

      // Act
      const tx = router.createSwapExactTokensForTokensTransaction(amountIn, amountOutMin, path, to, deadline);

      // Assert
      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
    });
  });
});

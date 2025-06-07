import { ethers, Wallet } from "ethers";
import { UniversalRouter } from "../../../../src/models/blockchain/universal-router/UniversalRouter";
import { NetworkForkManager } from "../../../helpers/network-fork";
import { ChainType, getChainConfig } from "../../../../src/config/chain-config";
import { getHardhatWallet_1 } from "../../../../src/hooks/useSetup";
import { getLowPoolKey } from "../../../../src/models/blockchain/uniswap-v4/uniswap-v4-utils";
import { CommandType } from "../../../../src/models/blockchain/universal-router/universal-router-types";
import { createMinimalErc20 } from "../../../../src/models/blockchain/ERC/erc-utils";
import { UniswapV2RouterV2 } from "../../../../src/models/blockchain/uniswap-v2";

describe("UniversalRouter V4 Trade Tests | ETH", () => {
  const chain = ChainType.ETH;
  const router: UniversalRouter = new UniversalRouter(chain);
  const chainConfig = getChainConfig(chain);

  let wallet: Wallet;

  beforeAll(async () => {
    await NetworkForkManager.startHardhatFork(chain);
  }, 20_000);

  beforeEach(() => {
    wallet = getHardhatWallet_1();
  });

  afterAll(async () => {
    await NetworkForkManager.cleanupHardhatFork();
  });

  describe("Execute", () => {
    it("should buy USDC when swapping ETH for USDC via V4 swap", async () => {
      // Arrange
      const usdc = await createMinimalErc20(chainConfig.tokenAddresses.usdc, wallet.provider!);

      const inputToken = ethers.ZeroAddress; // ETH
      const outputToken = usdc.getTokenAddress();
      const inputAmount = ethers.parseEther("1");
      const minOutputAmount = 0n;
      const recipient = wallet.address;

      const poolKey = getLowPoolKey(inputToken, outputToken);
      const zeroForOne = poolKey.currency0 === inputToken;

      const command = CommandType.V4_SWAP;
      const input = router.encodeV4SwapInput(poolKey, zeroForOne, inputAmount.toString(), minOutputAmount, recipient);
      const deadline = Math.floor(Date.now() / 1000) + 1200;

      // Act
      const tx = await router.createExecuteTransaction(command, [input], deadline);
      tx.value = ethers.parseEther("10");
      const txResponse = await wallet.sendTransaction(tx);
      const txReceipt = await txResponse.wait();

      // Assert
      if (!txReceipt) throw new Error("Transaction failed");
      expect(txReceipt.status).toBe(1);
      const usdcBalance = await usdc.getFormattedTokenBalance(recipient);
      expect(usdcBalance).toBeGreaterThan(0n);
    });

    it("should throw error when using Permit without PermitTransferFrom", async () => {
      // Arrange
      // Act
      // Assert
    });

    it("should throw error when using PermitTransferFrom without Permit", async () => {
      // Arrange
      const usdc = await createMinimalErc20(chainConfig.tokenAddresses.usdc, wallet.provider!);
      const uniswapV2Router = new UniswapV2RouterV2(chain);

      //await uniswapV2Router.swapEthInUsdForToken(wallet, usdc, 200);

      const usdcBalanceBefore = await usdc.getFormattedTokenBalance(wallet.address);
      expect(usdcBalanceBefore).toBeGreaterThan(0n);

      const inputToken = usdc.getTokenAddress();
      const outputToken = ethers.ZeroAddress;
      const inputAmount = ethers.parseUnits("150", usdc.getDecimals());
      const minOutputAmount = 0n;
      const recipient = wallet.address;

      const poolKey = getLowPoolKey(inputToken, outputToken);
      const zeroForOne = poolKey.currency0 === inputToken;
    });

    it("should throw error when swapping USDC to ETH with correct execute inputs and no USDC balance", async () => {
      // Arrange
      const usdc = await createMinimalErc20(chainConfig.tokenAddresses.usdc, wallet.provider!);
      const uniswapV2Router = new UniswapV2RouterV2(chain);

      //await uniswapV2Router.swapEthInUsdForToken(wallet, usdc, 200);

      const usdcBalanceBefore = await usdc.getFormattedTokenBalance(wallet.address);
      expect(usdcBalanceBefore).toBeGreaterThan(0n);

      const inputToken = usdc.getTokenAddress();
      const outputToken = ethers.ZeroAddress;
      const inputAmount = ethers.parseUnits("150", usdc.getDecimals());
      const minOutputAmount = 0n;
      const recipient = wallet.address;

      const poolKey = getLowPoolKey(inputToken, outputToken);
      const zeroForOne = poolKey.currency0 === inputToken;
    });

    it("should throw error when swapping USDC to ETH with correct execute inputs and no permit allowance", async () => {
      // Arrange
      // Act
      // Assert
    });

    it("should sell USDC when swapping USDC for ETH with Permit and PermitTransferFrom and V4 Swap", async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});

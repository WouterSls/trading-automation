import { ethers, Wallet } from "ethers";
import { UniversalRouter } from "../../../src/models/universal-router/UniversalRouter";
import { NetworkForkManager } from "../../helpers/network-fork";
import { ChainType, getChainConfig } from "../../../src/config/chain-config";
import { getHardhatWallet_1 } from "../../../src/hooks/useSetup";
import { getLowPoolKey } from "../../../src/models/uniswap-v4/uniswap-v4-utils";
import { CommandType } from "../../../src/models/universal-router/universal-router-types";
import { createMinimalErc20, decodeLogs } from "../../../src/lib/utils";
import { ERC20 } from "../../../src/models/ERC/ERC20";
import { UniswapV2Router } from "../../../src/models/uniswap-v2/UniswapV2Router";
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

  describe("Trades", () => {
    it("ETH -> USDC trade", async () => {
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
      const tx = await router.createExecuteTransaction(wallet, command, [input], deadline);
      tx.value = ethers.parseEther("10");
      const txResponse = await wallet.sendTransaction(tx);
      const txReceipt = await txResponse.wait();

      // Assert
      if (!txReceipt) throw new Error("Transaction failed");
      expect(txReceipt.status).toBe(1);
      const usdcBalance = await usdc.getFormattedTokenBalance(recipient);
      expect(usdcBalance).toBeGreaterThan(0n);
    });

    it("USDC -> ETH trade", async () => {
      // Arrange
      const usdc = await createMinimalErc20(chainConfig.tokenAddresses.usdc, wallet.provider!);
      const uniswapV2Router = new UniswapV2Router(chain);
      await uniswapV2Router.swapEthInUsdForToken(wallet, usdc, 200);
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
  });
});

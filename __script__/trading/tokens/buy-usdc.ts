import { ethers, Wallet } from "ethers";
import { getChainConfig, mapNetworkNameToChainType } from "../../../src/config/chain-config";
import { UniswapV2RouterV2 } from "../../../src/smartcontracts/uniswap-v2";
import { TRADING_CONFIG } from "../../../src/config/trading-config";
import { getHardhatWallet_1 } from "../../../src/hooks/useSetup";

async function buyUsdcWithETH(wallet: Wallet, ethInput: number) {
  const network = await wallet.provider?.getNetwork();

  if (!network) {
    throw new Error("No network linked to wallet");
  }

  const chain = mapNetworkNameToChainType(network!.name);
  if (!chain) {
    throw new Error("No chain config for network: " + network!.name);
  }

  console.log("Buying usdc on chain:", chain);
  console.log("address:", wallet.address);

  const chainConfig = getChainConfig(chain);
  const uniV2Router = new UniswapV2RouterV2(chain);

  const inputAmount = ethers.parseEther(ethInput.toString());
  const minAmountOut = 0n;
  const path = [chainConfig.tokenAddresses.weth, chainConfig.tokenAddresses.usdc];
  const recipient = wallet.address;
  const deadline = TRADING_CONFIG.DEADLINE;

  const tx = await uniV2Router.createSwapExactETHForTokensTransaction(minAmountOut, path, recipient, deadline);
  tx.value = inputAmount;

  const txResponse = await wallet.sendTransaction(tx);
  const txReceipt = await txResponse.wait();

  if (!txReceipt) {
    throw new Error("No blockchain confirmation");
  }
  console.log("Purchase success");
}

if (require.main === module) {
  const hardhatWallet = getHardhatWallet_1();
  const defaultETHAmountIn = 1;
  buyUsdcWithETH(hardhatWallet, defaultETHAmountIn).catch(console.error);
}

export { buyUsdcWithETH };

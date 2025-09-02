import { ethers, Wallet, TransactionRequest, Contract } from "ethers";
import { getHardhatWallet_1 } from "../../src/hooks/useSetup";
import { ChainType, getChainConfig } from "../../src/config/chain-config";
import { ERC20, createMinimalErc20 } from "../../src/smartcontracts/ERC/_index";
import { UniswapV2RouterV2 } from "../../src/smartcontracts/uniswap-v2/UniswapV2RouterV2";
import { UniswapV3SwapRouterV2, UniswapV3QuoterV2 } from "../../src/smartcontracts/uniswap-v3/index";
import { FeeAmount } from "../../src/smartcontracts/uniswap-v3/uniswap-v3-types";
import { buyUsdcWithETH } from "../trading/tokens/buy-usdc";

export async function forkTesting(wallet: Wallet, chain: ChainType) {
  const chainConfig = getChainConfig(chain);

  const network = await wallet.provider!.getNetwork();
  console.log("--------------------------------");
  console.log(`Network: ${network.name}`);
  console.log(`ChainType: ${chain}`);
  console.log("--------------------------------");

  const walletAddress = wallet.address;
  const walletBalance = await wallet.provider!.getBalance(walletAddress);

  console.log(`Wallet ETH balance: ${ethers.formatEther(walletBalance)}`);

  const usdcAddress = chainConfig.tokenAddresses.usdc;
  const wethAddress = chainConfig.tokenAddresses.weth;

  const usdc: ERC20 | null = await createMinimalErc20(usdcAddress, wallet.provider!);
  const weth: ERC20 | null = await createMinimalErc20(wethAddress, wallet.provider!);

  if (!usdc || !weth) throw new Error("Error during ERC20 token creation");

  console.log("Wallet token info:");
  console.log(`\t${usdc.getName()} (${usdc.getSymbol()}) | ${usdcAddress} `);
  console.log(`\tbalance: ${await usdc.getFormattedTokenBalance(walletAddress)}`);

  console.log(`\t${weth.getName()} (${weth.getSymbol()}) | ${wethAddress} `);
  console.log(`\tbalance: ${ethers.formatEther(await weth.getFormattedTokenBalance(walletAddress))}`);
}

if (require.main === module) {
  const hardhatWallet = getHardhatWallet_1();
  const chain = ChainType.ETH;

  forkTesting(hardhatWallet, chain).catch(console.error);
}

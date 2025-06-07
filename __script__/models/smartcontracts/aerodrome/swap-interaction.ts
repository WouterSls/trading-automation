import { ethers } from "ethers";
import { ChainType, getChainConfig } from "../../../../src/config/chain-config";
import { getHardhatWallet_1 } from "../../../../src/hooks/useSetup";
import { TradeRoute } from "../../../../src/models/smartcontracts/aerodrome/aerodrome-types";
import { AerodromeRouter } from "../../../../src/models/smartcontracts/aerodrome/AerodromeRouter";
import { createMinimalErc20 } from "../../../../src/models/smartcontracts/ERC/erc-utils";

export async function swapInteraction() {
  const chain = ChainType.BASE;
  const chainConfig = getChainConfig(chain);
  const wallet = getHardhatWallet_1();

  const router = new AerodromeRouter(chain);

  const ethAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
  const usdcAddress = chainConfig.tokenAddresses.usdc;
  const daiAddress = chainConfig.tokenAddresses.dai;
  const wethAddress = chainConfig.tokenAddresses.weth;

  const usdc = await createMinimalErc20(usdcAddress, wallet.provider!);
  const dai = await createMinimalErc20(daiAddress, wallet.provider!);
  const weth = await createMinimalErc20(wethAddress, wallet.provider!);

  const usdcBalance = await usdc.getFormattedTokenBalance(wallet.address);
  const daiBalance = await dai.getFormattedTokenBalance(wallet.address);
  const wethBalance = await weth.getFormattedTokenBalance(wallet.address);
  const ethBalance = await wallet.provider!.getBalance(wallet.address);

  console.log("--------------------------------");
  console.log("Chain", chain);
  console.log("--------------------------------");
  console.log("Wallet Info:");
  console.log("\twallet address", wallet.address);
  console.log("\tETH balance", ethers.formatEther(ethBalance));
  console.log(`\t${usdc.getSymbol()} balance: ${usdcBalance}`);
  console.log(`\t${dai.getSymbol()} balance: ${daiBalance}`);
  console.log(`\t${weth.getSymbol()} balance: ${wethBalance}`);
  console.log();

  throw new Error("Stop");
  const singleHop: TradeRoute = {
    from: wethAddress,
    to: usdcAddress,
    stable: false,
    factory: router.getFactoryAddress(),
  };

  const multiHop: TradeRoute[] = [
    {
      from: wethAddress,
      to: usdcAddress,
      stable: false,
      factory: router.getFactoryAddress(),
    },
    {
      from: usdcAddress,
      to: daiAddress,
      stable: true,
      factory: router.getFactoryAddress(),
    },
  ];

  const inputAmount = ethers.parseEther("1");
  const amountOut = await router.getAmountsOut(wallet, inputAmount, multiHop);
  const formattedAmountOut = ethers.formatUnits(amountOut, 6);
  console.log("Amount out:", formattedAmountOut);

  const deadline = Math.floor(Date.now() / 1000) + 1200;
  const tx = await router.createSwapExactETHForTokensTransaction(wallet, 0n, multiHop, wallet.address, deadline);

  tx.value = inputAmount;

  const txResponse = await wallet.sendTransaction(tx);
  const txReceipt = await txResponse.wait();
  if (!txReceipt) throw new Error("Transaction failed");
  console.log("Transaction confirmed!");
}

if (require.main === module) {
  swapInteraction().catch(console.error);
}

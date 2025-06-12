import { ethers } from "ethers";
import { ChainType, getChainConfig } from "../../src/config/chain-config";
import { getHardhatWallet_1 } from "../../src/hooks/useSetup";
import { Permit2 } from "../../src/models/smartcontracts/permit2/Permit2";
import { createMinimalErc20 } from "../../src/models/smartcontracts/ERC/erc-utils";

async function permit2Check() {
  const chain: ChainType = ChainType.ETH;
  const wallet = getHardhatWallet_1();
  const chainConfig = getChainConfig(chain);
  const blockNumber = await wallet.provider!.getBlockNumber();

  const usdcAddress = chainConfig.tokenAddresses.usdc;
  const wethAddress = chainConfig.tokenAddresses.weth;
  const usdc = await createMinimalErc20(usdcAddress, wallet.provider!);
  const weth = await createMinimalErc20(wethAddress, wallet.provider!);

  const usdcBalance = await usdc.getFormattedTokenBalance(wallet.address);
  const wethBalance = await weth.getFormattedTokenBalance(wallet.address);
  const ethBalance = await wallet.provider!.getBalance(wallet.address);

  console.log("--------------------------------");
  console.log("Chain", chain);
  console.log("--------------------------------");
  console.log("Block:", blockNumber);
  console.log("Wallet Info:");
  console.log("\twallet address", wallet.address);
  console.log("\tETH balance", ethers.formatEther(ethBalance));
  console.log(`\t${usdc.getSymbol()} balance: ${usdcBalance}`);
  console.log(`\t${weth.getSymbol()} balance: ${wethBalance}`);
  console.log();

  const permit2 = new Permit2(chain);
}

async function approvalStrategies() {
  await permit2Check();
}

if (require.main === module) {
  approvalStrategies().catch(console.error);
}

export { approvalStrategies };

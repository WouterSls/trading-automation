import { ethers, Wallet } from "ethers";
import { ChainType } from "../../../../src/config/chain-config";

import { getChainConfig } from "../../../../src/config/chain-config";
import { getBaseWallet_1, getEthWallet_1 } from "../../../../src/hooks/useSetup";
import { validateNetwork } from "../../../../src/lib/utils";
import { UniswapV4Quoter } from "../../../../src/models/smartcontracts/uniswap-v4/UniswapV4Quoter";
import { FeeAmount } from "../../../../src/models/smartcontracts/uniswap-v4/uniswap-v4-types";

export async function quoterInteraction(chain: ChainType, wallet: Wallet) {
  await validateNetwork(wallet, chain);

  const chainConfig = getChainConfig(chain);

  const USDC_ADDRESS = chainConfig.tokenAddresses.usdc;
  const WETH_ADDRESS = chainConfig.tokenAddresses.weth;
  const DAI_ADDRESS = chainConfig.tokenAddresses.dai;

  const quoterAddress = chainConfig.uniswap.v3.quoterV2Address;

  console.log("--------------------------------");
  console.log("Chain", chain);
  console.log("--------------------------------");


  console.log("wallet address", wallet.address);
  console.log("quoter address", quoterAddress);

  const quoter = new UniswapV4Quoter(chain);

}

if (require.main === module) {
  const base = ChainType.BASE;
  const baseWallet = getBaseWallet_1();

  const eth = ChainType.ETH;
  const ethWallet = getEthWallet_1();

  quoterInteraction(eth, ethWallet).catch(console.error);
}


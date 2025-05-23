import { ethers, Wallet } from "ethers";
import { getEthWallet_1, getHardhatWallet_1 } from "../../src/hooks/useSetup";
import { createMinimalErc20 } from "../../src/models/blockchain/ERC/erc-utils";
import { TraderFactory } from "../../src/models/trading/TraderFactory";
import { GeckoTerminalApi } from "../../src/services/GeckoTerminalApi";
import { ChainType, getChainConfig } from "../../src/config/chain-config";
import { BuyTrade, BuyTradeCreationDto, InputType, OutputToken } from "../../src/models/trading/types/_index";

async function sellToken(inputAmount: number, tokenAddress: string, wallet: Wallet) {
  const trader = await TraderFactory.createTrader(wallet);
  const trade: BuyTradeCreationDto = {
    tradeType: "BUY",
    chain: trader.getChain(),
    inputType: InputType.ETH,
    inputToken: ethers.ZeroAddress,
    inputAmount: inputAmount.toString(),
    outputToken: OutputToken.ETH,
  };

  const erc20 = await createMinimalErc20(tokenAddress, wallet.provider!);
  const geckoTerminalApi = new GeckoTerminalApi();
  const price = await geckoTerminalApi.getTokenUsdPrice(trader.getChain(), tokenAddress);

  console.log("----------------BUYING TOKEN----------------");
  console.log(`${erc20.getName()} (network: ${trader.getChain()} | $${price})`);
  console.log(`input: ${trade.inputType}`);
  console.log(`input Amount: ${trade.inputAmount}`);
  console.log("------------------------------------------");

  console.log("buying...");
  const buyTrade: BuyTrade = await trader.buy(trade);

  console.log();
  console.log();
  console.log("--------------------Trade--------------------");
  console.log(`tx: ${buyTrade.getTransactionHash()}`);
  console.log(`tokens received: ${buyTrade.getFormattedTokensReceived()} ${trade.outputToken}`);

  //console.log("buyTrade", buyTrade);

  //console.log("transactionInfo", transactionInfo);
  //console.log("tx", tx);

  //const approveTxResponse = await trader.simulateTransaction(tx);
  //console.log("approveTxResponse", approveTxResponse);
  /**
  const tradeSuccessInfo = await router.swapEthInUsdForToken(erc20, usdAmount);

  console.log("Trade successful!");
  console.log("tx hash: ", tradeSuccessInfo.transactionHash);
  return tradeSuccessInfo;
 */
}

if (require.main === module) {
  const chainConfig = getChainConfig(ChainType.ETH);
  const USDC_ADDRESS = chainConfig.tokenAddresses.usdc;
  const UNI_ADDRESS = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";
  const INPUT_AMOUNT = 1;
  const wallet = getHardhatWallet_1();

  sellToken(INPUT_AMOUNT, UNI_ADDRESS, wallet).catch(console.error);
}

export { sellToken };

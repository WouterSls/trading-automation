import { ethers, Wallet } from "ethers";
import { getAlchemyApi, getHardhatWallet_1 } from "../../src/hooks/useSetup";
import { createMinimalErc20 } from "../../src/models/blockchain/ERC/erc-utils";
import { TraderFactory } from "../../src/models/trading/TraderFactory";
import { GeckoTerminalApi } from "../../src/services/GeckoTerminalApi";
import { ChainType, getChainConfig } from "../../src/config/chain-config";
import { BuyTrade, BuyTradeCreationDto, InputType } from "../../src/models/trading/types/_index";

async function buyToken(wallet: Wallet, trade: BuyTradeCreationDto) {
  const trader = await TraderFactory.createTrader(wallet);
  const outputToken = await createMinimalErc20(trade.outputToken, wallet.provider!);
  const geckoTerminalApi = new GeckoTerminalApi();
  const alchemyApi = getAlchemyApi();

  const price = await geckoTerminalApi.getTokenUsdPrice(trader.getChain(), trade.outputToken);
  const ethBalance = await wallet.provider!.getBalance(wallet.address);
  const tokens = await alchemyApi.getAllTokensOwnedByWallet(wallet.address);

  console.log("----------------WALLET INFO----------------");
  console.log(`${wallet.address} (network: ${trader.getChain()})`);
  console.log(`ETH: ${ethers.formatEther(ethBalance)}`);
  console.log();

  console.log("----------------BUYING TOKEN----------------");
  console.log(`${outputToken.getName()} (network: ${trader.getChain()} | $${price})`);
  console.log(`Owned Amount: ${await outputToken.getFormattedTokenBalance(wallet.address)}`);
  console.log(`Input: ${trade.inputType}`);
  console.log(`Input Amount: ${trade.inputAmount}`);
  console.log("------------------------------------------");

  throw new Error("Stop");
  console.log("buying...");
  const buyTrade: BuyTrade = await trader.buy(trade);

  console.log();
  console.log();
  console.log("--------------------Trade--------------------");
  console.log(`tx: ${buyTrade.getTransactionHash()}`);
  console.log(`Token (${trade.outputToken})`);
  console.log(`\tAmount received: ${buyTrade.getFormattedTokensReceived()}`);

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
  const wallet = getHardhatWallet_1();
  const chain = ChainType.ETH;
  const chainConfig = getChainConfig(chain);

  const USDC_ADDRESS = chainConfig.tokenAddresses.usdc;
  const UNI_ADDRESS = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";
  const INPUT_AMOUNT = 100;

  const trade: BuyTradeCreationDto = {
    tradeType: "BUY",
    chain: chain,
    inputType: InputType.USD,
    inputToken: ethers.ZeroAddress,
    inputAmount: INPUT_AMOUNT.toString(),
    outputToken: UNI_ADDRESS,
  };

  buyToken(wallet, trade).catch(console.error);
}

export { buyToken };

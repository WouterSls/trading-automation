import { ethers, Wallet } from "ethers";
import { getHardhatWallet_1 } from "../../../src/hooks/useSetup";
import { createMinimalErc20 } from "../../../src/models/smartcontracts/ERC/erc-utils";
import { TraderFactory } from "../../../src/models/trading/TraderFactory";
import { GeckoTerminalApi } from "../../../src/services/GeckoTerminalApi";
import { ChainType, getChainConfig, getOutputTokenAddress } from "../../../src/config/chain-config";
import { OutputToken, SellTrade, SellTradeCreationDto } from "../../../src/models/trading/types/_index";

async function sellToken(wallet: Wallet, trade: SellTradeCreationDto) {
  const geckoTerminalApi = new GeckoTerminalApi();
  const trader = await TraderFactory.createTrader(wallet);
  const chainConfig = getChainConfig(trade.chain);
  const USDC_ADDRESS = chainConfig.tokenAddresses.usdc;
  const WETH_ADDRESS = chainConfig.tokenAddresses.weth;
  const usdc = await createMinimalErc20(USDC_ADDRESS, wallet.provider!);

  const ethBalance = await wallet.provider!.getBalance(wallet.address);
  const usdcBalance = await usdc.getFormattedTokenBalance(wallet.address);

  console.log("=== WALLET INFO ===");
  console.log(`${wallet.address} (network: ${trader.getChain()})`);
  console.log(`ETH: ${ethers.formatEther(ethBalance)}`);
  console.log(`USDC: ${usdcBalance}`);
  console.log();

  const inputToken =
    trade.inputToken === ethers.ZeroAddress
      ? await createMinimalErc20(WETH_ADDRESS, wallet.provider!)
      : await createMinimalErc20(trade.inputToken, wallet.provider!);

  let outputTokenSymbol;
  const outputTokenAddress = getOutputTokenAddress(trade.chain, trade.outputToken);
  if (outputTokenAddress === ethers.ZeroAddress) {
    outputTokenSymbol = "ETH";
  } else {
    const outputToken = await createMinimalErc20(outputTokenAddress, wallet.provider!);
    outputTokenSymbol = outputToken.getSymbol();
  }

  const price = await geckoTerminalApi.getTokenUsdPrice(trader.getChain(), trade.inputToken);

  console.log("=== SELLING TOKEN ===");
  console.log(`${inputToken.getName()} (network: ${trader.getChain()} | live price: $${price})`);
  console.log(`Owned Amount: ${await inputToken.getFormattedTokenBalance(wallet.address)}`);
  console.log(`Selling: ${trade.inputAmount}`);
  console.log(`Output: ${trade.outputToken}`);
  console.log(`Tradingpoint Price: ${trade.tradingPointPrice}`);
  console.log();

  console.log("selling...");
  const sellTrade: SellTrade = await trader.sell(trade);

  console.log(trade);
  console.log();
  console.log("=== FINAL TRADE SUMMARY ===");
  console.log(`Transaction Hash: ${sellTrade.getTransactionHash()}`);
  console.log(`Block Number: ${sellTrade.getConfirmedBlock()}`);
  console.log(`Gas Cost: ${sellTrade.getGasCost()} ETH`);
  console.log(`ETH Price: $${sellTrade.getEthPriceUsd()}`);
  console.log(
    `Calculated Token Price: $${parseFloat(sellTrade.getTokenPriceUsd()).toFixed(6)} per ${inputToken.getSymbol()}`,
  );
  console.log("-------SPENT----------");
  console.log(`ETH Spent: ${sellTrade.getEthSpent()} ETH`);
  console.log(`Formatted Tokens Spent: ${sellTrade.getFormattedTokensSpent()} ${inputToken.getSymbol()}`);
  console.log("-------RECEIVED----------");
  console.log(`ETH Received: ${sellTrade.getEthReceived()}`);
  console.log(`Formatted Tokens Received: ${sellTrade.getFormattedTokensReceived()} ${outputTokenSymbol}`);
  console.log("=== TRADE DATA EXTRACTION COMPLETE ===\n");
}

if (require.main === module) {
  const chain = ChainType.ETH;
  const chainConfig = getChainConfig(chain);
  const USDC_ADDRESS = chainConfig.tokenAddresses.usdc;
  const UNI_ADDRESS = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";
  const INPUT_AMOUNT = 20;
  const wallet = getHardhatWallet_1();

  const trade: SellTradeCreationDto = {
    tradeType: "SELL",
    chain: chain,
    inputToken: UNI_ADDRESS,
    inputAmount: INPUT_AMOUNT.toString(),
    outputToken: OutputToken.ETH,
    tradingPointPrice: "5.8",
  };

  sellToken(wallet, trade).catch(console.error);
}

export { sellToken };

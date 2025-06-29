import { ethers, Wallet } from "ethers";
import { getHardhatWallet_1 } from "../../../src/hooks/useSetup";
import { createMinimalErc20 } from "../../../src/models/smartcontracts/ERC/erc-utils";
import { TraderFactory } from "../../../src/models/trading/TraderFactory";
import { GeckoTerminalApi } from "../../../src/services/GeckoTerminalApi";
import { ChainType, getChainConfig } from "../../../src/config/chain-config";
import { BuyTrade, BuyTradeCreationDto, InputType } from "../../../src/models/trading/types/_index";
import { TradeCreationDto } from "../../../src/models/trading/types/dto/TradeCreationDto";

async function buyToken(wallet: Wallet, trade: TradeCreationDto) {
  const trader = await TraderFactory.createTrader(wallet);
  const chainConfig = getChainConfig(trade.chain);
  const USDC_ADDRESS = chainConfig.tokenAddresses.usdc;
  const usdc = await createMinimalErc20(USDC_ADDRESS, wallet.provider!);
  const outputToken = await createMinimalErc20(trade.outputToken, wallet.provider!);
  const geckoTerminalApi = new GeckoTerminalApi();

  const price = await geckoTerminalApi.getTokenUsdPrice(trader.getChain(), trade.outputToken);
  const ethBalance = await wallet.provider!.getBalance(wallet.address);
  const usdcBalance = await usdc.getFormattedTokenBalance(wallet.address);

  console.log("=== WALLET INFO ===");
  console.log(`${wallet.address} (network: ${trader.getChain()})`);
  console.log(`ETH: ${ethers.formatEther(ethBalance)}`);
  console.log(`USDC: ${usdcBalance}`);
  console.log();

  console.log("=== BUYING TOKEN ===");
  console.log(`${outputToken.getName()} (network: ${trader.getChain()} | $${price})`);
  console.log(`Owned Amount: ${await outputToken.getFormattedTokenBalance(wallet.address)}`);
  console.log(`Input: ${trade.inputType}`);
  console.log(`Input Amount: ${trade.inputAmount}`);
  console.log();

  console.log("buying...");
  const buyTrade: BuyTrade = await trader.buy(trade);

  console.log();
  console.log("=== FINAL TRADE SUMMARY ===");
  console.log(`Transaction Hash: ${buyTrade.getTransactionHash()}`);
  console.log(`Block Number: ${buyTrade.getConfirmedBlock()}`);
  console.log(`Gas Cost: ${buyTrade.getGasCost()} ETH`);
  console.log(`ETH Spent: ${buyTrade.getEthSpent()} ETH`);
  console.log(`Raw Tokens Received: ${buyTrade.getRawTokensReceived()}`);
  console.log(`Formatted Tokens Received: ${buyTrade.getFormattedTokensReceived()} ${outputToken.getSymbol()}`);
  console.log(`Token Price: $${parseFloat(buyTrade.getTokenPriceUsd()).toFixed(6)} per ${outputToken.getSymbol()}`);
  console.log(`ETH Price: $${buyTrade.getEthPriceUsd()}`);
  console.log("=== TRADE DATA EXTRACTION COMPLETE ===\n");
}

if (require.main === module) {
  const wallet = getHardhatWallet_1();
  const chain = ChainType.ETH;

  const UNI_ADDRESS = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";
  const INPUT_AMOUNT = 1;

  const trade: TradeCreationDto = {
    chain: chain,
    inputType: InputType.ETH,
    inputToken: ethers.ZeroAddress,
    inputAmount: INPUT_AMOUNT.toString(),
    outputToken: UNI_ADDRESS,
  };

  buyToken(wallet, trade).catch(console.error);
}

export { buyToken };

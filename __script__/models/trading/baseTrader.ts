import { ethers, Wallet } from "ethers";
import { getHardhatWallet_1 } from "../../../src/hooks/useSetup";
import { createMinimalErc20 } from "../../../src/models/blockchain/ERC/erc-utils";
import { TraderFactory } from "../../../src/models/trading/TraderFactory";
import { GeckoTerminalApi } from "../../../src/services/GeckoTerminalApi";
import { ChainType, getChainConfig } from "../../../src/config/chain-config";
import { BuyTrade, BuyTradeCreationDto, InputType } from "../../../src/models/trading/types/_index";
import { ITradingStrategy } from "../../../src/models/trading/ITradingStrategy";

async function baseTraderInteraction(wallet: Wallet) {
  const chain = ChainType.BASE;
  const chainConfig = getChainConfig(chain);

  const network = await wallet.provider?.getNetwork();
  if (network?.chainId !== chainConfig.id) {
    throw new Error("Incorrect chain for wallet instance");
  }

  const trader = await TraderFactory.createTrader(wallet);
  if (trader.getChain() !== ChainType.BASE) {
    throw new Error("Wallet initialization issue");
  }

  const UNI_ADDRESS = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";
  const INPUT_AMOUNT = 1;
  const trade: BuyTradeCreationDto = {
    tradeType: "BUY",
    chain: chain,
    inputType: InputType.ETH,
    inputToken: ethers.ZeroAddress,
    inputAmount: INPUT_AMOUNT.toString(),
    outputToken: UNI_ADDRESS,
  };

  const ethBalance = await wallet.provider?.getBalance(wallet.address);
  console.log("=== WALLET INFO ===");
  console.log(`${wallet.address} (network: ${trader.getChain()})`);
  console.log(`ETH: ${ethers.formatEther(ethBalance!)}`);
  console.log();

  const AERO_ADDRESS = "0x940181a94A35A4569E4529A3CDfB74e38FD98631";
  const GAME_ADDRESS = "0x1c4cca7c5db003824208adda61bd749e55f463a3";
  const game = await createMinimalErc20(GAME_ADDRESS, wallet.provider!);
  console.log(`${game.getName()} | ${game.getTokenAddress()}`);

  const strategies = trader.getStrategies();
  for (const strat of strategies) {
    console.log(strat.getName());
    const price = await strat.getEthUsdcPrice(wallet);
    const gamePrice = await strat.getTokenUsdcPrice(wallet, game.getTokenAddress());
    //const ethLiq = await strat.getTokenEthLiquidity(wallet, game.getTokenAddress());
    console.log(`\tETH/USDC: ${price}`);
    // TODO: GAME uses virtual as intermediary token & not weth
    console.log(`\tGAME/USDC: ${gamePrice}`);
    //console.log(`\tGAME eth liquidity depth: ${ethLiq}`);
  }
}

if (require.main === module) {
  const wallet = getHardhatWallet_1();

  baseTraderInteraction(wallet);
}

export { baseTraderInteraction };

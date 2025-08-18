import { ChainType } from "../../../src/config/chain-config";
import { InputType} from "../../../src/trading/types/trading-types";
import { TradeCreationDto } from "../../../src/trading/types/_index";
import { Trader } from "../../../src/trading/Trader";
import { ethers, Wallet } from "ethers";
import { getChainConfig } from "../../../src/config/chain-config";
import { TraderFactory } from "../../../src/trading/TraderFactory";
import { getEthWallet_1 } from "../../../src/hooks/useSetup";

async function simpleWagmiTest() {
  const chain = ChainType.ETH;
  const chainConfig = getChainConfig(chain);
  
  const ethWallet = getEthWallet_1();
  // Create a wallet (doesn't need funds for quoting)
  
  const trader = await TraderFactory.createTrader(ethWallet);
  const wamgiAddress = "0x92cc36d66e9d739d50673d1f27929a371fb83a67";

  console.log("=== SIMPLE WAGMI ROUTING TEST ===");
  console.log(`Chain: ${chain}`);
  console.log(`WAGMI: ${wamgiAddress}`);
  console.log(`USDC: ${chainConfig.tokenAddresses.usdc}`);
  console.log(`WETH: ${chainConfig.tokenAddresses.weth}`);
  console.log();

  // Test different amounts to find the minimum viable swap
  const testAmounts = [
    "10000000",    // 10M WAGMI
    "1000000",     // 1M WAGMI  
    "100000",      // 100K WAGMI
    "10000",       // 10K WAGMI
    "1702000",     // 1.7M WAGMI (current test)
    "1702",        // Original amount
  ];

  for (const amount of testAmounts) {
    console.log(`\n--- Testing with ${amount} WAGMI ---`);
    
    const trade: TradeCreationDto = {
      chain: ChainType.ETH,
      inputToken: wamgiAddress,
      inputType: InputType.TOKEN,
      inputAmount: amount,
      outputToken: chainConfig.tokenAddresses.usdc,
    };

    try {
      const quote = await trader.quote(trade);
      console.log(`✅ Success! Output: ${quote.outputAmount} USDC`);
      console.log(`Strategy: ${quote.strategy}`);
      
      if (quote.route && quote.route.path && quote.route.path.length > 0) {
        console.log(`Path: ${quote.route.path.join(' → ')}`);
        if (quote.route.amountOut > 0n) {
          console.log(`🎯 FOUND WORKING AMOUNT: ${amount} WAGMI`);
          break;
        }
      }
    } catch (error) {
      console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

if (require.main === module) {
  simpleWagmiTest().catch(console.error);
}
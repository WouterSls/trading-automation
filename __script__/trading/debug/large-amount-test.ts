import { ethers } from "ethers";
import { ChainType, getChainConfig } from "../../../src/config/chain-config";
import { getEthWallet_1 } from "../../../src/hooks/useSetup";
import { UniswapV2RouterV2 } from "../../../src/smartcontracts/uniswap-v2/UniswapV2RouterV2";

async function testLargeAmount() {
  const ethWallet = getEthWallet_1();
  const chainConfig = getChainConfig(ChainType.ETH);
  
  console.log("=== LARGE AMOUNT TEST ===");
  
  const wagmiAddress = "0x92cc36d66e9d739d50673d1f27929a371fb83a67";
  const usdcAddress = chainConfig.tokenAddresses.usdc;
  const wethAddress = chainConfig.tokenAddresses.weth;
  
  const router = new UniswapV2RouterV2(ChainType.ETH);
  
  // Test with much larger amounts
  const testAmounts = [
    "10000000000", // 10 billion WAGMI
    "100000000000", // 100 billion WAGMI
    "1000000000000", // 1 trillion WAGMI
  ];
  
  for (const amountStr of testAmounts) {
    console.log(`\n=== Testing with ${amountStr} WAGMI ===`);
    const amountIn = ethers.parseUnits(amountStr, 18);
    console.log(`Amount In: ${amountIn.toString()}`);
    
    // Test WAGMI -> WETH -> USDC
    const path = [wagmiAddress, wethAddress, usdcAddress];
    try {
      const amounts = await router.getAmountsOut(ethWallet, amountIn, path);
      console.log(`Raw amounts: [${amounts.map(a => a.toString()).join(', ')}]`);
      
      const wethIntermediate = amounts[1];
      const usdcOutput = amounts[2];
      
      console.log(`WETH intermediate: ${ethers.formatEther(wethIntermediate)} WETH`);
      console.log(`USDC output: ${ethers.formatUnits(usdcOutput, 6)} USDC`);
      
      if (usdcOutput > 0n) {
        console.log("✅ SUCCESS: Non-zero USDC output!");
        break;
      } else {
        console.log("❌ Still getting 0 USDC output");
      }
    } catch (error) {
      console.error(`Error:`, error);
    }
  }
  
  console.log("\n=== Testing reverse: what WETH amount gives meaningful USDC? ===");
  
  // Test different WETH amounts to see what gives meaningful USDC
  const wethTestAmounts = ["0.001", "0.01", "0.1", "1.0"];
  
  for (const wethAmountStr of wethTestAmounts) {
    console.log(`\nTesting ${wethAmountStr} WETH -> USDC:`);
    const wethAmount = ethers.parseEther(wethAmountStr);
    const path = [wethAddress, usdcAddress];
    
    try {
      const amounts = await router.getAmountsOut(ethWallet, wethAmount, path);
      const usdcOutput = amounts[1];
      console.log(`  USDC output: ${ethers.formatUnits(usdcOutput, 6)} USDC`);
    } catch (error) {
      console.error(`  Error:`, error);
    }
  }
}

testLargeAmount().catch(console.error);
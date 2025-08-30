import { ethers } from "ethers";
import { ChainType, getChainConfig } from "../../../src/config/chain-config";
import { getEthWallet_1 } from "../../../src/hooks/useSetup";
import { InputType, TradeCreationDto } from "../../../src/trading/types/_index";
import { TraderFactory } from "../../../src/trading/TraderFactory";
import { UniswapV2RouterV2 } from "../../../src/smartcontracts/uniswap-v2/UniswapV2RouterV2";
import { Multicall3 } from "../../../src/smartcontracts/multicall3/Multicall3";
import { Multicall3Request } from "../../../src/smartcontracts/multicall3/multicall3-types";

async function debugRouting() {
  const ethWallet = getEthWallet_1();
  const chainConfig = getChainConfig(ChainType.ETH);

  console.log("=== ROUTING DEBUG ===");

  const wagmiAddress = "0x92cc36d66e9d739d50673d1f27929a371fb83a67";
  const usdcAddress = chainConfig.tokenAddresses.usdc;
  const wethAddress = chainConfig.tokenAddresses.weth;

  console.log(`WAGMI: ${wagmiAddress}`);
  console.log(`USDC: ${usdcAddress}`);
  console.log(`WETH: ${wethAddress}`);

  // Create router instance
  const router = new UniswapV2RouterV2(ChainType.ETH);
  const multicall = new Multicall3(ChainType.ETH);

  // Test amount (1,702,000 WAGMI with 18 decimals)
  const amountIn = ethers.parseUnits("1702000", 18);
  console.log(`\nAmount In: ${amountIn.toString()}`);

  console.log("\n=== TESTING DIRECT ROUTES ===");

  // Test 1: WAGMI -> WETH (this should work)
  console.log("\n1. WAGMI -> WETH");
  const path1 = [wagmiAddress, wethAddress];
  try {
    const amounts1 = await router.getAmountsOut(ethWallet, amountIn, path1);
    console.log(`   Direct call result: [${amounts1.map((a) => a.toString()).join(", ")}]`);
    console.log(`   WETH output: ${ethers.formatEther(amounts1[1])} WETH`);
  } catch (error) {
    console.error(`   Error:`, error);
  }

  // Test 2: WETH -> USDC (this should work)
  console.log("\n2. WETH -> USDC");
  // Use a reasonable WETH amount (0.5 WETH)
  const wethAmount = ethers.parseEther("0.5");
  const path2 = [wethAddress, usdcAddress];
  try {
    const amounts2 = await router.getAmountsOut(ethWallet, wethAmount, path2);
    console.log(`   Direct call result: [${amounts2.map((a) => a.toString()).join(", ")}]`);
    console.log(`   USDC output: ${ethers.formatUnits(amounts2[1], 6)} USDC`);
  } catch (error) {
    console.error(`   Error:`, error);
  }

  // Test 3: WAGMI -> USDC (direct - this might fail)
  console.log("\n3. WAGMI -> USDC (direct)");
  const path3 = [wagmiAddress, usdcAddress];
  try {
    const amounts3 = await router.getAmountsOut(ethWallet, amountIn, path3);
    console.log(`   Direct call result: [${amounts3.map((a) => a.toString()).join(", ")}]`);
    console.log(`   USDC output: ${ethers.formatUnits(amounts3[1], 6)} USDC`);
  } catch (error) {
    console.error(`   Error:`, error);
  }

  // Test 4: WAGMI -> WETH -> USDC (multi-hop)
  console.log("\n4. WAGMI -> WETH -> USDC (multi-hop)");
  const path4 = [wagmiAddress, wethAddress, usdcAddress];
  try {
    const amounts4 = await router.getAmountsOut(ethWallet, amountIn, path4);
    console.log(`   Direct call result: [${amounts4.map((a) => a.toString()).join(", ")}]`);
    console.log(`   WETH intermediate: ${ethers.formatEther(amounts4[1])} WETH`);
    console.log(`   USDC output: ${ethers.formatUnits(amounts4[2], 6)} USDC`);
  } catch (error) {
    console.error(`   Error:`, error);
  }

  console.log("\n=== TESTING MULTICALL ===");

  // Test multicall with the same routes
  const calls: Multicall3Request[] = [
    {
      target: router.getRouterAddress(),
      callData: router.encodeGetAmountsOut(amountIn, path1),
      allowFailure: true,
    },
    {
      target: router.getRouterAddress(),
      callData: router.encodeGetAmountsOut(amountIn, path4),
      allowFailure: true,
    },
  ];

  try {
    const results = await multicall.aggregate3StaticCall(ethWallet, calls);

    console.log(`\nMulticall results:`);
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      console.log(`  Call ${i + 1}:`);
      console.log(`    Success: ${result.success}`);
      console.log(`    Return data length: ${result.returnData.length}`);

      if (result.success) {
        try {
          const decoded = router.decodeGetAmountsOutResult(result.returnData);
          console.log(`    Decoded amounts: [${decoded.map((a) => a.toString()).join(", ")}]`);

          if (i === 0) {
            // WAGMI -> WETH
            console.log(`    WETH output: ${ethers.formatEther(decoded[1])} WETH`);
          } else if (i === 1) {
            // WAGMI -> WETH -> USDC
            console.log(`    WETH intermediate: ${ethers.formatEther(decoded[1])} WETH`);
            console.log(`    USDC output: ${ethers.formatUnits(decoded[2], 6)} USDC`);
          }
        } catch (decodeError) {
          console.error(`    Decode error:`, decodeError);
        }
      }
    }
  } catch (error) {
    console.error(`Multicall error:`, error);
  }
}

debugRouting().catch(console.error);

import { ethers, Wallet } from "ethers";
import { ChainType } from "../../../src/config/chain-config";

import { getChainConfig } from "../../../src/config/chain-config";
import { getBaseWallet_1, getEthWallet_1, getHardhatWallet_1 } from "../../../src/hooks/useSetup";
import { validateNetwork } from "../../../src/lib/utils";
import { UniswapV4Quoter } from "../../../src/smartcontracts/uniswap-v4/UniswapV4Quoter";
import { FeeAmount, FeeToTickSpacing, PathSegment } from "../../../src/smartcontracts/uniswap-v4/uniswap-v4-types";
import { getLowPoolKey } from "../../../src/smartcontracts/uniswap-v4/uniswap-v4-utils";

export async function quoterInteraction(chain: ChainType, wallet: Wallet) {
  await validateNetwork(wallet, chain);

  const chainConfig = getChainConfig(chain);

  const USDC_ADDRESS = chainConfig.tokenAddresses.usdc;
  const WETH_ADDRESS = chainConfig.tokenAddresses.weth;
  const DAI_ADDRESS = chainConfig.tokenAddresses.dai;
  const USDT_ADDRESS = chainConfig.tokenAddresses.usdt;

  const quoterAddress = chainConfig.uniswap.v4.quoterAddress;

  const ethBalance = await wallet.provider?.getBalance(wallet.address)!

  console.log("--------------------------------");
  console.log("Chain", chain);
  console.log("--------------------------------");
  console.log("ETH balance:", ethers.formatEther(ethBalance));
  console.log("wallet address", wallet.address);
  console.log("quoter address", quoterAddress);

  const quoter = new UniswapV4Quoter(chain);

  // Debug: Check if pools exist first (using ETH directly)
  const ETH_ADDRESS = ethers.ZeroAddress;
  console.log("\n=== CHECKING POOL EXISTENCE ===");
  await checkPoolsExist(quoter, wallet, USDC_ADDRESS, ETH_ADDRESS, DAI_ADDRESS);

  // Try ETH-based multihop (V4 uses ETH directly, not WETH)
  console.log("\n=== TRYING ETH-BASED MULTIHOP ===");
  await demonstrateEthMultihopQuote(quoter, wallet, USDC_ADDRESS, ETH_ADDRESS, DAI_ADDRESS);
}

async function checkPoolsExist(
  quoter: UniswapV4Quoter,
  wallet: Wallet,
  usdcAddress: string,
  ethAddress: string,
  daiAddress: string
) {
  const feeTiers = [
    { name: "0.01%", fee: FeeAmount.LOWEST },
    { name: "0.05%", fee: FeeAmount.LOW },
    { name: "0.3%", fee: FeeAmount.MEDIUM },
    { name: "1.0%", fee: FeeAmount.HIGH },
  ];

  const tokenPairs = [
    { name: "USDC/ETH", token0: usdcAddress, token1: ethAddress },
    { name: "ETH/DAI", token0: ethAddress, token1: daiAddress },
  ];

  for (const pair of tokenPairs) {
    console.log(`\nChecking ${pair.name} pools:`);
    for (const tier of feeTiers) {
      try {
        const poolKey = getLowPoolKey(pair.token0, pair.token1);
        poolKey.fee = tier.fee;
        poolKey.tickSpacing = FeeToTickSpacing.get(tier.fee)!;

        const zeroForOne = true; // Just for testing
        const testAmount = ethers.parseUnits("1", 6); // 1 USDC equivalent

        const result = await quoter.quoteExactInputSingle(
          wallet,
          poolKey,
          zeroForOne,
          testAmount,
          "0x"
        );

        console.log(`  ✅ ${tier.name} pool exists - Output: ${result.amountOut.toString()}`);
      } catch (error) {
        console.log(`  ❌ ${tier.name} pool not available`);
      }
    }
  }
}

async function demonstrateEthMultihopQuote(
  quoter: UniswapV4Quoter,
  wallet: Wallet,
  usdcAddress: string,
  ethAddress: string,
  daiAddress: string
) {
  console.log("\n=== MULTIHOP QUOTE: USDC -> ETH -> DAI ===");
  
  // Try different fee combinations
  const feeOptions = [
    { name: "Both 0.3%", fee1: FeeAmount.MEDIUM, fee2: FeeAmount.MEDIUM },
    { name: "Both 0.05%", fee1: FeeAmount.LOW, fee2: FeeAmount.LOW },
    { name: "Mixed (0.05% + 0.3%)", fee1: FeeAmount.LOW, fee2: FeeAmount.MEDIUM },
    { name: "Mixed (0.3% + 0.05%)", fee1: FeeAmount.MEDIUM, fee2: FeeAmount.LOW },
  ];

  for (const option of feeOptions) {
    console.log(`\nTrying: ${option.name}`);
    
    try {
      const path: PathSegment[] = [
        // First hop: USDC -> ETH
        {
          intermediateCurrency: ethAddress,
          fee: option.fee1,
          tickSpacing: FeeToTickSpacing.get(option.fee1)!,
          hooks: ethers.ZeroAddress,
          hookData: "0x"
        },
        // Second hop: ETH -> DAI
        {
          intermediateCurrency: daiAddress,
          fee: option.fee2,
          tickSpacing: FeeToTickSpacing.get(option.fee2)!,
          hooks: ethers.ZeroAddress,
          hookData: "0x"
        }
      ];

      const inputAmount = ethers.parseUnits("100", 6); // 100 USDC
      
      console.log(`Input: ${ethers.formatUnits(inputAmount, 6)} USDC`);
      
      const result = await quoter.quoteExactInput(
        wallet,
        usdcAddress,
        path,
        inputAmount
      );

      console.log(`✅ Success! Output: ${ethers.formatUnits(result.amountOut, 18)} DAI`);
      console.log(`Gas estimate: ${result.gasEstimate.toString()}`);
      break; // Exit on first success
      
    } catch (error) {
      console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

async function demonstrateSingleHopQuote(quoter: UniswapV4Quoter, wallet: Wallet, usdcAddress: string) {
  const ethAddress = ethers.ZeroAddress;
  const lowPoolKey = getLowPoolKey(ethAddress,usdcAddress);

  const zeroForOne = usdcAddress === lowPoolKey.currency0 ? true: false;

  const rawInputAmount = "1000";
  const USDC_DECIMALS = 6;
  const inputAmount = ethers.parseUnits(rawInputAmount,USDC_DECIMALS); 

  const {amountOut, gasEstimate} = await quoter.quoteExactInputSingle(wallet,lowPoolKey, zeroForOne,inputAmount,ethers.ZeroAddress);

  console.log("AMOUNT OUT");
  console.log(ethers.formatEther(amountOut));
  console.log("GAS ESTIMATE");
  console.log(gasEstimate);
}

if (require.main === module) {
  const chain: ChainType = ChainType.ETH;
  const wallet = getHardhatWallet_1();

  quoterInteraction(chain, wallet).catch(console.error);
}


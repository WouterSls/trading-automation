import { ethers } from "ethers";
import { getEthWallet_1 } from "../../../src/hooks/useSetup";
import { ERC20_INTERFACE } from "../../../src/lib/smartcontract-abis/erc20";

async function checkTokenDecimals() {
  const ethWallet = getEthWallet_1();
  
  console.log("=== TOKEN DECIMALS DEBUG ===");
  
  const wagmiAddress = "0x92cc36d66e9d739d50673d1f27929a371fb83a67";
  const usdcAddress = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
  const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  
  // Check WAGMI decimals
  try {
    const wagmiDecimalsTx = {
      to: wagmiAddress,
      data: ERC20_INTERFACE.encodeFunctionData("decimals", [])
    };
    const wagmiResult = await ethWallet.call(wagmiDecimalsTx);
    const [wagmiDecimals] = ERC20_INTERFACE.decodeFunctionResult("decimals", wagmiResult);
    console.log(`WAGMI decimals: ${wagmiDecimals}`);
    
    // Check WAGMI symbol and name
    const wagmiSymbolTx = {
      to: wagmiAddress,
      data: ERC20_INTERFACE.encodeFunctionData("symbol", [])
    };
    const wagmiSymbolResult = await ethWallet.call(wagmiSymbolTx);
    const [wagmiSymbol] = ERC20_INTERFACE.decodeFunctionResult("symbol", wagmiSymbolResult);
    console.log(`WAGMI symbol: ${wagmiSymbol}`);
    
    const wagmiNameTx = {
      to: wagmiAddress,
      data: ERC20_INTERFACE.encodeFunctionData("name", [])
    };
    const wagmiNameResult = await ethWallet.call(wagmiNameTx);
    const [wagmiName] = ERC20_INTERFACE.decodeFunctionResult("name", wagmiNameResult);
    console.log(`WAGMI name: ${wagmiName}`);
    
  } catch (error) {
    console.error("Error checking WAGMI token:", error);
  }
  
  // Check USDC decimals
  try {
    const usdcDecimalsTx = {
      to: usdcAddress,
      data: ERC20_INTERFACE.encodeFunctionData("decimals", [])
    };
    const usdcResult = await ethWallet.call(usdcDecimalsTx);
    const [usdcDecimals] = ERC20_INTERFACE.decodeFunctionResult("decimals", usdcResult);
    console.log(`USDC decimals: ${usdcDecimals}`);
  } catch (error) {
    console.error("Error checking USDC token:", error);
  }
  
  // Check WETH decimals
  try {
    const wethDecimalsTx = {
      to: wethAddress,
      data: ERC20_INTERFACE.encodeFunctionData("decimals", [])
    };
    const wethResult = await ethWallet.call(wethDecimalsTx);
    const [wethDecimals] = ERC20_INTERFACE.decodeFunctionResult("decimals", wethResult);
    console.log(`WETH decimals: ${wethDecimals}`);
  } catch (error) {
    console.error("Error checking WETH token:", error);
  }
  
  console.log("\n=== AMOUNT PARSING TEST ===");
  
  // Test amount parsing with different decimals
  const inputAmount = "1702000";
  
  console.log(`Input amount string: ${inputAmount}`);
  
  // If WAGMI has 18 decimals
  const wagmiAmount18 = ethers.parseUnits(inputAmount, 18);
  console.log(`Parsed with 18 decimals: ${wagmiAmount18.toString()}`);
  
  // If WAGMI has 9 decimals
  const wagmiAmount9 = ethers.parseUnits(inputAmount, 9);
  console.log(`Parsed with 9 decimals: ${wagmiAmount9.toString()}`);
  
  // If WAGMI has 6 decimals (like USDC)
  const wagmiAmount6 = ethers.parseUnits(inputAmount, 6);
  console.log(`Parsed with 6 decimals: ${wagmiAmount6.toString()}`);
}

checkTokenDecimals().catch(console.error);
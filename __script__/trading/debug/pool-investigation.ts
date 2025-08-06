import { ethers } from "ethers";
import { ChainType, getChainConfig } from "../../../src/config/chain-config";
import { getEthWallet_1 } from "../../../src/hooks/useSetup";
import { ERC20_INTERFACE } from "../../../src/lib/smartcontract-abis/erc20";

// Uniswap V2 Factory ABI (minimal)
const UNISWAP_V2_FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)"
];

// Uniswap V2 Pair ABI (minimal)
const UNISWAP_V2_PAIR_ABI = [
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function totalSupply() external view returns (uint256)"
];

async function investigateWagmiPool() {
  const ethWallet = getEthWallet_1();
  const chainConfig = getChainConfig(ChainType.ETH);
  
  console.log("=== WAGMI POOL INVESTIGATION ===");
  
  const wagmiAddress = "0x92cc36d66e9d739d50673d1f27929a371fb83a67";
  const wethAddress = chainConfig.tokenAddresses.weth;
  const factoryAddress = chainConfig.uniswap.v2.factoryAddress;
  
  console.log(`WAGMI: ${wagmiAddress}`);
  console.log(`WETH: ${wethAddress}`);
  console.log(`Factory: ${factoryAddress}`);
  
  // Get the pair address
  const factory = new ethers.Contract(factoryAddress, UNISWAP_V2_FACTORY_ABI, ethWallet);
  
  try {
    const pairAddress = await factory.getPair(wagmiAddress, wethAddress);
    console.log(`\nWAGMI/WETH Pair Address: ${pairAddress}`);
    
    if (pairAddress === ethers.ZeroAddress) {
      console.log("❌ NO PAIR EXISTS! This explains why direct WAGMI->USDC fails and multi-hop returns 0.");
      return;
    }
    
    // If pair exists, check its reserves
    const pair = new ethers.Contract(pairAddress, UNISWAP_V2_PAIR_ABI, ethWallet);
    
    const [reserve0, reserve1, blockTimestampLast] = await pair.getReserves();
    const token0 = await pair.token0();
    const token1 = await pair.token1();
    const totalSupply = await pair.totalSupply();
    
    console.log(`\nPair Details:`);
    console.log(`Token0: ${token0}`);
    console.log(`Token1: ${token1}`);
    console.log(`Total Supply: ${totalSupply.toString()}`);
    console.log(`Last Update: ${new Date(Number(blockTimestampLast) * 1000).toISOString()}`);
    
    // Determine which reserve is which token
    let wagmiReserve, wethReserve;
    if (token0.toLowerCase() === wagmiAddress.toLowerCase()) {
      wagmiReserve = reserve0;
      wethReserve = reserve1;
    } else {
      wagmiReserve = reserve1;
      wethReserve = reserve0;
    }
    
    console.log(`\nReserves:`);
    console.log(`WAGMI Reserve: ${ethers.formatUnits(wagmiReserve, 18)} WAGMI`);
    console.log(`WETH Reserve: ${ethers.formatEther(wethReserve)} WETH`);
    
    // Calculate the effective price
    if (wagmiReserve > 0n && wethReserve > 0n) {
      const wagmiPerWeth = (Number(ethers.formatUnits(wagmiReserve, 18)) / Number(ethers.formatEther(wethReserve)));
      const wethPerWagmi = 1 / wagmiPerWeth;
      console.log(`\nPrice:`);
      console.log(`1 WETH = ${wagmiPerWeth.toLocaleString()} WAGMI`);
      console.log(`1 WAGMI = ${wethPerWagmi.toExponential()} WETH`);
      
      // Check if reserves are extremely low
      if (Number(ethers.formatEther(wethReserve)) < 0.001) {
        console.log("⚠️  WETH reserve is extremely low (< 0.001 WETH)");
      }
      if (Number(ethers.formatUnits(wagmiReserve, 18)) < 1000) {
        console.log("⚠️  WAGMI reserve is extremely low (< 1000 WAGMI)");
      }
    } else {
      console.log("❌ One or both reserves are 0!");
    }
    
    // Check if the pair has any liquidity at all
    if (totalSupply === 0n) {
      console.log("❌ Pair has no liquidity (totalSupply = 0)");
    } else if (totalSupply < ethers.parseEther("0.001")) {
      console.log("⚠️  Pair has extremely low liquidity");
    }
    
  } catch (error) {
    console.error("Error investigating pair:", error);
  }
  
  // Also check if WAGMI token is legitimate
  console.log("\n=== WAGMI TOKEN VERIFICATION ===");
  try {
    // Check total supply
    const totalSupplyTx = {
      to: wagmiAddress,
      data: ERC20_INTERFACE.encodeFunctionData("totalSupply", [])
    };
    const totalSupplyResult = await ethWallet.call(totalSupplyTx);
    const [totalSupply] = ERC20_INTERFACE.decodeFunctionResult("totalSupply", totalSupplyResult);
    console.log(`WAGMI Total Supply: ${ethers.formatUnits(totalSupply, 18)} WAGMI`);
    
    if (totalSupply === 0n) {
      console.log("❌ WAGMI token has 0 total supply!");
    }
  } catch (error) {
    console.error("Error checking WAGMI token:", error);
  }
}

investigateWagmiPool().catch(console.error);
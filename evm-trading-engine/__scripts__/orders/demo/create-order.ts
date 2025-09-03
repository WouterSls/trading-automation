import { ethers } from "ethers";
import { ChainType, getChainConfig } from "../../../src/config/chain-config";
import { getBaseWallet_1 } from "../../../src/hooks/useSetup";
import { EIP712Domain, TradeOrder } from "../../../src/orders";

// Returns Signed Trade Order
export async function createOrder(chain: ChainType) {
  console.log("\n🎯 Barebone EIP-712 Order Creation");
  console.log("=================================\n");

  const wallet = getBaseWallet_1();
  const chainConfig = getChainConfig(chain);

  const orderExecutorAddress = chainConfig.orderExecutorAddress;

  console.log("👤 Wallet:", wallet.address);
  console.log("🌍 Chain:", chainConfig.name);
  console.log();

  const appDomain: EIP712Domain = {
    name: "EVM Trading Engine",
    version: "1.0.0",
    chainId: Number(chainConfig.id),
    verifyingContract: orderExecutorAddress,
  };

  const appTypes = {
    TradeOrder: [
      { name: "maker", type: "address" }, // Fixed: was "trader"
      { name: "inputToken", type: "address" },
      { name: "outputToken", type: "address" },
      { name: "inputAmount", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
      { name: "maxSlippageBps", type: "uint16" },
      { name: "allowedRouters", type: "address[]" },
      { name: "expiry", type: "uint256" },
      { name: "nonce", type: "uint256" }, // Fixed: was "string", should be "uint256"
    ],
  };

  const appValues: TradeOrder = {
    maker: wallet.address, // Fixed: was "trader"
    inputToken: chainConfig.tokenAddresses.usdc, // Fixed: using actual Base USDC
    outputToken: chainConfig.tokenAddresses.weth, // Fixed: using actual Base WETH
    inputAmount: ethers.parseUnits("100", 6).toString(),
    minAmountOut: ethers.parseEther("0.025").toString(),
    maxSlippageBps: 100,
    allowedRouters: [
      // Fixed: added actual routers
      chainConfig.uniswap.v3.swapRouterV2Address,
      chainConfig.aerodrome.routerAddress,
    ],
    expiry: Math.floor(Date.now() / 1000) + 3600,
    nonce: "12345", // Simple fixed nonce for testing
  };

  console.log("📝 Order Data:");
  console.log("  Maker:", appValues.maker);
  console.log("  Input Token:", appValues.inputToken, "(USDC)");
  console.log("  Output Token:", appValues.outputToken, "(WETH)");
  console.log("  Input Amount:", ethers.formatUnits(appValues.inputAmount, 6), "USDC");
  console.log("  Min Amount Out:", ethers.formatEther(appValues.minAmountOut), "ETH");
  console.log("  Max Slippage:", appValues.maxSlippageBps, "bp (1%)");
  console.log("  Allowed Routers:", appValues.allowedRouters.length);
  console.log("  Expiry:", new Date(appValues.expiry * 1000).toISOString());
  console.log("  Nonce:", appValues.nonce);
  console.log();

  console.log("🏷️  Domain:");
  console.log("  Name:", appDomain.name);
  console.log("  Version:", appDomain.version);
  console.log("  Chain ID:", appDomain.chainId);
  console.log("  Contract:", appDomain.verifyingContract);
  console.log();

  try {
    console.log("✍️  Signing order with EIP-712...");
    const signedSignature = await wallet.signTypedData(appDomain, appTypes, appValues);
    console.log("✅ Signature created:", signedSignature.substring(0, 20) + "...");
    console.log();

    console.log("🔍 Verifying signature...");
    const recoveredSigner = ethers.verifyTypedData(appDomain, appTypes, appValues, signedSignature);
    console.log("Original signer:", wallet.address);
    console.log("Recovered signer:", recoveredSigner);
    console.log("Signature valid:", wallet.address.toLowerCase() === recoveredSigner.toLowerCase() ? "✅" : "❌");
    console.log();

    console.log("🎯 What happens next:");
    console.log("1. This signed order gets stored by backend");
    console.log("2. Backend monitors market conditions");
    console.log("3. When profitable, backend executes via smart contract");
    console.log("4. Smart contract verifies this signature on-chain");
    console.log("5. If valid, tokens are swapped and sent to user");
    console.log();

    console.log("📦 Storage format:");
    const storageData = {
      orderData: appValues,
      signature: signedSignature,
      domain: appDomain,
      types: appTypes,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    console.log(JSON.stringify(storageData, null, 2));

    return {
      orderData: appValues,
      signature: signedSignature,
      domain: appDomain,
      types: appTypes,
    };
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

if (require.main === module) {
  const chain = ChainType.BASE;
  createOrder(chain).catch(console.error);
}

import { ethers } from "ethers";
import { ChainType, getChainConfig } from "../../src/config/chain-config";
import { getBaseWallet_1, getHardhatWallet_1, getHardhatWallet_2 } from "../../src/hooks/useSetup";
import { createMinimalErc20 } from "../../src/smartcontracts/ERC/erc-utils";
import { CreateTransactionError, ERC20CreationError } from "../../src/lib/errors";
import { UniswapV2RouterV2 } from "../../src/smartcontracts/uniswap-v2";
import { TRADING_CONFIG } from "../../src/config/trading-config";
import { Permit2 } from "../../src/smartcontracts/permit2/Permit2";
import { Permit2Transfer, Permit2TransferDetails, SignedPermit2Transfer} from "../../src/orders";


export async function createPermitTransfer(): Promise<SignedPermit2Transfer> {
  console.log("\n🎫 Creating Permit2 Transfer Authorization");
  console.log("==========================================\n");

  //const wallet = getBaseWallet_1();
  const chain = ChainType.ETH;
  const wallet = getHardhatWallet_1();
  const wallet2 = getHardhatWallet_2();

  const chainConfig = getChainConfig(chain);

  const buyUsdc = false;

  if (buyUsdc) {
    console.log("Buying USDC...")
    const uniV2 = new UniswapV2RouterV2(chain);
    const amountOutMin = 0n;
    const path = [chainConfig.tokenAddresses.weth, chainConfig.tokenAddresses.usdc];
    const to = wallet.address;
    const deadline = TRADING_CONFIG.DEADLINE;

    const swapTx = await uniV2.createSwapExactETHForTokensTransaction(amountOutMin, path, to, deadline);
    swapTx.value = ethers.parseEther("1");

    const txResponse = await wallet.sendTransaction(swapTx);
    const txReceipt = txResponse.wait();
    if (!txReceipt) {
      throw new Error("Executed transaction didn't return receipt");
    }
  }

  const permit2Address = chainConfig.uniswap.permit2Address;
  const tokenAddress = chainConfig.tokenAddresses.usdc;

  const usdc = await createMinimalErc20(tokenAddress, wallet.provider!);
  if (!usdc) {
    throw new ERC20CreationError(`Could not create erc20 for ${tokenAddress} on chain ${chain}`);
  }

  const wallet1Balance = await usdc?.getFormattedTokenBalance(wallet.address);
  const wallet2Balance = await usdc?.getFormattedTokenBalance(wallet2.address);

  console.log("🎫 Permit2 contract:", permit2Address);
  console.log("🌍 Chain:", chainConfig.name);
  console.log();
  console.log("Testing with token: ", usdc?.getSymbol());
  console.log();
  console.log("👤 User wallet:", wallet.address);
  console.log("Token balance:", wallet1Balance);
  console.log();
  console.log("👤 Receiver wallet:", wallet2.address);
  console.log("Token balance:", wallet2Balance);
  console.log();

  const tokenAmount = ethers.parseUnits("100", 6).toString(); // 100 USDC
  const recipient = wallet2.address; // should be OrderExecutor

  console.log("💰 Token:", tokenAddress, "(USDC)");
  console.log("💰 Amount:", ethers.formatUnits(tokenAmount, 6), "USDC");
  console.log("📤 Recipient:", recipient);
  console.log();

  // 1. CHECK IF PERMIT2 IS APPROVED
  console.log("🔍 Step 1: Checking Permit2 Approval");
  console.log("------------------------------------");


  const currentAllowance = await usdc.getRawAllowance(wallet.address, permit2Address);
  const needsApproval = currentAllowance < BigInt(tokenAmount);

  console.log("Current allowance:", ethers.formatUnits(currentAllowance, 6), "USDC");
  console.log("Needs approval:", needsApproval ? "❌ YES" : "✅ NO");

  if (needsApproval) {
    const approveTx = await usdc.createApproveTransaction(permit2Address,ethers.MaxUint256);

    const approveTxResponse = await wallet.sendTransaction(approveTx);
    const approveTxReceipt = await approveTxResponse.wait();
    if (!approveTxReceipt) {
        throw new Error("Approve failed");
    }
    console.log("Approve succes")

    /**
    console.log();
    console.log("⚠️  APPROVAL REQUIRED:");
    console.log("User needs to approve Permit2 contract first:");
    console.log(`await tokenContract.approve("${permit2Address}", MAX_UINT256)`);
    console.log();
    console.log("💡 In production, your frontend would:");
    console.log("1. Check allowance automatically");
    console.log("2. Request approval transaction if needed");
    console.log("3. Wait for approval confirmation");
    console.log("4. Then proceed with permit signing");
    console.log();

    // For demo purposes, we'll continue with the permit structure anyway
    console.log("📝 Continuing with permit structure (assuming approval exists)...");
 */
  }
  console.log();

  // 2. GET PERMIT2 NONCE
  console.log("🔢 Step 2: Getting Permit2 Nonce");
  console.log("---------------------------------");

  const permit2: Permit2 = new Permit2(chain);
  const permit2Nonce = await permit2.getPermit2Nonce(wallet,wallet.address,tokenAddress,wallet2.address)

  const permit2Contract = new ethers.Contract(
    permit2Address,
    [
      "function allowance(address owner, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)",
    ],
    wallet,
  );

  try {
    const [, , nonce] = await permit2Contract.allowance(wallet.address, tokenAddress, recipient);
    console.log("Current nonce:", nonce.toString());
    console.log("Permit2 class nonce:", permit2Nonce.toString())
    console.log();

    // 3. CREATE PERMIT2 TRANSFER DATA
    console.log("📋 Step 3: Creating Permit2 Transfer Data");
    console.log("----------------------------------------");


    const permit: Permit2Transfer = {
      permitted: {
        token: tokenAddress,
        amount: tokenAmount,
      },
      nonce: nonce.toString(),
      deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };

    const transferDetails: Permit2TransferDetails = {
      to: recipient,
      requestedAmount: tokenAmount, // Transfer full amount
    };

    console.log("Permit data:");
    console.log("  Token:", permit.permitted.token);
    console.log("  Amount:", ethers.formatUnits(permit.permitted.amount, 6), "USDC");
    console.log("  Nonce:", permit.nonce);
    console.log("  Deadline:", new Date(permit.deadline * 1000).toISOString());
    console.log();

    console.log("Transfer details:");
    console.log("  To:", transferDetails.to);
    console.log("  Amount:", ethers.formatUnits(transferDetails.requestedAmount, 6), "USDC");
    console.log();

    // 4. CREATE EIP-712 DOMAIN AND TYPES FOR PERMIT2
    console.log("🏷️  Step 4: Setting up EIP-712 for Permit2");
    console.log("------------------------------------------");

    const permit2Domain = {
      name: "Permit2",
      chainId: Number(chainConfig.id),
      verifyingContract: permit2Address,
    };

    const permit2Types = {
      PermitTransferFrom: [
        { name: "permitted", type: "TokenPermissions" },
        { name: "spender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
      TokenPermissions: [
        { name: "token", type: "address" },
        { name: "amount", type: "uint256" },
      ],
    };

    const permit2Values = {
      permitted: permit.permitted,
      spender: recipient,
      nonce: permit.nonce,
      deadline: permit.deadline,
    };

    console.log("Domain:", permit2Domain);
    console.log("Signing data:", permit2Values);
    console.log();

    // 5. SIGN THE PERMIT2 TRANSFER
    console.log("✍️  Step 5: Signing Permit2 Transfer");
    console.log("-----------------------------------");

    const signature = await wallet.signTypedData(permit2Domain, permit2Types, permit2Values);

    console.log("✅ Permit2 signature created:", signature.substring(0, 20) + "...");
    console.log();

    // 6. VERIFY SIGNATURE
    console.log("🔍 Step 6: Verifying Signature");
    console.log("------------------------------");

    const recoveredSigner = ethers.verifyTypedData(permit2Domain, permit2Types, permit2Values, signature);
    const isValid = recoveredSigner.toLowerCase() === wallet.address.toLowerCase();

    console.log("Original signer:", wallet.address);
    console.log("Recovered signer:", recoveredSigner);
    console.log("Signature valid:", isValid ? "✅" : "❌");
    console.log();

    // 7. SHOW EXECUTION FLOW
    /*
    console.log("⚡ Step 7: How This Gets Executed");
    console.log("---------------------------------");
    console.log("Backend/Contract would call:");
    console.log("```solidity");
    console.log("permit2.permitTransferFrom(");
    console.log("  permit,           // Token, amount, nonce, deadline");
    console.log("  transferDetails,  // To, requestedAmount");
    console.log("  owner,            // User's address");
    console.log("  signature         // User's signature");
    console.log(");");
    console.log("```");
    console.log();
    */
    const result: SignedPermit2Transfer = {
      permit,
      transferDetails,
      signature,
      owner: wallet.address,
    };
    console.log(result);

    throw new Error("STOP");

   await permit2.executeSignedPermit2Transfer(wallet,result)

    console.log("🎯 Result: 100 USDC transferred from user to OrderExecutor");
    console.log("💡 No additional approvals needed for future transfers!");
    console.log();

    console.log("📦 Complete signed transfer:");
    console.log(
      JSON.stringify(
        {
          ...result,
          signature: result.signature.substring(0, 20) + "...",
        },
        null,
        2,
      ),
    );

    return result;
  } catch (error) {
    console.error("❌ Error getting nonce or signing:", error);
    throw error;
  }
}

if (require.main === module) {
  createPermitTransfer().catch(console.error);
}

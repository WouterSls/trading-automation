/**
 * Complete Permit2 Transfer Test
 * 
 * This script demonstrates the complete flow:
 * 1. Check Permit2 approval
 * 2. Approve Permit2 if needed
 * 3. Create signed Permit2 transfer
 * 4. Execute the transfer on-chain
 * 
 * Usage: npx ts-node __script__/orders/test-permit2-execution.ts
 */

import { ethers } from "ethers";
import { ChainType, getChainConfig } from "../../src/config/chain-config";
import { getHardhatWallet_1, getHardhatWallet_2 } from "../../src/hooks/useSetup";
import { createMinimalErc20 } from "../../src/smartcontracts/ERC/erc-utils";
import { Permit2 } from "../../src/smartcontracts/permit2/Permit2";
import { Permit2Transfer, Permit2TransferDetails, SignedPermit2Transfer } from "../../src/orders";

async function testPermit2Execution() {
  console.log("\n🧪 Complete Permit2 Transfer Test");
  console.log("=================================\n");

  const chain = ChainType.ETH; // Using Hardhat local network
  const chainConfig = getChainConfig(chain);

  // Setup wallets
  const userWallet = getHardhatWallet_1(); // Token owner
  const executorWallet = getHardhatWallet_2(); // Backend/executor
  
  console.log("👤 User wallet:", userWallet.address);
  console.log("🏢 Executor wallet:", executorWallet.address);
  console.log();

  // Setup token and Permit2
  const tokenAddress = chainConfig.tokenAddresses.usdc;
  const permit2 = new Permit2(chain);
  
  const usdc = await createMinimalErc20(tokenAddress, userWallet.provider!);
  if (!usdc) {
    throw new Error(`Could not create ERC20 for ${tokenAddress}`);
  }

  // Check initial balances
  console.log("📊 Initial Token Balances:");
  const userBalance = await usdc.getFormattedTokenBalance(userWallet.address);
  const executorBalance = await usdc.getFormattedTokenBalance(executorWallet.address);
  
  console.log(`  User: ${userBalance} USDC`);
  console.log(`  Executor: ${executorBalance} USDC`);
  console.log();

  // Transfer amount
  const transferAmount = ethers.parseUnits("100", 6).toString(); // 100 USDC
  console.log("💰 Transfer Amount:", ethers.formatUnits(transferAmount, 6), "USDC");
  console.log();

  // STEP 1: Check and handle Permit2 approval
  console.log("🔍 Step 1: Checking Permit2 Approval");
  console.log("------------------------------------");
  
  const { hasAllowance, currentAllowance } = await permit2.checkPermit2Allowance(
    userWallet,
    userWallet.address,
    tokenAddress,
    transferAmount
  );
  
  console.log("Current allowance:", ethers.formatUnits(currentAllowance, 6), "USDC");
  console.log("Sufficient allowance:", hasAllowance ? "✅" : "❌");
  console.log();

  if (!hasAllowance) {
    console.log("🔓 Approving Permit2...");
    await permit2.approvePermit2(userWallet, tokenAddress);
  }

  // STEP 2: Create Permit2 transfer signature
  console.log("✍️  Step 2: Creating Permit2 Transfer Signature");
  console.log("----------------------------------------------");

  // Get nonce
  const nonce = await permit2.getPermit2Nonce(
    userWallet,
    userWallet.address,
    tokenAddress,
    executorWallet.address
  );

  // Create permit data
  const permit: Permit2Transfer = {
    permitted: {
      token: tokenAddress,
      amount: transferAmount,
    },
    nonce: nonce.toString(),
    deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  };

  const transferDetails: Permit2TransferDetails = {
    to: executorWallet.address,
    requestedAmount: transferAmount,
  };

  console.log("📋 Permit Details:");
  console.log("  Token:", permit.permitted.token);
  console.log("  Amount:", ethers.formatUnits(permit.permitted.amount, 6), "USDC");
  console.log("  Nonce:", permit.nonce);
  console.log("  Deadline:", new Date(permit.deadline * 1000).toISOString());
  console.log("  To:", transferDetails.to);
  console.log();

  // Create EIP-712 signature
  const permit2Domain = {
    name: "Permit2",
    chainId: Number(chainConfig.id),
    verifyingContract: permit2.getPermit2Address(),
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
    spender: executorWallet.address,
    nonce: permit.nonce,
    deadline: permit.deadline,
  };

  console.log("✍️  User signing Permit2 transfer...");
  const signature = await userWallet.signTypedData(permit2Domain, permit2Types, permit2Values);
  console.log("✅ Signature created:", signature.substring(0, 20) + "...");
  console.log();

  // Create signed transfer object
  const signedPermit2Transfer: SignedPermit2Transfer = {
    permit,
    transferDetails,
    signature,
    owner: userWallet.address,
  };

  // STEP 3: Execute the transfer on-chain
  console.log("⚡ Step 3: Executing Transfer On-Chain");
  console.log("-------------------------------------");
  
  try {
    const txReceipt = await permit2.executeSignedPermit2Transfer(
      executorWallet, // Executor pays gas
      signedPermit2Transfer
    );

    console.log("🎉 Transfer executed successfully!");
    console.log("Transaction hash:", txReceipt.hash);
    console.log();

    // STEP 4: Verify final balances
    console.log("📊 Final Token Balances:");
    console.log("------------------------");
    
    const finalUserBalance = await usdc.getFormattedTokenBalance(userWallet.address);
    const finalExecutorBalance = await usdc.getFormattedTokenBalance(executorWallet.address);
    
    console.log(`  User: ${finalUserBalance} USDC (was ${userBalance})`);
    console.log(`  Executor: ${finalExecutorBalance} USDC (was ${executorBalance})`);
    console.log();

    // Calculate changes
    const userChange = parseFloat(finalUserBalance) - parseFloat(userBalance);
    const executorChange = parseFloat(finalExecutorBalance) - parseFloat(executorBalance);
    
    console.log("💱 Balance Changes:");
    console.log(`  User: ${userChange > 0 ? '+' : ''}${userChange} USDC`);
    console.log(`  Executor: ${executorChange > 0 ? '+' : ''}${executorChange} USDC`);
    console.log();

    console.log("✅ Test completed successfully!");
    console.log("🎯 Key Achievements:");
    console.log("  • User signed a Permit2 transfer without paying gas");
    console.log("  • Executor executed the transfer by paying gas");
    console.log("  • Tokens transferred directly from user to executor");
    console.log("  • No additional approvals needed for future transfers");
    console.log();

  } catch (error) {
    console.error("❌ Transfer execution failed:", error);
    
    // Provide debugging help
    console.log("\n🔧 Debugging Tips:");
    console.log("- Make sure you have USDC balance in the user wallet");
    console.log("- Ensure Permit2 is properly approved");
    console.log("- Check that the signature hasn't expired");
    console.log("- Verify nonce hasn't been used already");
    console.log();
    
    throw error;
  }
}

if (require.main === module) {
  testPermit2Execution().catch(console.error);
}

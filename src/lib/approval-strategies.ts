import { ethers, TransactionRequest, Wallet } from "ethers";
import { createMinimalErc20 } from "../smartcontracts/ERC/erc-utils";
import { ERC20 } from "../smartcontracts/ERC/ERC20";
import { ERC20_INTERFACE } from "./smartcontract-abis/erc20";

/**
 * Standard ERC20 approval strategy
 * Used by most DEX protocols (Uniswap V2, V3, Sushiswap, etc.)
 */
export async function ensureStandardApproval(
  wallet: Wallet,
  tokenAddress: string,
  amount: string,
  spenderAddress: string,
): Promise<string | null> {
  try {
    const token = await createMinimalErc20(tokenAddress, wallet.provider!);
    if (!token) return null;
    const rawAmount = ethers.parseUnits(amount, token.getDecimals());
    const routerAllowance = await token.getRawAllowance(wallet.address, spenderAddress);

    const needsApproval = routerAllowance < rawAmount;

    if (needsApproval) {
      console.log("Insufficient allowance, approving tokens...");

      const approveAmount = (rawAmount * 105n) / 100n;
      console.log(
        `Approving ${ethers.formatUnits(approveAmount, token.getDecimals())} ${token.getSymbol()} to ${spenderAddress}...`,
      );

      const gasCost = await approveTokenSpending(wallet, token, spenderAddress, approveAmount);
      return gasCost;
    } else {
      return null;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error(`Error during token approval: ${errorMessage}`);
    throw new Error(`Token approval failed: ${errorMessage}`);
  }
}

/**
 * Infinite approval strategy
 * Approves maximum amount to avoid future approval transactions
 */
export async function ensureInfiniteApproval(
  wallet: Wallet,
  tokenAddress: string,
  amount: string,
  spenderAddress: string,
): Promise<string | null> {
  try {
    const token = await createMinimalErc20(tokenAddress, wallet.provider!);
    if (!token) return null;
    const rawAmount = ethers.parseUnits(amount, token.getDecimals());
    const routerAllowance = await token.getRawAllowance(wallet.address, spenderAddress);

    const needsApproval = routerAllowance < rawAmount;

    if (needsApproval) {
      console.log(
        `Setting infinite approval for token (${tokenAddress}) to spender (${spenderAddress}) by owner (${wallet.address})`,
      );
      const approveTx = await token.createApproveTransaction(spenderAddress, ethers.MaxUint256);
      const approveTxResponse = await wallet.sendTransaction(approveTx);
      const approveTxReceipt = await approveTxResponse.wait();

      if (!approveTxReceipt) throw new Error("Failed to approve token spending | no transaction receipt");
      const gasCost = approveTxReceipt.gasPrice! * approveTxReceipt.gasUsed;

      const gasCostFormatted = ethers.formatEther(gasCost);
      console.log(`Infinite approval successful! Gas cost: ${gasCostFormatted} ETH`);
      return gasCostFormatted;
    } else {
      console.log("Infinite approval already set.");
      return null;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error(`Error during infinite approval: ${errorMessage}`);
    throw new Error(`Infinite approval failed: ${errorMessage}`);
  }
}

/**
 * Permit2 approval strategy
 * Used by Uniswap V4 and other protocols that support Permit2
 * This is a placeholder implementation - you would implement the full Permit2 flow here
 */
export async function ensurePermit2Approval(
  wallet: Wallet,
  tokenAddress: string,
  amount: string,
  permit2Address: string,
  routerAddress: string,
): Promise<void> {
  try {
    // Ste, checkTokenAllowance p 1: Check if token is approved to Permit2 contract
    const balanceOfTxData = ERC20_INTERFACE.encodeFunctionData("balanceOf", [permit2Address]);
    const tx: TransactionRequest = {
      to: tokenAddress,
      data: balanceOfTxData,
    };
    const allowance = await wallet.call(tx);
    console.log("allowance");
    console.log(allowance);
    console.log("parsed");
    console.log(ethers.parseUnits(allowance));
    console.log("ethers max Uint256");
    console.log(ethers.MaxUint256);

    const needsPermit2Approval = ethers.parseUnits(allowance) < ethers.MaxUint256 / 2n;
    console.log(needsPermit2Approval);

    throw new Error("Stop");

    if (needsPermit2Approval) {
      console.log("Approving token to Permit2 contract...");
      // Usually approve max amount to Permit2 once
      const token = await createMinimalErc20(tokenAddress, wallet.provider!);
      //const gasCost = await approveTokenSpending(wallet, token, permit2Address, ethers.MaxUint256);
      //console.log(`Permit2 approval successful! Gas cost: ${gasCost} ETH`);
    }

    // Step 2: Handle Permit2 signature/allowance for the specific router
    // This is where you would implement the Permit2 signature flow
    console.log("TODO: Implement Permit2 signature flow for router allowance");

    // For now, this is a placeholder. In a real implementation, you would:
    // 1. Check Permit2 allowance for the router
    // 2. If needed, create a Permit2 signature
    // 3. The signature would be used in the actual transaction
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error(`Error during Permit2 approval: ${errorMessage}`);
    throw new Error(`Permit2 approval failed: ${errorMessage}`);
  }
}

/**
 * Approve Token Spending
 * Used by approval strategies to approve an amount of token to spend for an address
 */
async function approveTokenSpending(wallet: Wallet, token: ERC20, spenderAddress: string, rawAmount: bigint) {
  const approveTxRequest = await token.createApproveTransaction(spenderAddress, rawAmount);
  const approveTxResponse = await wallet.sendTransaction(approveTxRequest);
  const approveTxReceipt = await approveTxResponse.wait();

  if (!approveTxReceipt) throw new Error("Failed to approve token spending | no transaction receipt");
  const gasCost = approveTxReceipt.gasPrice! * approveTxReceipt.gasUsed;

  const gasCostFormatted = ethers.formatEther(gasCost);
  return gasCostFormatted;
}

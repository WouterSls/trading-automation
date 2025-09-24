import { Contract, ethers, Signature, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { PERMIT2_INTERFACE } from "../../lib/smartcontract-abis/_index";
import { IPermitSingle } from "../universal-router/universal-router-types";
import { Permit2Transfer, SignedPermit2Transfer } from "../../orders/order-types";
import { PERMIT2_TYPES, Permit2Domain, PermitSingle, PermitTransferFrom } from "./permit2-types";
import { SignedPermitSignatureData } from "../../trading/executor/executor-types";



//Permit2 has two distincy ways of interacting with the permit2 contract.
//Allowance based transfer -> update allowance via permit signature siging = preferred when multiple transfers are expected
//Signature based transfer -> single token transfer via signature siging = preferred when single token transfer
export class Permit2 {
  constructor(private chainId: number, private permit2Address: string) { }

  getAddress = () => this.permit2Address;
  getDomain(): Permit2Domain {
    return {
      name: 'Permit2',
      chainId: this.chainId,
      verifyingContract: this.permit2Address
    }
  }

  async signSignatureTransfer(signer: Wallet, value: PermitTransferFrom) {
    const domain = this.getDomain();
    const types = {
      PermitTransferFrom: PERMIT2_TYPES.PermitTransferFrom,
      TokenPermissions: PERMIT2_TYPES.TokenPermissions,
    };

    try {
      return await signer.signTypedData(domain, types, value);
    } catch (error) {
      console.log("Error during signing ISignatureTrasfer.PermitTransferFrom typeData");
      throw error;
    }
  }

  /**
   * Gets a valid nonce for ISignatureTransfer (permitTransferFrom)
   * Uses unordered nonces with bitmap system
   * @param wallet - Wallet to connect to contract
   * @returns Valid nonce for permitTransferFrom
   */
  async getSignatureTransferNonce(wallet: Wallet): Promise<string> {
    const permit2Contract = new Contract(this.permit2Address, PERMIT2_INTERFACE, wallet);
    const owner = wallet.address;

    let wordPos = 0;
    let foundAvailableNonce = false;
    while (!foundAvailableNonce) {
      const bitmap = await permit2Contract.nonceBitmap(owner, wordPos);
      
      for (let bitPos = 0; bitPos < 256; bitPos++) {
        const bit = BigInt(1 << bitPos);
        
        if ((bitmap & bit) === 0n) {
          const nonce = (BigInt(wordPos) << 8n) | BigInt(bitPos);
          foundAvailableNonce = true;
          return nonce.toString();
        }
      }
      
      wordPos++;
      
      if (wordPos > 1000000) { // 1 million words = 256 million nonces safety check to prevent infinite loop (though practically impossible)
        throw new Error("No available nonces found after checking 1 million words");
      }
    }

    throw new Error("No available nonces found");
  }


  async signAllowanecTranfer() {

  }

  async getAllowanceTransferNonce(wallet: Wallet, token: string, spender: string) {
    const permit2Contract = new Contract(this.permit2Address, PERMIT2_INTERFACE, wallet);
    const owner = wallet.address;
    const [allowanceRaw, expiration, nonce] = await permit2Contract.allowance(owner, token, spender);
    return nonce;
  }





  /**
   * Executes a signed Permit2 transfer on-chain
   *
   * @param executorWallet - The wallet that will execute the transaction (pays gas)
   * @param signedPermit2Transfer - The signed permit transfer data
   * @returns Transaction receipt
   */
  static async executeSignedPermit2SignatureTransfer(
    executorWallet: Wallet,
    permit2Address: string,
    signedPermit2Transfer: SignedPermitSignatureData,
  ): Promise<ethers.TransactionReceipt> {
    console.log("🚀 Executing Permit2 Transfer On-Chain");
    console.log("=====================================");

    const contract = new Contract(permit2Address, PERMIT2_INTERFACE, executorWallet);

    const { permit, transferDetails, signature, owner } = signedPermit2Transfer;

    console.log("📋 Transfer Details:");
    console.log("  Owner:", owner);
    console.log("  Token:", permit.permitted.token);
    console.log("  Amount:", ethers.formatUnits(permit.permitted.amount, 18), "Token");
    console.log("  To:", transferDetails.to);
    console.log("  Requested Amount:", ethers.formatUnits(transferDetails.requestedAmount, 18), "Token");
    console.log("  Nonce:", permit.nonce);
    console.log("  Deadline:", new Date(Number(permit.deadline) * 1000).toISOString());
    console.log("  Executor:", executorWallet.address);
    console.log();

    try {
      // First, simulate the transaction to catch errors early
      console.log("🔍 Simulating transaction...");
      await contract.permitTransferFrom.staticCall(permit, transferDetails, owner, signature);
      console.log("✅ Simulation successful");
      console.log();

      // Execute the actual transaction
      console.log("📤 Sending transaction...");
      const txResponse = await contract.permitTransferFrom(permit, transferDetails, owner, signature);

      console.log("⏳ Transaction sent:", txResponse.hash);
      console.log("⏳ Waiting for confirmation...");

      // Wait for confirmation
      const txReceipt = await txResponse.wait();

      if (!txReceipt) {
        throw new Error("Transaction failed - no receipt received");
      }

      console.log("✅ Transaction confirmed!");
      console.log("  Block:", txReceipt.blockNumber);
      console.log("  Gas Used:", txReceipt.gasUsed.toString());
      console.log("  Status:", txReceipt.status === 1 ? "Success" : "Failed");
      console.log();

      return txReceipt;
    } catch (error: any) {
      console.error("❌ Permit2 transfer execution failed:");

      // Parse common errors
      if (error.message?.includes("InvalidNonce")) {
        console.error("   → Invalid nonce - permit may have been used already");
      } else if (error.message?.includes("SignatureExpired")) {
        console.error("   → Signature expired - deadline has passed");
      } else if (error.message?.includes("InvalidSignature")) {
        console.error("   → Invalid signature - signature verification failed");
      } else if (error.message?.includes("InsufficientAllowance")) {
        console.error("   → Insufficient allowance - user hasn't approved Permit2");
      } else if (error.message?.includes("InsufficientBalance")) {
        console.error("   → Insufficient token balance");
      } else {
        console.error("   → Error:", error.message);
      }

      throw error;
    }
  }


  async signPermitSingle(signer: Wallet, permitSingle: PermitSingle): Promise<string> {
    const network = await signer.provider!.getNetwork();
    const domain = this.getDomain();
    const types = {
      PermitDetails: PERMIT2_TYPES.PermitDetails,
      PermitSingle: PERMIT2_TYPES.PermitSingle,
    };

    const values = {

    }


    return await signer.signTypedData(domain, types, permitSingle);
  }


}

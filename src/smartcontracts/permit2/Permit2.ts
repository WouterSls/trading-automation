import { Contract, ethers, Signature, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { PERMIT2_INTERFACE } from "../../lib/smartcontract-abis/_index";
import { IPermitSingle } from "../universal-router/universal-router-types";
import { SignedPermit2Transfer } from "../../orders";

//TODO: extract to singature creation to use in no-custodial bot
export class Permit2 {
  private permit2Address: string;
  private chainId: number;

  private permit2Contract: Contract;

  constructor(chain: ChainType) {
    const chainConfig = getChainConfig(chain);
    this.permit2Address = chainConfig.uniswap.permit2Address;
    this.chainId = Number(chainConfig.id);

    if (!this.permit2Address || this.permit2Address.trim() === "") {
      throw new Error(`Permit2 address not defined for chain: ${chainConfig.name}`);
    }

    this.permit2Contract = new ethers.Contract(this.permit2Address, PERMIT2_INTERFACE);
  }

  getPermit2Address = () => this.permit2Address;

  async getPermit2Nonce(wallet: Wallet, owner: string, token: string, spender: string) {
    this.permit2Contract = this.permit2Contract.connect(wallet) as Contract;
    const [allowanceRaw, expiration, nonce] = await this.permit2Contract.allowance(owner, token, spender);
    return nonce;
  }

  /**
   * Executes a signed Permit2 transfer on-chain
   * 
   * @param executorWallet - The wallet that will execute the transaction (pays gas)
   * @param signedPermit2Transfer - The signed permit transfer data
   * @returns Transaction receipt
   */
  async executeSignedPermit2Transfer(
    executorWallet: Wallet, 
    signedPermit2Transfer: SignedPermit2Transfer
  ): Promise<ethers.TransactionReceipt> {
    console.log("🚀 Executing Permit2 Transfer On-Chain");
    console.log("=====================================");
    
    this.permit2Contract = this.permit2Contract.connect(executorWallet) as Contract;
    
    const { permit, transferDetails, signature, owner } = signedPermit2Transfer;
    
    console.log("📋 Transfer Details:");
    console.log("  Owner:", owner);
    console.log("  Token:", permit.permitted.token);
    console.log("  Amount:", ethers.formatUnits(permit.permitted.amount, 6), "USDC");
    console.log("  To:", transferDetails.to);
    console.log("  Requested Amount:", ethers.formatUnits(transferDetails.requestedAmount, 6), "USDC");
    console.log("  Nonce:", permit.nonce);
    console.log("  Deadline:", new Date(permit.deadline * 1000).toISOString());
    console.log("  Executor:", executorWallet.address);
    console.log();

    try {
      // First, simulate the transaction to catch errors early
      console.log("🔍 Simulating transaction...");
      await this.permit2Contract.permitTransferFrom.staticCall(
        permit,
        transferDetails,
        owner,
        signature
      );
      console.log("✅ Simulation successful");
      console.log();

      // Execute the actual transaction
      console.log("📤 Sending transaction...");
      const txResponse = await this.permit2Contract.permitTransferFrom(
        permit,
        transferDetails,
        owner,
        signature,
        {
          gasLimit: 200000, // Set reasonable gas limit
        }
      );

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

  /**
   * Checks if a user has sufficient allowance for Permit2
   */
  async checkPermit2Allowance(
    wallet: Wallet,
    owner: string,
    token: string,
    amount: string
  ): Promise<{ hasAllowance: boolean; currentAllowance: string }> {
    this.permit2Contract = this.permit2Contract.connect(wallet) as Contract;
    
    // Get token contract to check allowance
    const tokenContract = new ethers.Contract(
      token,
      ["function allowance(address owner, address spender) view returns (uint256)"],
      wallet
    );
    
    const currentAllowance = await tokenContract.allowance(owner, this.permit2Address);
    const hasAllowance = currentAllowance >= BigInt(amount);
    
    return {
      hasAllowance,
      currentAllowance: currentAllowance.toString(),
    };
  }

  /**
   * Helper to approve Permit2 for a token (one-time setup)
   */
  async approvePermit2(
    userWallet: Wallet,
    token: string,
    amount: string = ethers.MaxUint256.toString()
  ): Promise<ethers.TransactionReceipt> {
    console.log("🔓 Approving Permit2 for token transfers");
    console.log("========================================");
    
    const tokenContract = new ethers.Contract(
      token,
      ["function approve(address spender, uint256 amount) returns (bool)"],
      userWallet
    );
    
    console.log("📋 Approval Details:");
    console.log("  Token:", token);
    console.log("  Spender (Permit2):", this.permit2Address);
    console.log("  Amount:", amount === ethers.MaxUint256.toString() ? "MAX_UINT256" : amount);
    console.log("  User:", userWallet.address);
    console.log();
    
    try {
      console.log("📤 Sending approval transaction...");
      const txResponse = await tokenContract.approve(this.permit2Address, amount);
      
      console.log("⏳ Transaction sent:", txResponse.hash);
      console.log("⏳ Waiting for confirmation...");
      
      const txReceipt = await txResponse.wait();
      
      if (!txReceipt) {
        throw new Error("Approval transaction failed - no receipt received");
      }
      
      console.log("✅ Approval confirmed!");
      console.log("  Block:", txReceipt.blockNumber);
      console.log("  Gas Used:", txReceipt.gasUsed.toString());
      console.log("💡 User can now create Permit2 signatures for this token");
      console.log();
      
      return txReceipt;
      
    } catch (error) {
      console.error("❌ Approval failed:", error);
      throw error;
    }
  }

  async getPermitSingleSignature(wallet: Wallet, permitSingle: IPermitSingle) {
    this.permit2Contract = this.permit2Contract.connect(wallet) as Contract;
    const provider = wallet.provider;
    if (!provider) throw new Error("No provider linked to wallet");

    const chainId = (await provider.getNetwork()).chainId;

    const domain = {
      name: "Permit2",
      chainId: chainId,
      verifyingContract: this.permit2Address,
    };

    const types = {
      PermitDetails: [
        { name: "token", type: "address" },
        { name: "amount", type: "uint160" },
        { name: "expiration", type: "uint48" },
        { name: "nonce", type: "uint48" },
      ],
      PermitSingle: [
        { name: "details", type: "PermitDetails" },
        { name: "spender", type: "address" },
        { name: "sigDeadline", type: "uint256" },
      ],
    };

    const signature = await wallet.signTypedData(domain, types, permitSingle);
    return signature;
  }

  async getSelfPermitSignature(
    wallet: Wallet,
    token: string,
    value: bigint,
    deadline: number,
  ): Promise<{ signature: string; v: number; r: string; s: string }> {
    const provider = wallet.provider;
    if (!provider) throw new Error("No provider linked to wallet");

    const tokenContract = new ethers.Contract(token, ["function name() view returns (string)"], provider);
    const tokenName = await tokenContract.name();
    const chainId = (await provider.getNetwork()).chainId;

    const domain = {
      name: tokenName,
      version: "1",
      chainId: chainId,
      verifyingContract: token,
    };

    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    // Get current nonce for this owner from the token contract
    const nonceContract = new ethers.Contract(
      token,
      ["function nonces(address owner) view returns (uint256)"],
      provider,
    );
    const nonce = await nonceContract.nonces(wallet.address);

    // Data to sign
    const permitData = {
      owner: wallet.address,
      spender: this.permit2Address, // Router address will be the spender
      value: value,
      nonce: nonce,
      deadline: deadline,
    };

    // Sign the data
    const signature = await wallet.signTypedData(domain, types, permitData);

    // Split the signature for use with selfPermit
    const sig = Signature.from(signature);

    return {
      signature,
      v: sig.v,
      r: sig.r,
      s: sig.s,
    };
  }
}

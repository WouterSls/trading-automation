import { Contract, ethers, Signature, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { PERMIT2_INTERFACE } from "../../lib/smartcontract-abis/_index";
import { IPermitSingle } from "../universal-router/universal-router-types";
import { Permit2Transfer, SignedPermit2Transfer } from "../../orders/order-types";
import { PERMIT2_TYPES, PermitSingle, PermitTransferFrom } from "./permit2-types";


//Permit2 has two distincy ways of interacting with the permit2 contract.
//Allowance based transfer -> update allowance via permit signature siging = preferred when multiple transfers are expected
//Signature based transfer -> single token transfer via signature siging = preferred when single token transfer
export class Permit2 {
  private permit2Address: string;
  private permit2Contract: Contract;

  private chainId: number;

  constructor(chain: ChainType) {
    const chainConfig = getChainConfig(chain);
    this.permit2Address = chainConfig.uniswap.permit2Address;
    this.chainId = Number(chainConfig.id);

    if (!this.permit2Address || this.permit2Address.trim() === "") {
      throw new Error(`Permit2 address not defined for chain: ${chainConfig.name}`);
    }

    this.permit2Contract = new ethers.Contract(this.permit2Address, PERMIT2_INTERFACE);
  }

  getAddress = () => this.permit2Address;
  getDomain = () => {
    return {
      name: "Permit2",
      chainId: this.chainId,
      verifyingContract: this.permit2Address,
    };
  };

  async getPermit2Nonce(wallet: Wallet, owner: string, token: string, spender: string) {
    this.permit2Contract = this.permit2Contract.connect(wallet) as Contract;
    const [allowanceRaw, expiration, nonce] = await this.permit2Contract.allowance(owner, token, spender);
    return nonce;
  }

  /**
   * Gets a valid nonce for ISignatureTransfer (permitTransferFrom)
   * Uses unordered nonces with bitmap system
   * @param wallet - Wallet to connect to contract
   * @param owner - Token owner address
   * @param wordPos - Word position in bitmap (default: 0)
   * @param bitPos - Bit position within word (default: 0)
   * @returns Valid nonce for permitTransferFrom
   */
  async getSignatureTransferNonce(
    wallet: Wallet, 
    owner: string, 
    wordPos: number = 0, 
    bitPos: number = 0
  ): Promise<string> {
    this.permit2Contract = this.permit2Contract.connect(wallet) as Contract;
    
    // Check if the bit is already used
    const bitmap = await this.permit2Contract.nonceBitmap(owner, wordPos);
    const bit = BigInt(1 << bitPos);
    
    if ((bitmap & bit) !== 0n) {
      throw new Error(`Nonce already used: wordPos=${wordPos}, bitPos=${bitPos}`);
    }
    
    // Combine wordPos and bitPos into a single nonce
    const nonce = (BigInt(wordPos) << 8n) | BigInt(bitPos);
    return nonce.toString();
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
    signedPermit2Transfer: SignedPermit2Transfer,
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
      await this.permit2Contract.permitTransferFrom.staticCall(permit, transferDetails, owner, signature);
      console.log("✅ Simulation successful");
      console.log();

      // Execute the actual transaction
      console.log("📤 Sending transaction...");
      const txResponse = await this.permit2Contract.permitTransferFrom(permit, transferDetails, owner, signature, {
        gasLimit: 200000, // Set reasonable gas limit
      });

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

  async signPermitTransferFrom(permit: PermitTransferFrom, spender: string, wallet: Wallet, ): Promise<string> {
    const domain = this.getDomain();
    const types = {
      PermitTransferFrom: PERMIT2_TYPES.PermitTransferFrom,
      TokenPermissions: PERMIT2_TYPES.TokenPermissions,
    };

    const values = {
      permitted: permit.permitted,
      spender: spender,
      nonce: permit.nonce,
      deadline: permit.deadline,
    };

    return await wallet.signTypedData(domain, types, values);
  }

  async signPermitSingle(wallet: Wallet, permitSingle: PermitSingle): Promise<string> {
    const domain = this.getDomain();
    console.log("domain")
    console.log(domain)
    console.log()
    const types = {
      PermitDetails: PERMIT2_TYPES.PermitDetails,
      PermitSingle: PERMIT2_TYPES.PermitSingle,
    };
    console.log("types")
    console.log(types)
    console.log()

    console.log("permit single")
    console.log(permitSingle);
    console.log();

    return await wallet.signTypedData(domain, types, permitSingle);
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

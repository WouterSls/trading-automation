import { Contract, ethers, Signature, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { PERMIT2_INTERFACE } from "../../lib/smartcontract-abis/_index";
import { IPermitSingle } from "../universal-router/universal-router-types";

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

  async getPermitSingleSignature(wallet: Wallet, permitSingle: IPermitSingle) {
    this.permit2Contract = this.permit2Contract.connect(wallet) as Contract;
    const provider = wallet.provider;
    if (!provider) throw new Error("No provider linked to wallet");

    //TODO: test if we can use initialized variable
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

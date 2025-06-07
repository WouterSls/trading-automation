import { Contract, ethers, Signature, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../../config/chain-config";
import { PERMIT2_INTERFACE } from "../../../lib/smartcontract-abis/permit2";
import { IPermitSingle } from "../universal-router/universal-router-types";

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

  async getPermitNonce(wallet: Wallet, owner: string, token: string, spender: string) {
    this.permit2Contract = this.permit2Contract.connect(wallet) as Contract;
    const [allowanceRaw, expiration, nonce] = await this.permit2Contract.allowance(owner, token, spender);
    return nonce;
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
}

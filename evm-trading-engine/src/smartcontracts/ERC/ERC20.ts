import { ethers, Contract } from "ethers";
import { TransactionRequest } from "ethers";
import { UserError } from "../../lib/errors";
import { ERC20_INTERFACE } from "../../lib/smartcontract-abis/_index";

export class ERC20 {
  constructor(
    private name: string,
    private symbol: string,
    private tokenAddress: string,
    private decimals: number,
    private rawTotalSupply: bigint,
    private contract: Contract,
  ) {}

  getName(): string {
    return this.name;
  }

  getSymbol(): string {
    return this.symbol;
  }

  getTokenAddress(): string {
    return this.tokenAddress;
  }

  getDecimals(): number {
    return this.decimals;
  }

  getRawTotalSupply(): bigint {
    return this.rawTotalSupply;
  }

  getRawAllowance(ownerAddress: string, spenderAddres: string) {
    return this.contract.allowance(ownerAddress, spenderAddres);
  }

  async getFormattedTokenBalance(address: string): Promise<number> {
    const balance = await this.contract.balanceOf(address);
    const balanceFormatted = ethers.formatUnits(balance.toString(), this.decimals);
    return parseFloat(balanceFormatted);
  }

  async getRawTokenBalance(address: string): Promise<bigint> {
    return await this.contract.balanceOf(address);
  }

  createApproveTransaction(spenderAddress: string, rawAmount: bigint): TransactionRequest {
    try {
      if (rawAmount <= 0n) throw new UserError("Invalid amount for approve transaction");

      const encodedData = ERC20_INTERFACE.encodeFunctionData("approve", [spenderAddress, rawAmount]);

      const tx: TransactionRequest = {
        to: this.tokenAddress,
        data: encodedData,
      };

      return tx;
    } catch (error) {
      if (error instanceof UserError) throw error;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new UserError(`Failed to create approve transaction: ${errorMessage}`);
    }
  }

  static encodeAllowance(owner: string, spender: string) {
    const encodedData = ERC20_INTERFACE.encodeFunctionData("allowance", [owner, spender]);
    return encodedData;
  }

  static decodeAllowance(data: ethers.BytesLike) {
    const [allowance] = ERC20_INTERFACE.decodeFunctionResult("allowance", data);
    return allowance;
  }
}

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

  public getName(): string {
    return this.name;
  }

  public getSymbol(): string {
    return this.symbol;
  }

  public getTokenAddress(): string {
    return this.tokenAddress;
  }

  public getDecimals(): number {
    return this.decimals;
  }

  public getRawTotalSupply(): bigint {
    return this.rawTotalSupply;
  }

  public getRawAllowance(ownerAddress: string, spenderAddres: string) {
    return this.contract.allowance(ownerAddress, spenderAddres);
  }

  public async getFormattedTokenBalance(address: string): Promise<number> {
    const balance = await this.contract.balanceOf(address);
    const balanceFormatted = ethers.formatUnits(balance.toString(), this.decimals);
    return parseFloat(balanceFormatted);
  }

  public async getRawTokenBalance(address: string): Promise<bigint> {
    return await this.contract.balanceOf(address);
  }

  public createApproveTransaction(spenderAddress: string, rawAmount: bigint): TransactionRequest {
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
}

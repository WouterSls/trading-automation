import { ethers, Contract } from "ethers";
import { TransactionRequest } from "ethers";

export class ERC20 {
  constructor(
    private name: string,
    private symbol: string,
    private tokenAddress: string,
    private decimals: number,
    private totalSupply: string,
    private contract: Contract
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

  public getRawTotalSupply(): string {
    return this.totalSupply;
  }

  public getRawAllowance(ownerAddress: string, spenderAddres: string) {
    return this.contract.allowance(ownerAddress, spenderAddres);
  }

  public async getRawTokenBalance(walletAddress: string): Promise<bigint> {
    return await this.contract.balanceOf(walletAddress);
  }

  public async getFormattedTokenBalance(walletAddress: string): Promise<number> {
    const balance = await this.contract.balanceOf(walletAddress);
    const balanceFormatted = ethers.formatUnits(balance.toString(), this.decimals);
    return parseFloat(balanceFormatted);
  }

  public async createApproveTransaction(spenderAddress: string, rawAmount: bigint): Promise<TransactionRequest> {
    try {
      if (rawAmount <= 0n) throw new Error("Invalid amount for approve transaction");

      const abiInterface = new ethers.Interface([
        "function approve(address spender, uint256 amount) external returns (bool)",
      ]);

      const encodedData = abiInterface.encodeFunctionData("approve", [spenderAddress, rawAmount]);

      const tx: TransactionRequest = {
        to: this.tokenAddress,
        data: encodedData,
      };

      return tx;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to create approve transaction: ${errorMessage}`);
    }
  }
}

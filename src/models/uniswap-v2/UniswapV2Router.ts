import {
  Contract,
  ethers,
  Wallet,
  ContractTransactionResponse,
  ContractTransactionReceipt,
  TransactionRequest,
} from "ethers";

import { ChainConfig, getChainConfig, ChainType } from "../../config/chain-config";
import { ERC20 } from "../ERC/ERC20";
import { TradeSuccessInfo } from "../../lib/types/trading.types";

import { UNISWAP_V2_ROUTER_INTERFACE } from "../../contract-abis/uniswap-v2";
import { calculateSlippageAmount, extractRawTokenOutputFromLogs } from "../../lib/utils";
import { TRADING_CONFIG } from "../../config/setup-config";
import { ITradingStrategy } from "../trading/strategies/interface/ITradingStrategy";

export class UniswapV2Router {
  private readonly NAME = "Uniswap V2 Router";
  private isInitialized = false;

  //Addresses
  private wethAddress: string = "";
  private udscAddress: string = "";
  private routerAddress: string = "";

  //Contract
  private routerContract: Contract | null = null;

  //Constants
  private readonly WEI_DECIMALS = 18;
  private readonly WETH_DECIMALS = 18;
  private readonly USDC_DECIMALS = 6;
  private readonly TRADING_DEADLINE_MINUTES = 20;

  constructor(chain: ChainType) {
    const chainConfig = getChainConfig(chain);

    this.wethAddress = chainConfig.tokenAddresses.weth;
    this.udscAddress = chainConfig.tokenAddresses.usdc!;
    this.routerAddress = chainConfig.uniswapV2.routerAddress;

    if (!this.udscAddress || this.udscAddress.trim() === "") {
      throw new Error(`USDC address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.wethAddress || this.wethAddress.trim() === "") {
      throw new Error(`WETH address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.routerAddress || this.routerAddress.trim() === "") {
      throw new Error(`UniV2 Router address not defined for chain: ${chainConfig.name}`);
    }

    this.routerContract = new ethers.Contract(this.routerAddress, UNISWAP_V2_ROUTER_INTERFACE);

    this.isInitialized = true;
  }

  getName = (): string => this.NAME;
  getWETHAddress = (): string => this.wethAddress;

  /**
   *
   * @pricing
   *
   */
  private async getEthUsdcPrice() {
    if (!this.isInitialized) throw new Error(`${this.NAME} not initialized`);
    const tradePath = [this.wethAddress, this.udscAddress];
    const inputAmount = ethers.parseUnits("1", this.WETH_DECIMALS);

    const amountsOut = await this.routerContract!.getAmountsOut(inputAmount, tradePath);
    const amountOut = amountsOut[amountsOut.length - 1];
    const amountFormatted = ethers.formatUnits(amountOut.toString(), this.USDC_DECIMALS);
    return parseFloat(amountFormatted);
  }
  private async getTokenPriceUsdc(token: ERC20): Promise<number> {
    try {
      if (!this.isInitialized) throw new Error(`${this.NAME} not initialized`);

      const tradePath = [token.getTokenAddress(), this.wethAddress, this.udscAddress];
      const inputAmount = ethers.parseUnits("1", token.getDecimals());

      const amountsOut: BigInt[] = await this.routerContract!.getAmountsOut(inputAmount, tradePath);
      const amountOut = amountsOut[amountsOut.length - 1];

      const amountFormatted = ethers.formatUnits(amountOut.toString(), this.USDC_DECIMALS);

      return parseFloat(amountFormatted);
    } catch (error: unknown) {
      console.error(`Error getting token ${token.getName()} USDC price on UniV2Router: `, error);
      if (error instanceof Error) throw error;
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      throw new Error(`UniV2Router token ${token.getName()} USDC price error: ${errorMessage}`);
    }
  }
  private async getTokenPriceEth(token: ERC20): Promise<number> {
    try {
      if (!this.isInitialized) throw new Error("Router not initialized");

      const tradePath = [token.getTokenAddress(), this.wethAddress];

      const inputAmount = ethers.parseUnits("1", token.getDecimals());

      const amountsOut: BigInt[] = await this.routerContract!.getAmountsOut(inputAmount, tradePath);
      const amountOut = amountsOut[amountsOut.length - 1];

      const amountFormatted = ethers.formatUnits(amountOut.toString(), this.WETH_DECIMALS);
      return parseFloat(amountFormatted);
    } catch (error: unknown) {
      console.error(`Error getting token ${token.getName()} ETH price on UniV2Router: `, error);
      if (error instanceof Error) throw error;
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      throw new Error(`UniV2Router token ${token.getName()} price error: ${errorMessage}`);
    }
  }

  /**
   *
   * @buying
   *
   */
  async simulateBuySwap(wallet: Wallet, token: ERC20, usdValue: number): Promise<void> {
    try {
      if (!this.isInitialized) throw new Error("Router not initialized");

      this.routerContract = this.routerContract!.connect(wallet) as Contract;

      const { minOutputAmount, path, deadline, value } = await this.prepareBuySwapParameters(token, usdValue);

      await this.routerContract!.swapExactETHForTokens.staticCall(minOutputAmount, path, wallet.address, deadline, {
        value,
      });
      console.log(`Transaction simulation for method: swapExactETHForTokens passed | buying`);
    } catch (error: any) {
      console.error("Error simulating buy swap on UniV2Router: ", error);
      const errorMessage = error.toString().includes("reverted") ? error.toString() : "Unknown simulation error";
      throw new Error(`Transaction simulation failed: ${errorMessage}`);
    }
  }
  async swapEthInUsdForToken(wallet: Wallet, token: ERC20, usdValue: number): Promise<TradeSuccessInfo> {
    try {
      if (!this.isInitialized) throw new Error(`${this.NAME} not initialized`);

      this.routerContract = this.routerContract!.connect(wallet) as Contract;

      const { minOutputAmount, path, deadline, value } = await this.prepareBuySwapParameters(token, usdValue);

      await this.simulateBuySwap(wallet, token, usdValue);

      try {
        const tx: ContractTransactionResponse = await this.routerContract!.swapExactETHForTokens(
          minOutputAmount,
          path,
          wallet.address,
          deadline,
          { value },
        );

        const txReceipt: ContractTransactionReceipt | null = await tx.wait();
        if (!txReceipt) throw new Error("Transaction receipt not found");

        const transactionStatus = txReceipt.status;
        if (transactionStatus !== 1) {
          throw new Error("Transaction failed: execution reverted, ran out of gas, or encountered another error");
        }

        const transactionHash = tx.hash;
        const confirmedBlock = txReceipt.blockNumber;
        const gasCost = txReceipt.gasPrice * txReceipt.gasUsed;
        const gasCostFormatted = ethers.formatEther(gasCost);
        const ethSpent = ethers.formatEther(tx.value);
        const logs = txReceipt.logs;

        const rawTokensReceived = extractRawTokenOutputFromLogs(logs, token);
        const formattedTokensReceived = ethers.formatUnits(rawTokensReceived.toString(), token.getDecimals());

        const tokenPriceUsd = await this.getTokenPriceUsdc(token);
        const ethPriceUsd = await this.getEthUsdcPrice();

        return {
          transactionHash: transactionHash,
          confirmedBlock: confirmedBlock,
          gasCost: gasCostFormatted,
          ethSpent: ethSpent,
          rawTokensReceived: rawTokensReceived.toString(),
          formattedTokensReceived: formattedTokensReceived,
          tokenPriceUsd: tokenPriceUsd.toString(),
          ethPriceUsd: ethPriceUsd.toString(),
        };
      } catch (txError: any) {
        console.error("\nTransaction Failed:");
        console.error("Error message:", txError.message);
        if (txError.data) {
          console.error("Error data:", txError.data);
        }
        if (txError.transaction) {
          console.error("Failed transaction details:", {
            to: txError.transaction.to,
            value: ethers.formatEther(txError.transaction.value || 0),
            data: txError.transaction.data,
          });
        }
        throw txError;
      }
    } catch (error: unknown) {
      if (error instanceof Error) throw error;
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      throw new Error(errorMessage);
    }
  }
  private async estimateUsdValueToTokenTrade(
    _token: ERC20,
    _usdValue: number,
  ): Promise<{ tokensReceived: number; priceImpact: number }> {
    try {
      const ethUsdPrice = await this.getEthUsdcPrice();
      const ethForUsdValue = _usdValue / ethUsdPrice;

      const tokenPriceUsd = await this.getTokenPriceUsdc(_token);
      const tokensForUsdValue = _usdValue / tokenPriceUsd;

      const tokensReceived = await this.tokensOutputForEthInput(_token, ethForUsdValue);

      const priceImpact = ((tokensForUsdValue - tokensReceived) / tokensForUsdValue) * 100;

      return {
        tokensReceived: tokensReceived,
        priceImpact: Math.max(0, priceImpact),
      };
    } catch (error: unknown) {
      console.error("Error getting buy output on UniV2Router: ", error);
      if (error instanceof Error) throw error;
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      throw new Error(`UniV2Router buy output error: ${errorMessage}`);
    }
  }
  private async tokensOutputForEthInput(_token: ERC20, _ethInput: number): Promise<number> {
    const inputEthAmount = ethers.parseEther(_ethInput.toFixed(this.WEI_DECIMALS));

    const tradePath = [this.wethAddress, _token.getTokenAddress()];

    const amountsOut = await this.routerContract!.getAmountsOut(inputEthAmount, tradePath);
    const amountOut = amountsOut[amountsOut.length - 1];

    const amountOutFormatted = ethers.formatUnits(amountOut.toString(), _token.getDecimals());

    const actualTokenAmount = parseFloat(amountOutFormatted);

    return actualTokenAmount;
  }
  private async prepareBuySwapParameters(token: ERC20, usdValue: number) {
    const { tokensReceived, priceImpact } = await this.estimateUsdValueToTokenTrade(token, usdValue);

    if (priceImpact > TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE) {
      throw new Error(
        `Price impact too high: ${priceImpact}%, max allowed: ${TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE}%`,
      );
    }

    const ethUsdcPrice = await this.getEthUsdcPrice();
    const ethAmount = usdValue / ethUsdcPrice;
    const slippageAmount = ethAmount * TRADING_CONFIG.SLIPPAGE_TOLERANCE;
    const maxEthToSpend = ethAmount + slippageAmount;
    const maxEthToSpendFormatted = ethers.parseEther(maxEthToSpend.toFixed(this.WEI_DECIMALS));

    const expectedOutputAmount = ethers.parseUnits(tokensReceived.toString(), token.getDecimals());
    const minOutputAmount = (expectedOutputAmount * 95n) / 100n;

    const deadline = Math.floor(Date.now() / 1000) + 60 * this.TRADING_DEADLINE_MINUTES;
    const path = [this.wethAddress, token.getTokenAddress()];

    return {
      minOutputAmount,
      path,
      deadline,
      value: maxEthToSpendFormatted,
      tokensReceived,
    };
  }

  /**
   *
   * @transactions
   *
   */

  /**
   * Creates a buy transaction
   * @param receiverAddress - The address of the receiver
   * @param token - The ERC20 token to buy
   * @param usdAmount - The amount of USD to buy
   * @returns The transaction request
   */
  async createBuyTransaction(receiverAddress: string, token: ERC20, usdAmount: number): Promise<TransactionRequest> {
    /** 
    const { minOutputAmount, path, deadline, value } = await this.prepareBuySwapParameters(token, usdAmount);

    const abiInterface = new ethers.Interface([
      "function swapExactETHForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external payable returns (uint256[] memory amounts)",
    ]);
    const encodedData = abiInterface.encodeFunctionData("swapExactETHForTokens", [
      minOutputAmount,
      path,
      receiverAddress,
      deadline,
    ]);

    const tx: TransactionRequest = {
      to: this.routerAddress,
      data: encodedData,
      value: value,
    };

    return tx;

*/
    throw new Error("Not implemented");
  }
}

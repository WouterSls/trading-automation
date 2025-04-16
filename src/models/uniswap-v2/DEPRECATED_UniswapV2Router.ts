import {
  Contract,
  ethers,
  Wallet,
  ContractTransactionResponse,
  ContractTransactionReceipt,
  TransactionRequest,
} from "ethers";

import { ChainConfig, getChainConfig } from "../../config/chain-config";
import { ERC20 } from "../ERC/ERC20";
import { ChainType, TradeSuccessInfo } from "../../lib/types/trading.types";

import { UNISWAP_V2_ROUTER_INTERFACE } from "../../contract-abis/uniswap-v2";
import { calculateSlippageAmount, extractRawTokenOutputFromLogs } from "../../lib/utils";
import { TRADING_CONFIG } from "../../config/setup-config";

export class DEPRECATED_UniswapV2Router {
  private readonly NAME = "Uniswap V2 Router";
  private isInitialized = false;

  //Addresses
  private wethAddress: string = "";
  private udscAddress: string = "";
  private routerAddress: string = "";
  private walletAddress: string = "";

  //Contract
  private routerContract: Contract | null = null;

  //Constants
  private readonly WEI_DECIMALS = 18;
  private readonly WETH_DECIMALS = 18;
  private readonly USDC_DECIMALS = 6;
  private readonly TRADING_DEADLINE_MINUTES = 20;

  constructor(
    chain: ChainType,
    private wallet: Wallet,
  ) {
    const chainConfig = getChainConfig(chain);

    this.wethAddress = chainConfig.tokenAddresses.weth;
    this.udscAddress = chainConfig.tokenAddresses.usdc!;
    this.routerAddress = chainConfig.uniswapV2.routerAddress;
    this.walletAddress = this.wallet.address;

    if (!this.udscAddress || this.udscAddress.trim() === "") {
      throw new Error(`USDC address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.wethAddress || this.wethAddress.trim() === "") {
      throw new Error(`WETH address not defined for chain: ${chainConfig.name}`);
    }

    if (!this.routerAddress || this.routerAddress.trim() === "") {
      throw new Error(`UniV2 Router address not defined for chain: ${chainConfig.name}`);
    }

    this.routerContract = new ethers.Contract(this.routerAddress, UNISWAP_V2_ROUTER_INTERFACE, this.wallet);

    this.isInitialized = true;
  }

  getName = (): string => this.NAME;
  getWETHAddress = (): string => this.wethAddress;
  getRouterAddress = (): string => this.routerAddress;

  /**
   *
   * @pricing
   *
   */
  async getEthUsdcPrice() {
    if (!this.isInitialized) throw new Error(`${this.NAME} not initialized`);
    const tradePath = [this.wethAddress, this.udscAddress];
    const inputAmount = ethers.parseUnits("1", this.WETH_DECIMALS);
    const amountsOut = await this.routerContract!.getAmountsOut(inputAmount, tradePath);
    const amountOut = amountsOut[amountsOut.length - 1];
    const amountFormatted = ethers.formatUnits(amountOut.toString(), this.USDC_DECIMALS);
    return parseFloat(amountFormatted);
  }
  async getTokenPriceUsdc(token: ERC20): Promise<number> {
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
  async getTokenPriceEth(token: ERC20): Promise<number> {
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
  async simulateBuySwap(token: ERC20, usdValue: number): Promise<void> {
    try {
      if (!this.isInitialized) throw new Error("Router not initialized");

      const { minOutputAmount, path, deadline, value } = await this.prepareBuySwapParameters(token, usdValue);

      await this.routerContract!.swapExactETHForTokens.staticCall(minOutputAmount, path, this.walletAddress, deadline, {
        value,
      });
      console.log(`Transaction simulation for method: swapExactETHForTokens passed | buying`);
    } catch (error: any) {
      const errorMessage = error.toString().includes("reverted") ? error.toString() : "Unknown simulation error";
      throw new Error(`Transaction simulation failed: ${errorMessage}`);
    }
  }
  async swapEthInUsdForToken(token: ERC20, usdValue: number): Promise<TradeSuccessInfo> {
    try {
      if (!this.isInitialized) throw new Error(`${this.NAME} not initialized`);

      const { minOutputAmount, path, deadline, value } = await this.prepareBuySwapParameters(token, usdValue);

      await this.simulateBuySwap(token, usdValue);

      try {
        const tx: ContractTransactionResponse = await this.routerContract!.swapExactETHForTokens(
          minOutputAmount,
          path,
          this.walletAddress,
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

  async createBuyTransaction(token: ERC20, usdAmount: number): Promise<TransactionRequest> {
    const { minOutputAmount, path, deadline, value } = await this.prepareBuySwapParameters(token, usdAmount);

    const abiInterface = new ethers.Interface([
      "function swapExactETHForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external payable returns (uint256[] memory amounts)",
    ]);
    const encodedData = abiInterface.encodeFunctionData("swapExactETHForTokens", [
      minOutputAmount,
      path,
      this.walletAddress,
      deadline,
    ]);

    const tx: TransactionRequest = {
      to: this.routerAddress,
      data: encodedData,
      value: value,
    };

    return tx;
  }

  /**
   *
   * @selling
   *
   */
  async simulateSellSwap(erc20: ERC20, rawSellAmount: bigint): Promise<void> {
    try {
      const rawBalance = await erc20.getRawTokenBalance(this.walletAddress);
      const allowedBalance = await erc20.getRawAllowance(this.walletAddress, this.routerAddress);

      if (rawBalance <= 0n) {
        throw new Error(`No token balance for: ${erc20.getName()}`);
      }

      if (allowedBalance <= 0n) {
        throw new Error(`No allowance for token: ${erc20.getName()}`);
      }

      if (allowedBalance < rawSellAmount) {
        throw new Error(
          `Insufficient allowance for token: ${erc20.getName()} | allowed: ${ethers.formatUnits(
            allowedBalance,
            erc20.getDecimals(),
          )} - sell amount: ${ethers.formatUnits(rawSellAmount, erc20.getDecimals())}`,
        );
      }

      const path = [erc20.getTokenAddress(), this.wethAddress];
      const to = this.walletAddress;
      const deadline = Math.floor(Date.now() / 1000) + 60 * this.TRADING_DEADLINE_MINUTES;

      const amountsOut = await this.routerContract!.getAmountsOut(rawSellAmount, path);

      const expectedOutput: bigint = amountsOut[amountsOut.length - 1];
      const amountOutMin = (expectedOutput * 95n) / 100n;

      await this.routerContract!.swapExactTokensForETH.staticCall(rawSellAmount, amountOutMin, path, to, deadline);

      console.log(`Transaction simulation for method: swapExactTokensForETH passed | sell simulation`);
    } catch (error: any) {
      console.error(`Simulation failed for swapExactTokensForETH:`, error.message);
      const errorMessage = error.toString().includes("reverted") ? error.toString() : "Unknown simulation error";
      throw new Error(`Transaction simulation failed: ${errorMessage}`);
    }
  }
  async swapExactTokenForEth(token: ERC20, rawSellAmount: bigint): Promise<TradeSuccessInfo> {
    try {
      if (!this.isInitialized) throw new Error("Router not initialized");
      const rawBalance = await token.getRawTokenBalance(this.walletAddress);
      const allowedBalance = await token.getRawAllowance(this.walletAddress, this.routerAddress);

      if (rawBalance === 0n) {
        throw new Error(`No balance for token: ${token.getName()}`);
      }

      if (allowedBalance === 0n) {
        throw new Error(`No allowance for token: ${token.getName()}`);
      }

      if (allowedBalance < rawSellAmount) {
        throw new Error(
          `Insufficient allowance for token: ${token.getName()} | allowed: ${ethers.formatUnits(
            allowedBalance,
            token.getDecimals(),
          )} - sell amount: ${ethers.formatUnits(rawSellAmount, token.getDecimals())}`,
        );
      }

      if (rawSellAmount <= 0n) {
        throw new Error(`Insufficient sell amount: ${ethers.formatUnits(rawSellAmount, token.getDecimals())}`);
      }

      if (rawSellAmount > rawBalance) {
        throw new Error(
          `Insufficient balance for token: ${token.getName()} | sell amount: ${ethers.formatUnits(
            rawSellAmount,
            token.getDecimals(),
          )} - balance: ${ethers.formatUnits(rawBalance, token.getDecimals())}`,
        );
      }

      const { rawTokensReceived, priceImpact } = await this.estimateTokenToEthTrade(token, rawSellAmount);

      if (priceImpact > TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE) {
        throw new Error(
          `Price impact too high: ${priceImpact}%, max allowed: ${TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE}%`,
        );
      }

      const slippageAmount = calculateSlippageAmount(rawTokensReceived, TRADING_CONFIG.SLIPPAGE_TOLERANCE);
      const minOutputTokens = rawTokensReceived - slippageAmount;

      const deadline = Math.floor(Date.now() / 1000) + 60 * this.TRADING_DEADLINE_MINUTES;
      const tradePath = [token.getTokenAddress(), this.wethAddress];

      await this.simulateSellSwap(token, rawSellAmount);

      const txResponse: ContractTransactionResponse = await this.routerContract!.swapExactTokensForETH(
        rawSellAmount,
        minOutputTokens,
        tradePath,
        this.walletAddress,
        deadline,
      );

      const txReceipt: ContractTransactionReceipt | null = await txResponse.wait();
      if (!txReceipt) throw new Error("Transaction receipt not found");

      const transactionStatus = txReceipt.status;
      if (transactionStatus !== 1) {
        throw new Error("Transaction failed: execution reverted, ran out of gas, or encountered another error");
      }

      const transactionHash = txResponse.hash;
      const confirmedBlock = txReceipt.blockNumber;
      const gasCost = txReceipt.gasPrice * txReceipt.gasUsed;
      const gasCostFormatted = ethers.formatEther(gasCost);
      const logs = txReceipt.logs;

      const ethReceivedWei = logs[logs.length - 1].data;
      const ethReceived = parseFloat(ethers.formatEther(ethReceivedWei));

      const tokenPriceUsd = await this.getTokenPriceUsdc(token);
      const ethPriceUsd = await this.getEthUsdcPrice();

      return {
        transactionHash: transactionHash,
        confirmedBlock: confirmedBlock,
        gasCost: gasCostFormatted,
        rawTokensSpent: rawSellAmount.toString(),
        formattedTokensSpent: ethers.formatUnits(rawSellAmount.toString(), token.getDecimals()),
        ethReceived: ethReceived.toString(),
        tokenPriceUsd: tokenPriceUsd.toString(),
        ethPriceUsd: ethPriceUsd.toString(),
      };
    } catch (error: any) {
      console.error(`Transaction failed for swapExactTokensForETH:`, error.message);
      const errorMessage = error.toString().includes("reverted") ? error.toString() : "Unknown simulation error";
      throw new Error(`Transaction failed: ${errorMessage}`);
    }
  }
  private async estimateTokenToEthTrade(
    token: ERC20,
    rawSellAmount: bigint,
  ): Promise<{ rawTokensReceived: bigint; priceImpact: number }> {
    try {
      if (!this.isInitialized) throw new Error("Router not initialized");

      const tokenPrice = await this.getTokenPriceEth(token);

      const tradePath = [token.getTokenAddress(), this.wethAddress];

      const amountsOut: BigInt[] = await this.routerContract!.getAmountsOut(rawSellAmount, tradePath);
      const amountOut = amountsOut[amountsOut.length - 1];

      const rawTokensReceived = BigInt(amountOut.toString());

      const formattedTokensReceived = ethers.formatUnits(amountOut.toString(), this.WETH_DECIMALS);
      const tokensReceived = parseFloat(formattedTokensReceived);

      const formattedSellAmount = ethers.formatUnits(rawSellAmount.toString(), token.getDecimals());
      const sellAmount = parseFloat(formattedSellAmount);

      const priceImpact = ((tokenPrice - tokensReceived / sellAmount) / tokenPrice) * 100;

      return {
        rawTokensReceived: rawTokensReceived,
        priceImpact: Math.max(0, priceImpact),
      };
    } catch (error: unknown) {
      console.error("Estimation error for sell swap on UniV2Router | selling estimation");
      if (error instanceof Error) throw error;
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      throw new Error(`UniV2Router sell estimation error: ${errorMessage}`);
    }
  }
}

import { ethers, TransactionReceipt, TransactionRequest, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { ITradingStrategy } from "./ITradingStrategy";
import { Quote, TradeConfirmation, TradeType } from "./types/_index";
import { decodeLogs, determineTradeType } from "../../lib/utils";
import { ERC20_INTERFACE } from "../../lib/smartcontract-abis/erc20";
import { TRADING_CONFIG } from "../../config/trading-config";
import { TradeCreationDto } from "./types/dto/TradeCreationDto";

export class Trader {
  constructor(
    private wallet: Wallet,
    private chain: ChainType,
    private strategies: ITradingStrategy[],
  ) {}

  getChain = (): ChainType => this.chain;
  getStrategies = (): ITradingStrategy[] => this.strategies;

  async trade(tradeRequest: TradeCreationDto): Promise<TradeConfirmation> {
    const bestStrategy: ITradingStrategy = await this.getBestStrategy(tradeRequest);

    console.log("Checking approval...");
    const approvalGasCost = await bestStrategy.ensureTokenApproval(
      this.wallet,
      tradeRequest.inputToken,
      tradeRequest.inputAmount,
    );
    console.log("Approval checked!");

    const ethUsdPriceSnapshot = await bestStrategy.getEthUsdcPrice(this.wallet);

    console.log("Creating buy transaction...");
    const tx = await bestStrategy.createTransaction(tradeRequest, this.wallet);
    console.log("Transaction created!");

    try {
      console.log("Verifying transaction...");
      await this.wallet.call(tx);
      console.log("Transaction passed!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An Unknown Error Occurred";
      console.log(errorMessage);
    }

    console.log("Sending transaction...");
    const txResponse = await this.wallet.sendTransaction(tx);
    const txReceipt = await txResponse.wait();
    if (!txReceipt) throw new Error("Transaction failed");
    console.log("Transaction confirmed!");

    const tradeConfirmation: TradeConfirmation = await this.createTradeConfirmation(
      tradeRequest,
      bestStrategy.getName(),
      ethUsdPriceSnapshot,
      approvalGasCost,
      tx,
      txReceipt,
    );

    return tradeConfirmation;
  }

  /**
   * Finds the optimal strategy for a trade by comparing quotes
   *
   * @param trade The buy trade to optimize for
   * @returns The best strategy for this specific trade
   */
  private async getBestStrategy(trade: TradeCreationDto): Promise<ITradingStrategy> {
    let bestStrategy: ITradingStrategy | null = null;
    let bestQuote: Quote | null = null;

    console.log("Comparing buy trade quotes across strategies...");

    for (const strategy of this.strategies) {
      try {
        console.log(`Getting quote from ${strategy.getName()}...`);
        const quote = await strategy.getQuote(trade, this.wallet);

        console.log(`${strategy.getName()}:`);
        console.log(`  Output: ${quote.outputAmount}`);
        console.log(`  Price Impact: ${quote.priceImpact}%`);
        console.log(`  Route: ${quote.route.path.join(" → ")}`);

        if (!bestQuote || bestQuote.outputAmount < quote.outputAmount) {
          bestQuote = quote;
          bestStrategy = strategy;
        }
      } catch (error) {
        console.warn(`${strategy.getName()} failed to provide quote:`, error);
        continue;
      }
    }

    if (!bestStrategy || !bestQuote) {
      throw new Error(`No strategy could provide a valid quote for trade`);
    }

    if (bestQuote.priceImpact > TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE) {
      throw new Error(
        `Price impact too high: ${bestQuote.priceImpact.toFixed(2)}%, max allowed: ${TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE}%`,
      );
    }

    console.log(`Best strategy: ${bestStrategy.getName()}`);
    return bestStrategy;
  }

  private async createTradeConfirmation(
    trade: TradeCreationDto,
    strategy: string,
    ethUsdPrice: string,
    approvalGasCost: string | null,
    tx: TransactionRequest,
    txReceipt: TransactionReceipt,
  ): Promise<TradeConfirmation> {
    const txHash = txReceipt.hash;
    const confirmedBlock = txReceipt.blockNumber;

    const gasCostRaw = txReceipt.gasUsed * (txReceipt.gasPrice || 0n);
    const approvalGastCostRaw = ethers.parseEther(approvalGasCost || "0");
    const gasCost = ethers.formatEther(gasCostRaw + approvalGastCostRaw);

    let ethSpent = "0";
    let ethSpentFormatted = "0";

    let ethReceived = "0";
    let ethReceivedFormatted = "0";

    let tokensReceived = "0";
    let tokensReceivedFormatted = "0";

    let tokensSpent = "0";
    let tokensSpentFormatted = "0";

    const tradeType: TradeType = determineTradeType(trade);

    switch (tradeType) {
      case TradeType.ETHInputTOKENOutput:
        const ethInputResult = await this.extractEthToTokenTradeResult(trade, tx, txReceipt);
        ethSpent = ethInputResult.ethSpent;
        ethReceived = ethInputResult.ethReceived;
        tokensSpent = ethInputResult.tokensSpent;
        tokensReceived = ethInputResult.tokensReceived;
        ethSpentFormatted = ethInputResult.ethSpentFormatted;
        ethReceivedFormatted = ethInputResult.ethReceivedFormatted;
        tokensSpentFormatted = ethInputResult.tokensSpentFormatted;
        tokensReceivedFormatted = ethInputResult.tokensReceivedFormatted;
        break;
      case TradeType.TOKENInputETHOutput:
        const ethOutputResult = await this.extractTokenToEthTradeResult(trade, tx, txReceipt);
        ethSpent = ethOutputResult.ethSpent;
        ethReceived = ethOutputResult.ethReceived;
        tokensSpent = ethOutputResult.tokensSpent;
        tokensReceived = ethOutputResult.tokensReceived;
        ethSpentFormatted = ethOutputResult.ethSpentFormatted;
        ethReceivedFormatted = ethOutputResult.ethReceivedFormatted;
        tokensSpentFormatted = ethOutputResult.tokensSpentFormatted;
        tokensReceivedFormatted = ethOutputResult.tokensReceivedFormatted;
        break;
      case TradeType.TOKENInputTOKENOutput:
        const result = await this.extractTokenToTokenTradeResult(trade, tx, txReceipt);
        ethSpent = result.ethSpent;
        ethReceived = result.ethReceived;
        tokensSpent = result.tokensSpent;
        tokensReceived = result.tokensReceived;
        ethSpentFormatted = result.ethSpentFormatted;
        ethReceivedFormatted = result.ethReceivedFormatted;
        tokensSpentFormatted = result.tokensSpentFormatted;
        tokensReceivedFormatted = result.tokensReceivedFormatted;
        break;
    }

    let tokenPriceUsd = "0";
    if (parseFloat(tokensSpentFormatted) > 0 && parseFloat(tokensReceivedFormatted) > 0) {
      // For sell trades: Token Price = USD received / Tokens spent
      // Assuming USDC ≈ 1 USD, or if receiving ETH, convert ETH to USD
      let usdReceived = parseFloat(tokensReceivedFormatted);

      // If output token is ETH, convert to USD using ETH price
      if (trade.outputToken === ethers.ZeroAddress && parseFloat(ethUsdPrice) > 0) {
        usdReceived = parseFloat(tokensReceivedFormatted) * parseFloat(ethUsdPrice);
      }

      tokenPriceUsd = (usdReceived / parseFloat(tokensSpentFormatted)).toString();
    } else {
      console.log("⚠️  Cannot calculate token price - missing token amounts");
      console.log(`  - Tokens spent: ${tokensSpentFormatted}`);
      console.log(`  - Tokens received: ${tokensReceivedFormatted}`);
    }

    const tradeConfirmation: TradeConfirmation = {
      strategy,
      transactionHash: txHash,
      confirmedBlock,
      gasCost,
      tokenPriceUsd,
      ethPriceUsd: ethUsdPrice,
      ethSpent,
      ethReceived,
      tokensSpent,
      tokensReceived,
      ethSpentFormatted,
      ethReceivedFormatted,
      tokensSpentFormatted,
      tokensReceivedFormatted,
    };

    return tradeConfirmation;
  }

  private async extractEthToTokenTradeResult(
    trade: TradeCreationDto,
    tx: TransactionRequest,
    txReceipt: TransactionReceipt,
  ): Promise<{
    ethSpent: string;
    ethReceived: string;
    tokensSpent: string;
    tokensReceived: string;
    ethSpentFormatted: string;
    ethReceivedFormatted: string;
    tokensSpentFormatted: string;
    tokensReceivedFormatted: string;
  }> {
    const tokensSpent = "0";
    const tokensSpentFormatted = "0";
    const ethReceived = "0";
    const ethReceivedFormatted = "0";

    if (!tx.value) throw new Error("No tx value for ETH input transaction");

    const ethSpent = tx.value.toString();
    const ethSpentFormatted = ethers.formatEther(ethSpent);
    let tokensReceived = "0";
    let tokensReceivedFormatted = "0";

    const decodedLogs = decodeLogs(txReceipt.logs);

    // OUTPUT TOKEN CALCULATIONS
    const encodedOutputTokenData = ERC20_INTERFACE.encodeFunctionData("decimals", []);
    const outputTokenDecimalsTx: TransactionRequest = {
      to: trade.outputToken,
      data: encodedOutputTokenData,
    };
    const rawOutputTokenTxResult = await this.wallet.call(outputTokenDecimalsTx);
    const [outputDecimals] = ERC20_INTERFACE.decodeFunctionResult("decimals", rawOutputTokenTxResult);

    const outputTokenTransfers = decodedLogs.filter(
      (log: any) =>
        log.type === "ERC20 Transfer" &&
        log.contract.toLowerCase() === trade.outputToken.toLowerCase() &&
        log.to.toLowerCase() === this.wallet.address.toLowerCase(),
    );

    if (outputTokenTransfers.length > 0) {
      const finalTransfer = outputTokenTransfers[outputTokenTransfers.length - 1];
      tokensReceived = finalTransfer.amount.toString();
      tokensReceivedFormatted = ethers.formatUnits(finalTransfer.amount, outputDecimals);
    } else {
      console.log("⚠️  No token transfers found to wallet address");
    }

    return {
      ethSpent,
      ethReceived,
      tokensSpent,
      tokensReceived,
      ethSpentFormatted,
      ethReceivedFormatted,
      tokensSpentFormatted,
      tokensReceivedFormatted,
    };
  }

  private async extractTokenToEthTradeResult(
    trade: TradeCreationDto,
    tx: TransactionRequest,
    txReceipt: TransactionReceipt,
  ): Promise<{
    ethSpent: string;
    ethReceived: string;
    tokensSpent: string;
    tokensReceived: string;
    ethSpentFormatted: string;
    ethReceivedFormatted: string;
    tokensSpentFormatted: string;
    tokensReceivedFormatted: string;
  }> {
    let tokensSpent = "0";
    let tokensSpentFormatted = "0";
    let ethReceived = "0";
    let ethReceivedFormatted = "0";

    const ethSpent = "0";
    const ethSpentFormatted = ethers.formatEther(ethSpent);
    let tokensReceived = "0"; // TEMP
    let tokensReceivedFormatted = "0"; // TEMP

    const decodedLogs = decodeLogs(txReceipt.logs);
    // INPUT DECIMALS
    const encodedInputTokenData = ERC20_INTERFACE.encodeFunctionData("decimals", []);
    const inputTokenDecimalsTx: TransactionRequest = {
      to: trade.inputToken,
      data: encodedInputTokenData,
    };
    const rawInputTokenTxResult = await this.wallet.call(inputTokenDecimalsTx);
    const [inputDecimals] = ERC20_INTERFACE.decodeFunctionResult("decimals", rawInputTokenTxResult);

    // OUTPUT DECIMALS
    const outputDecimals = 18n;

    const chainConfig = getChainConfig(this.chain);
    const wethAddress = chainConfig.tokenAddresses.weth;

    const wethToWalletTransfers = decodedLogs.filter(
      (log: any) =>
        log.type === "ERC20 Transfer" &&
        log.contract.toLowerCase() === wethAddress.toLowerCase() &&
        log.to.toLowerCase() === this.wallet.address.toLowerCase(),
    );

    if (wethToWalletTransfers.length > 0) {
      const finalTransfer = wethToWalletTransfers[wethToWalletTransfers.length - 1];
      tokensReceived = finalTransfer.amount.toString();
      tokensReceivedFormatted = ethers.formatUnits(finalTransfer.amount, outputDecimals);
    }

    // Look for WETH withdrawal events by the router (not wallet) to calculate actual ETH received
    const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Uniswap V2 Router
    const wethWithdrawals = decodedLogs.filter(
      (log: any) =>
        log.type === "WETH Withdrawal" &&
        log.contract.toLowerCase() === wethAddress.toLowerCase() &&
        log.src.toLowerCase() === routerAddress.toLowerCase(),
    );

    if (wethWithdrawals.length > 0) {
      // Sum all WETH withdrawals by the router
      const totalWithdrawn = wethWithdrawals.reduce((total: bigint, withdrawal: any) => {
        return total + withdrawal.wad;
      }, 0n);
      ethReceived = ethers.formatEther(totalWithdrawn);
      tokensReceivedFormatted = ethReceived; // For ETH output, received amount = ETH received
      tokensReceived = totalWithdrawn.toString();
    } else {
      // Fallback: Look for Uniswap V2 Swap events to calculate ETH output
      const v2Swaps = decodedLogs.filter((log: any) => log.type === "Uniswap V2 Swap");

      for (const swap of v2Swaps) {
        // In a UNI->ETH swap, we need to find which amount represents ETH
        // Check if this pair involves WETH by looking at token0/token1
        // For now, use the larger output amount as ETH (common pattern)
        const amount0Out = swap.amount0Out;
        const amount1Out = swap.amount1Out;

        if (amount0Out > 0n) {
          ethReceived = ethers.formatEther(amount0Out);
          tokensReceivedFormatted = ethReceived;
          tokensReceived = amount0Out.toString();
          break;
        } else if (amount1Out > 0n) {
          ethReceived = ethers.formatEther(amount1Out);
          tokensReceivedFormatted = ethReceived;
          tokensReceived = amount1Out.toString();
          break;
        }
      }
    }

    return {
      ethSpent,
      ethReceived,
      tokensSpent,
      tokensReceived,
      ethSpentFormatted,
      ethReceivedFormatted,
      tokensSpentFormatted,
      tokensReceivedFormatted,
    };
  }

  private async extractTokenToTokenTradeResult(
    trade: TradeCreationDto,
    tx: TransactionRequest,
    txReceipt: TransactionReceipt,
  ): Promise<{
    ethSpent: string;
    ethReceived: string;
    tokensSpent: string;
    tokensReceived: string;
    ethSpentFormatted: string;
    ethReceivedFormatted: string;
    tokensSpentFormatted: string;
    tokensReceivedFormatted: string;
  }> {
    let tokensSpent = "0";
    let tokensSpentFormatted = "0";
    let ethReceived = "0";
    let ethReceivedFormatted = "0";

    const ethSpent = "0";
    const ethSpentFormatted = ethers.formatEther(ethSpent);
    let tokensReceived = "0"; // TEMP
    let tokensReceivedFormatted = "0"; // TEMP

    const decodedLogs = decodeLogs(txReceipt.logs);

    // INPUT DECIMALS
    const encodedInputTokenData = ERC20_INTERFACE.encodeFunctionData("decimals", []);
    const inputTokenDecimalsTx: TransactionRequest = {
      to: trade.inputToken,
      data: encodedInputTokenData,
    };
    const rawInputTokenTxResult = await this.wallet.call(inputTokenDecimalsTx);
    const [inputDecimals] = ERC20_INTERFACE.decodeFunctionResult("decimals", rawInputTokenTxResult);

    // OUTPUT DECIMALS
    const encodedOutputTokenData = ERC20_INTERFACE.encodeFunctionData("decimals", []);
    const outputTokenDecimalsTx: TransactionRequest = {
      to: trade.outputToken,
      data: encodedOutputTokenData,
    };
    const rawOutputTokenTxResult = await this.wallet.call(outputTokenDecimalsTx);
    const [outputDecimals] = ERC20_INTERFACE.decodeFunctionResult("decimals", rawOutputTokenTxResult);

    /**
      const firstTransfer = spendingTokenTransfers[0];
      rawTokensSpent = firstTransfer.amount.toString();
      formattedTokensSpent = ethers.formatUnits(firstTransfer.amount, inputDecimals);
      */
    const tokenTransfers = decodedLogs.filter(
      (log: any) =>
        log.type === "ERC20 Transfer" &&
        log.contract.toLowerCase() === trade.outputToken.toLowerCase() &&
        log.to.toLowerCase() === this.wallet.address.toLowerCase(),
    );

    if (tokenTransfers.length > 0) {
      const finalTransfer = tokenTransfers[tokenTransfers.length - 1];
      tokensReceived = finalTransfer.amount.toString();
      tokensReceivedFormatted = ethers.formatUnits(finalTransfer.amount, outputDecimals);
    } else {
      console.log("⚠️  No token transfers found to wallet address");
    }

    return {
      ethSpent,
      ethReceived,
      tokensSpent,
      tokensReceived,
      ethSpentFormatted,
      ethReceivedFormatted,
      tokensSpentFormatted,
      tokensReceivedFormatted,
    };
  }
}

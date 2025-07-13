import { ethers, TransactionReceipt, TransactionRequest, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../config/chain-config";
import { ITradingStrategy } from "./ITradingStrategy";
import { Quote, TradeConfirmation, TradeType } from "./types/_index";
import { decodeLogs, determineTradeType } from "../lib/utils";
import { ERC20_INTERFACE } from "../lib/smartcontract-abis/erc20";
import { TRADING_CONFIG } from "../config/trading-config";
import { TradeCreationDto } from "./types/dto/TradeCreationDto";

export class Trader {
  constructor(
    private wallet: Wallet,
    private chain: ChainType,
    private strategies: ITradingStrategy[],
  ) {}

  getChain = (): ChainType => this.chain;
  getStrategies = (): ITradingStrategy[] => this.strategies;

  async quote(tradeRequest: TradeCreationDto): Promise<Quote> {
    await this.validateTrade(tradeRequest);

    const bestStrategy: ITradingStrategy = await this.getBestStrategy(tradeRequest);

    return await bestStrategy.getQuote(tradeRequest, this.wallet);
  }

  async trade(tradeRequest: TradeCreationDto): Promise<TradeConfirmation> {
    await this.validateTrade(tradeRequest);

    const bestStrategy: ITradingStrategy = await this.getBestStrategy(tradeRequest);

    console.log("Checking approval...");
    const approvalGasCost = await bestStrategy.ensureTokenApproval(
      tradeRequest.inputToken,
      tradeRequest.inputAmount,
      this.wallet,
    );
    console.log("Approval checked!");

    const ethUsdPriceSnapshot = await bestStrategy.getEthUsdcPrice(this.wallet);
    const quote = await bestStrategy.getQuote(tradeRequest, this.wallet);

    console.log("Creating transaction...");
    const tx = await bestStrategy.createTransaction(tradeRequest, this.wallet);
    console.log("Transaction created!");

    try {
      console.log("Verifying transaction...");
      await this.wallet.call(tx);
      console.log("Transaction passed!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An Unknown Error Occurred";
      console.log(errorMessage);
      throw error;
    }

    console.log("Sending transaction...");
    const txResponse = await this.wallet.sendTransaction(tx);
    const txReceipt = await txResponse.wait();
    if (!txReceipt) throw new Error("Transaction failed");
    console.log("Transaction confirmed!");

    const tradeConfirmation: TradeConfirmation = await this.createTradeConfirmation(
      tradeRequest,
      quote,
      ethUsdPriceSnapshot,
      approvalGasCost,
      tx,
      txReceipt,
    );

    return tradeConfirmation;
  }

  private validateTrade(tradeRequest: TradeCreationDto) {
    const inputAmountNumber = Number(tradeRequest.inputAmount);

    if (isNaN(inputAmountNumber)) {
      throw new Error("Input Amount is not a valid number");
    }

    if (inputAmountNumber <= 0) {
      throw new Error("Input Amount must be greater than zero");
    }
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

    console.log("Comparing trade quotes across strategies...");

    for (const strategy of this.strategies) {
      try {
        console.log(`Getting quote from ${strategy.getName()}...`);
        const quote = await strategy.getQuote(trade, this.wallet);

        console.log(`${strategy.getName()}:`);
        console.log(`  Output: ${quote.outputAmount}`);
        console.log(`  Route: ${quote.route.path.join(" → ")}`);

        if (!bestQuote || bestQuote.route.amountOut < quote.route.amountOut) {
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

    console.log(`Best strategy: ${bestStrategy.getName()}`);
    return bestStrategy;
  }

  private async createTradeConfirmation(
    trade: TradeCreationDto,
    quote: Quote,
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

    const tradeConfirmation: TradeConfirmation = {
      quote,
      transactionHash: txHash,
      confirmedBlock,
      gasCost,
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

    const receivingTokenTransfers = decodedLogs.filter(
      (log: any) =>
        log.type === "ERC20 Transfer" &&
        log.contract.toLowerCase() === trade.outputToken.toLowerCase() &&
        log.to.toLowerCase() === this.wallet.address.toLowerCase(),
    );

    if (receivingTokenTransfers.length > 0) {
      const finalTransfer = receivingTokenTransfers[receivingTokenTransfers.length - 1];
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
    let tokensReceived = "0";
    let tokensReceivedFormatted = "0";

    const decodedLogs = decodeLogs(txReceipt.logs);

    // TOKEN INPUT -> TRANSFER EVENT FROM WALLET, SENDING TOKENS
    const encodedInputTokenData = ERC20_INTERFACE.encodeFunctionData("decimals", []);
    const inputTokenDecimalsTx: TransactionRequest = {
      to: trade.inputToken,
      data: encodedInputTokenData,
    };
    const rawInputTokenTxResult = await this.wallet.call(inputTokenDecimalsTx);
    const [inputDecimals] = ERC20_INTERFACE.decodeFunctionResult("decimals", rawInputTokenTxResult);

    const sendingTokenTransfersLogs = decodedLogs.filter(
      (log: any) => log.type === "ERC20 Transfer" && log.from.toLowerCase() === this.wallet.address.toLowerCase(),
    );

    if (sendingTokenTransfersLogs.length > 0) {
      const finalTransfer = sendingTokenTransfersLogs[sendingTokenTransfersLogs.length - 1];
      tokensSpent = finalTransfer.amount.toString();
      tokensSpentFormatted = ethers.formatUnits(finalTransfer.amount, inputDecimals);
    } else {
      console.log("⚠️  No token transfers found to wallet address");
    }

    // RECEIVED TOKENS (ETH)
    // Look for WETH withdrawal events
    const wethWithdrawalLogs = decodedLogs.filter((log: any) => log.type === "WETH Withdrawal");

    if (wethWithdrawalLogs.length > 0) {
      const totalWithdrawn = wethWithdrawalLogs.reduce((total: bigint, withdrawal: any) => {
        return total + withdrawal.wad;
      }, 0n);
      ethReceivedFormatted = ethers.formatEther(totalWithdrawn);
      ethReceived = totalWithdrawn.toString();
    } else {
      console.error("Error extracting logs with type WETH Withdrawal");
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
    let tokensReceived = "0";
    let tokensReceivedFormatted = "0";

    const decodedLogs = decodeLogs(txReceipt.logs);

    // TOKEN INPUT -> TRANSFER EVENT FROM WALLET, SENDING TOKENS
    const encodedInputTokenData = ERC20_INTERFACE.encodeFunctionData("decimals", []);
    const inputTokenDecimalsTx: TransactionRequest = {
      to: trade.inputToken,
      data: encodedInputTokenData,
    };
    const rawInputTokenTxResult = await this.wallet.call(inputTokenDecimalsTx);
    const [inputDecimals] = ERC20_INTERFACE.decodeFunctionResult("decimals", rawInputTokenTxResult);

    const sendingTokenTransfersLogs = decodedLogs.filter(
      (log: any) => log.type === "ERC20 Transfer" && log.from.toLowerCase() === this.wallet.address.toLowerCase(),
    );

    if (sendingTokenTransfersLogs.length > 0) {
      const finalTransfer = sendingTokenTransfersLogs[sendingTokenTransfersLogs.length - 1];
      tokensSpent = finalTransfer.amount.toString();
      tokensSpentFormatted = ethers.formatUnits(finalTransfer.amount, inputDecimals);
    } else {
      console.log("⚠️  No token transfers found to wallet address");
    }

    // OUTPUT TOKEN CALCULATIONS
    const encodedOutputTokenData = ERC20_INTERFACE.encodeFunctionData("decimals", []);
    const outputTokenDecimalsTx: TransactionRequest = {
      to: trade.outputToken,
      data: encodedOutputTokenData,
    };
    const rawOutputTokenTxResult = await this.wallet.call(outputTokenDecimalsTx);
    const [outputDecimals] = ERC20_INTERFACE.decodeFunctionResult("decimals", rawOutputTokenTxResult);

    const receivingTokenTransfers = decodedLogs.filter(
      (log: any) =>
        log.type === "ERC20 Transfer" &&
        log.contract.toLowerCase() === trade.outputToken.toLowerCase() &&
        log.to.toLowerCase() === this.wallet.address.toLowerCase(),
    );

    if (receivingTokenTransfers.length > 0) {
      const finalTransfer = receivingTokenTransfers[receivingTokenTransfers.length - 1];
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

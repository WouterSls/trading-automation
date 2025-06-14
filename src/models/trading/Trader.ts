import { ethers, TransactionReceipt, TransactionRequest, Wallet } from "ethers";
import { ChainType, getOutputTokenAddress, getChainConfig } from "../../config/chain-config";
import { ITradingStrategy } from "./ITradingStrategy";
import { BuyTrade, BuyTradeCreationDto, Quote, SellTrade, SellTradeCreationDto } from "./types/_index";
import { decodeLogs } from "../../lib/utils";
import { ERC20_INTERFACE } from "../../lib/smartcontract-abis/erc20";
import { TRADING_CONFIG } from "../../config/trading-config";

export class Trader {
  constructor(
    private wallet: Wallet,
    private chain: ChainType,
    private strategies: ITradingStrategy[],
  ) {}

  getChain = (): ChainType => this.chain;
  getStrategies = (): ITradingStrategy[] => this.strategies;

  async buy(trade: BuyTradeCreationDto): Promise<BuyTrade> {
    const bestStrategy: ITradingStrategy = await this.getBestBuyStrategy(trade);

    const ethUsdcPrice = await bestStrategy.getEthUsdcPrice(this.wallet);

    console.log("Creating buy transaction...");
    const tx = await bestStrategy.createBuyTransaction(this.wallet, trade);
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

    const buyTrade: BuyTrade = await this.createBuyTrade(
      bestStrategy.getName(),
      trade.outputToken,
      ethUsdcPrice,
      tx,
      txReceipt,
    );
    return buyTrade;
  }

  async sell(trade: SellTradeCreationDto): Promise<SellTrade> {
    const bestStrategy = await this.getBestSellStrategy(trade);

    const ethUsdcPrice = await bestStrategy.getEthUsdcPrice(this.wallet);

    console.log("Checking approval...");
    const approvalGasCost: string | null = await bestStrategy.ensureTokenApproval(
      this.wallet,
      trade.inputToken,
      trade.inputAmount,
    );

    if (approvalGasCost) {
      console.log("Approved new allowance!");
      console.log("Gas cost:", approvalGasCost);
    } else {
      console.log("No new approval needed!");
    }

    console.log("Creating sell transaction...");
    const tx = await bestStrategy.createSellTransaction(this.wallet, trade);
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

    const inputTokenAddress = trade.inputToken;
    const outputTokenAddress = getOutputTokenAddress(trade.chain, trade.outputToken);

    const sellTrade = await this.createSellTrade(
      bestStrategy.getName(),
      inputTokenAddress,
      outputTokenAddress,
      ethUsdcPrice,
      tx,
      txReceipt,
    );

    return sellTrade;
  }

  /**
   * Finds the optimal strategy for a buy trade by comparing actual trade quotes
   * @param trade The buy trade to optimize for
   * @returns The best strategy for this specific trade
   */
  private async getBestBuyStrategy(trade: BuyTradeCreationDto): Promise<ITradingStrategy> {
    let bestStrategy: ITradingStrategy | null = null;
    let bestQuote: Quote | null = null;

    console.log("Comparing buy trade quotes across strategies...");

    for (const strategy of this.strategies) {
      try {
        console.log(`Getting quote from ${strategy.getName()}...`);
        const quote = await strategy.getBuyTradeQuote(this.wallet, trade);

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
      throw new Error(`No strategy could provide a valid quote for buy trade`);
    }

    if (bestQuote.priceImpact > TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE) {
      throw new Error(
        `Price impact too high: ${bestQuote.priceImpact.toFixed(2)}%, max allowed: ${TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE}%`,
      );
    }

    console.log(`Best strategy: ${bestStrategy.getName()}`);
    return bestStrategy;
  }

  /**
   * Finds the optimal strategy for a sell trade by comparing actual trade quotes
   * @param trade The sell trade to optimize for
   * @returns The best strategy for this specific trade
   */
  private async getBestSellStrategy(trade: SellTradeCreationDto): Promise<ITradingStrategy> {
    let bestStrategy: ITradingStrategy | null = null;
    let bestQuote: Quote | null = null;

    console.log("Comparing sell trade quotes across strategies...");

    for (const strategy of this.strategies) {
      try {
        console.log(`Getting quote from ${strategy.getName()}...`);
        const quote = await strategy.getSellTradeQuote(this.wallet, trade);

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
      throw new Error(`No strategy could provide a valid quote for sell trade`);
    }

    if (bestQuote.priceImpact > TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE) {
      throw new Error(
        `Price impact too high: ${bestQuote.priceImpact.toFixed(2)}%, max allowed: ${TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE}%`,
      );
    }

    console.log(`Best strategy: ${bestStrategy.getName()}`);
    return bestStrategy;
  }

  private async createBuyTrade(
    strategyName: string,
    outputTokenAddress: string,
    ethPriceUsd: string,
    tx: TransactionRequest,
    txReceipt: TransactionReceipt,
  ) {
    const txHash = txReceipt.hash;
    const confirmedBlock = txReceipt.blockNumber;

    const gasCostRaw = txReceipt.gasUsed * (txReceipt.gasPrice || 0n);
    const gasCost = ethers.formatEther(gasCostRaw);

    const ethSpentRaw = tx.value || 0n;
    const ethSpent = ethers.formatEther(ethSpentRaw);

    // LOG EXTRACTION
    const encodedData = ERC20_INTERFACE.encodeFunctionData("decimals", []);
    const decimalsTx: TransactionRequest = {
      to: outputTokenAddress,
      data: encodedData,
    };
    const rawResult = await this.wallet.call(decimalsTx);
    const [decimals] = ERC20_INTERFACE.decodeFunctionResult("decimals", rawResult);

    let rawTokensReceived = "0";
    let formattedTokensReceived = "0";

    const decodedLogs = decodeLogs(txReceipt.logs);
    const tokenTransfers = decodedLogs.filter(
      (log: any) =>
        log.type === "ERC20 Transfer" &&
        log.contract.toLowerCase() === outputTokenAddress.toLowerCase() &&
        log.to.toLowerCase() === this.wallet.address.toLowerCase(),
    );

    if (tokenTransfers.length > 0) {
      const finalTransfer = tokenTransfers[tokenTransfers.length - 1];
      rawTokensReceived = finalTransfer.amount.toString();
      formattedTokensReceived = ethers.formatUnits(finalTransfer.amount, decimals);
    } else {
      console.log("⚠️  No token transfers found to wallet address");
    }

    // PRICE CALCULATION
    let tokenPriceUsd = "0";
    if (parseFloat(formattedTokensReceived) > 0 && parseFloat(ethSpent) > 0 && parseFloat(ethPriceUsd) > 0) {
      const usdSpent = parseFloat(ethSpent) * parseFloat(ethPriceUsd);
      tokenPriceUsd = (usdSpent / parseFloat(formattedTokensReceived)).toString();
    } else {
      console.log("⚠️  Cannot calculate token price - missing token amount, ETH spent, or ETH price");
      console.log(`  - Tokens received: ${formattedTokensReceived}`);
      console.log(`  - ETH spent: ${ethSpent}`);
      console.log(`  - ETH price: ${ethPriceUsd}`);
    }

    const buyTrade: BuyTrade = new BuyTrade(
      strategyName,
      txHash,
      confirmedBlock,
      gasCost,
      tokenPriceUsd,
      ethPriceUsd,
      rawTokensReceived,
      formattedTokensReceived,
      ethSpent,
    );

    return buyTrade;
  }

  private async createSellTrade(
    strategyName: string,
    inputTokenAddress: string,
    outputTokenAddress: string,
    ethPriceUsd: string,
    tx: TransactionRequest,
    txReceipt: TransactionReceipt,
    approvalGasCost?: string,
  ) {
    const txHash = txReceipt.hash;
    const confirmedBlock = txReceipt.blockNumber;

    const gasCostRaw = txReceipt.gasUsed * (txReceipt.gasPrice || 0n);
    const approvalGastCostRaw = ethers.parseEther(approvalGasCost || "0");
    const gasCost = ethers.formatEther(gasCostRaw + approvalGastCostRaw);

    const ethSpentRaw = tx.value || 0n;
    const ethSpent = ethers.formatEther(ethSpentRaw);

    // LOG EXTRACTION
    let rawTokensReceived = "0";
    let formattedTokensReceived = "0";
    let rawTokensSpent = "0";
    let formattedTokensSpent = "0";
    let ethReceived = "0";
    let outputDecimals;

    if (outputTokenAddress === ethers.ZeroAddress) {
      outputDecimals = 18n;
    } else {
      const encodedOutputTokenData = ERC20_INTERFACE.encodeFunctionData("decimals", []);
      const outputTokenDecimalsTx: TransactionRequest = {
        to: outputTokenAddress,
        data: encodedOutputTokenData,
      };
      const rawOutputTokenTxResult = await this.wallet.call(outputTokenDecimalsTx);
      [outputDecimals] = ERC20_INTERFACE.decodeFunctionResult("decimals", rawOutputTokenTxResult);
    }

    const encodedInputTokenData = ERC20_INTERFACE.encodeFunctionData("decimals", []);
    const inputTokenDecimalsTx: TransactionRequest = {
      to: inputTokenAddress,
      data: encodedInputTokenData,
    };
    const rawInputTokenTxResult = await this.wallet.call(inputTokenDecimalsTx);
    const [inputDecimals] = ERC20_INTERFACE.decodeFunctionResult("decimals", rawInputTokenTxResult);

    const decodedLogs = decodeLogs(txReceipt.logs);

    // Handle receiving tokens/ETH based on output type
    if (outputTokenAddress === ethers.ZeroAddress) {
      // For ETH output, look for WETH transfers to wallet (which will be unwrapped)
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
        rawTokensReceived = finalTransfer.amount.toString();
        formattedTokensReceived = ethers.formatUnits(finalTransfer.amount, outputDecimals);
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
        formattedTokensReceived = ethReceived; // For ETH output, received amount = ETH received
        rawTokensReceived = totalWithdrawn.toString();
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
            formattedTokensReceived = ethReceived;
            rawTokensReceived = amount0Out.toString();
            break;
          } else if (amount1Out > 0n) {
            ethReceived = ethers.formatEther(amount1Out);
            formattedTokensReceived = ethReceived;
            rawTokensReceived = amount1Out.toString();
            break;
          }
        }
      }
    } else {
      // For token output, look for ERC20 transfers to wallet
      const receivingTokenTransfers = decodedLogs.filter(
        (log: any) =>
          log.type === "ERC20 Transfer" &&
          log.contract.toLowerCase() === outputTokenAddress.toLowerCase() &&
          log.to.toLowerCase() === this.wallet.address.toLowerCase(),
      );

      if (receivingTokenTransfers.length > 0) {
        const finalTransfer = receivingTokenTransfers[receivingTokenTransfers.length - 1];
        rawTokensReceived = finalTransfer.amount.toString();
        formattedTokensReceived = ethers.formatUnits(finalTransfer.amount, outputDecimals);
      } else {
        console.log("⚠️  No token transfers found to wallet address");
      }
    }

    const spendingTokenTransfers = decodedLogs.filter(
      (log: any) =>
        log.type === "ERC20 Transfer" &&
        log.contract.toLowerCase() === inputTokenAddress.toLowerCase() &&
        log.from.toLowerCase() === this.wallet.address.toLowerCase(),
    );
    if (spendingTokenTransfers.length > 0) {
      const firstTransfer = spendingTokenTransfers[0];
      rawTokensSpent = firstTransfer.amount.toString();
      formattedTokensSpent = ethers.formatUnits(firstTransfer.amount, inputDecimals);
    } else {
      console.log("⚠️  No token spending transfers found from wallet address");
    }

    // PRICE CALCULATION
    let tokenPriceUsd = "0";
    if (parseFloat(formattedTokensSpent) > 0 && parseFloat(formattedTokensReceived) > 0) {
      // For sell trades: Token Price = USD received / Tokens spent
      // Assuming USDC ≈ 1 USD, or if receiving ETH, convert ETH to USD
      let usdReceived = parseFloat(formattedTokensReceived);

      // If output token is ETH, convert to USD using ETH price
      if (outputTokenAddress === ethers.ZeroAddress && parseFloat(ethPriceUsd) > 0) {
        usdReceived = parseFloat(formattedTokensReceived) * parseFloat(ethPriceUsd);
      }

      tokenPriceUsd = (usdReceived / parseFloat(formattedTokensSpent)).toString();
    } else {
      console.log("⚠️  Cannot calculate token price - missing token amounts");
      console.log(`  - Tokens spent: ${formattedTokensSpent}`);
      console.log(`  - Tokens received: ${formattedTokensReceived}`);
    }

    const sellTrade: SellTrade = new SellTrade(
      strategyName,
      txHash,
      confirmedBlock,
      gasCost,
      tokenPriceUsd,
      ethPriceUsd,
      ethSpent,
      rawTokensSpent,
      formattedTokensSpent,
      rawTokensReceived,
      formattedTokensReceived,
      ethReceived,
    );

    return sellTrade;
  }
}

import { ethers, Wallet, TransactionRequest } from "ethers";
import { ChainType, getChainConfig } from "../config/chain-config";
import { SignedLimitOrder } from "./types/OrderTypes";
import { RouteOptimizer } from "../routing/RouteOptimizer";

/**
 * OrderExecutor handles the execution of signed limit orders through the Executor contract
 *
 * This class bridges the gap between the TypeScript trading strategies and the
 * on-chain Executor contract by preparing route data and executing orders.
 */
export class OrderExecutor {
  private executorAddress: string;
  private routeOptimizer: RouteOptimizer;

  constructor(
    private chain: ChainType,
    executorAddress: string,
  ) {
    this.executorAddress = executorAddress;
    this.routeOptimizer = new RouteOptimizer(chain);
  }

  /**
   * Execute a signed limit order through the Executor contract
   *
   * @param signedOrder - Complete signed order from OrderSigner
   * @param wallet - Wallet to execute the transaction (relayer)
   * @returns Transaction hash
   */
  async executeSignedOrder(signedOrder: SignedLimitOrder, wallet: Wallet): Promise<string> {
    console.log("🚀 Executing signed limit order...");

    // Get the optimal route for this trade
    const route = await this.routeOptimizer.getBestUniV3Route(
      signedOrder.order.inputToken,
      BigInt(signedOrder.order.inputAmount),
      signedOrder.order.outputToken,
      wallet,
    );

    // Prepare route data for the contract
    const routeData = this.prepareRouteData(route);

    // Create the transaction
    const tx = await this.createExecuteOrderTransaction(signedOrder, routeData);

    // Execute the transaction
    console.log("📡 Sending transaction to network...");
    const txResponse = await wallet.sendTransaction(tx);
    await txResponse.wait();

    console.log("✅ Order executed successfully!");
    console.log("📄 Transaction hash:", txResponse.hash);

    return txResponse.hash;
  }

  /**
   * Create transaction for executing an order
   */
  private async createExecuteOrderTransaction(
    signedOrder: SignedLimitOrder,
    routeData: {
      encodedPath: string;
      fee: number;
      isMultiHop: boolean;
    },
  ): Promise<TransactionRequest> {
    const executorAbi = [
      `function executeOrder(
        (address maker, address inputToken, address outputToken, uint256 inputAmount, uint256 minAmountOut, uint256 maxSlippageBps, address[] allowedRouters, uint256 expiry, uint256 nonce) order,
        (bytes encodedPath, uint24 fee, bool isMultiHop) routeData,
        bytes orderSignature,
        (address token, uint256 amount, address spender, uint256 sigDeadline, uint256 nonce) permit2Data,
        bytes permit2Signature
      )`,
    ];

    const executorContract = new ethers.Contract(this.executorAddress, executorAbi);

    // Prepare permit2 data structure for contract call
    const permit2DataForContract = {
      token: signedOrder.permit2Data.permitted.token,
      amount: signedOrder.permit2Data.permitted.amount,
      spender: this.executorAddress,
      sigDeadline: signedOrder.permit2Data.deadline,
      nonce: signedOrder.permit2Data.nonce,
    };

    const calldata = executorContract.interface.encodeFunctionData("executeOrder", [
      signedOrder.order,
      routeData,
      signedOrder.orderSignature,
      permit2DataForContract,
      signedOrder.permit2Signature,
    ]);

    return {
      to: this.executorAddress,
      data: calldata,
      gasLimit: 500000n, // Adjust based on testing
    };
  }

  /**
   * Convert route from RouteOptimizer to contract format
   */
  private prepareRouteData(route: any) {
    const isMultiHop = route.path.length > 2 && route.encodedPath;

    return {
      encodedPath: isMultiHop ? route.encodedPath : "0x",
      fee: isMultiHop ? 0 : route.fees[0], // Use first fee for single-hop
      isMultiHop,
    };
  }

  /**
   * Check if an order can be executed (has valid route)
   */
  async canExecuteOrder(order: SignedLimitOrder, wallet: Wallet): Promise<boolean> {
    try {
      const route = await this.routeOptimizer.getBestUniV3Route(
        order.order.inputToken,
        BigInt(order.order.inputAmount),
        order.order.outputToken,
        wallet,
      );

      // Check if we have a valid route and sufficient output
      return route.amountOut >= BigInt(order.order.minAmountOut);
    } catch (error) {
      console.error("❌ Cannot execute order:", error);
      return false;
    }
  }
}

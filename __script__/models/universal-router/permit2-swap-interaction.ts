import { ethers, Wallet } from "ethers";
import { getHardhatWallet_1 } from "../../../src/hooks/useSetup";
import { ChainConfig, ChainType, getChainConfig, getOutputTokenAddress } from "../../../src/config/chain-config";
import { UniversalRouter } from "../../../src/models/universal-router/UniversalRouter";
import { CommandType, IPermitSingle } from "../../../src/models/universal-router/universal-router-types";
import { TradeCreationDto } from "../../../src/api/trades/TradesController";
import { OutputToken } from "../../../src/lib/types";
import { createMinimalErc20, decodeLogs } from "../../../src/lib/utils";
import { UniswapV2Router } from "../../../src/models/uniswap-v2/UniswapV2Router";
import { getLowPoolKey } from "../../../src/models/uniswap-v4/uniswap-v4-utils";
import { encodePermitInput } from "../../../src/models/universal-router/universal-router-utils";
import { UNIVERSAL_ROUTER_INTERFACE } from "../../../src/contract-abis/universal-router";
import { Permit2 } from "../../../src/models/permit2/Permit2";

export async function v4SwapInteraction(wallet: Wallet, tradeCreationDto: TradeCreationDto) {
  const chain: ChainType = tradeCreationDto.chain as ChainType;
  const chainConfig: ChainConfig = getChainConfig(chain);
  const chainId = Number(chainConfig.id);
  const outputTokenAddress = getOutputTokenAddress(chain, tradeCreationDto.outputToken as OutputToken);

  const router = new UniversalRouter(chain);
  const v2Router = new UniswapV2Router(chain);

  const usdcAddress = chainConfig.tokenAddresses.usdc;
  const wethAddress = chainConfig.tokenAddresses.weth;
  const usdc = await createMinimalErc20(usdcAddress, wallet.provider!);
  const weth = await createMinimalErc20(wethAddress, wallet.provider!);

  //console.log("Swapping ETH for USDC...");
  //await v2Router.swapEthInUsdForToken(wallet, usdc, 200);

  const usdcBalance = await usdc.getFormattedTokenBalance(wallet.address);
  const wethBalance = await weth.getFormattedTokenBalance(wallet.address);
  const ethBalance = await wallet.provider!.getBalance(wallet.address);

  console.log("--------------------------------");
  console.log("Chain", chain);
  console.log("--------------------------------");
  console.log("Wallet Info:");
  console.log("\twallet address", wallet.address);
  console.log("\tETH balance", ethers.formatEther(ethBalance));
  console.log(`\t${usdc.getSymbol()} balance: ${usdcBalance}`);
  console.log(`\t${weth.getSymbol()} balance: ${wethBalance}`);
  console.log();

  // Permit2 interaction
  const permit2 = new Permit2(chain);

  const nonce = await permit2.getPermitNonce(wallet, wallet.address, usdc.getTokenAddress(), router.getRouterAddress());
  await permit2.displayAllowance(wallet, wallet.address, usdc.getTokenAddress(), router.getRouterAddress());

  // Build inputs
  const permitSingle: IPermitSingle = {
    token: usdc.getTokenAddress(),
    amount: BigInt(tradeCreationDto.rawInputAmount),
    expiration: BigInt(Math.floor(Date.now() / 1000) + 1200),
    nonce,
  };

  const signature = await permit2.getPermitSingleSignature(wallet, permitSingle);

  const permit2Command = CommandType.PERMIT2_PERMIT;
  const permit2Input = encodePermitInput(wallet.address, permitSingle, signature);

  const tx = await router.createExecuteTransaction(wallet, permit2Command, [permit2Input]);
  const txResponse = await wallet.sendTransaction(tx);
  const txReceipt = await txResponse.wait();
  if (txReceipt) throw new Error("Transaction failed");
  console.log("Transaction succeeded");

  // const signatureLike = (await wallet.signTypedData(domain, types, permitSingle)) as SignatureLike
  // const signature = Signature.from(signatureLike);
  throw new Error("Stop");

  const poolKey = getLowPoolKey(tradeCreationDto.inputToken, outputTokenAddress);
  const isZeroForOne = poolKey.currency0 === tradeCreationDto.inputToken;
  const minOutputAmount = 0n;

  const swapInput = router.encodeV4SwapInput(
    poolKey,
    isZeroForOne,
    tradeCreationDto.rawInputAmount,
    minOutputAmount,
    wallet.address,
  );

  // Debug: decode the packed actions locally
  const deadline = Math.floor(Date.now() / 1000) + 1200;
  const commands = ethers.concat([CommandType.PERMIT2_PERMIT, CommandType.V4_SWAP]);

  console.log("commands:", ethers.hexlify(commands));
  console.log("Decoding actions locally for sanity check...");
  try {
    // commands: BytesLike (Uint8Array or hex string)
    // permitInput, swapInput: each a hex string
    const iface = UNIVERSAL_ROUTER_INTERFACE;
    const encodedData = iface.encodeFunctionData("execute", [commands, [permitInput, swapInput], deadline]);

    // 2) decode it back immediately
    const decoded = iface.decodeFunctionData("execute", encodedData);
    console.log("Decoded execute arguments:", {
      commands: decoded[0],
      inputs: decoded[1],
      deadline: decoded[2],
    });
  } catch (err) {
    console.error("Local decode error:", err);
  }

  // Create transaction

  const txRequest = await router.createExecuteTransaction(wallet, commands, [permitInput, swapInput], deadline);

  // Estimate gas to catch slice errors
  try {
    const gasEstimate = await wallet.provider!.estimateGas({
      to: txRequest.to,
      data: txRequest.data,
    });
    console.log("Gas estimate successful:", gasEstimate.toString());
  } catch (err) {
    console.error("Gas estimate revert:", err);
  }

  throw new Error("Stop");
  // Send TX
  const txResponse1 = await wallet.sendTransaction(txRequest);
  console.log("txResponse:", txResponse.hash);
  const receipt = await txResponse.wait();
  if (!receipt) throw new Error("Transaction failed");
  console.log("txReceipt:", receipt.hash);

  // Decode logs
  console.log("Decoding logs...");
  const decodedLogs = decodeLogs(receipt.logs);
  console.log("decodedLogs:", decodedLogs);
}

if (require.main === module) {
  const wallet = getHardhatWallet_1();
  const chain = ChainType.ETH;
  const chainConfig = getChainConfig(chain);
  const usdcAddress = chainConfig.tokenAddresses.usdc;

  const usdcInputAmount = ethers.parseUnits("100", 6);

  const tradeCreationDto: TradeCreationDto = {
    // Equivalent to getHardhatWallet_1()
    wallet: {
      rpcUrl: process.env.HARDHAT_RPC_URL,
      privateKey: process.env.HARDHAT_PRIVATE_KEY_1,
    },
    chain: chain,
    inputToken: usdcAddress,
    rawInputAmount: usdcInputAmount.toString(),
    outputToken: OutputToken.ETH,
  };
  v4SwapInteraction(wallet, tradeCreationDto).catch(console.error);
}

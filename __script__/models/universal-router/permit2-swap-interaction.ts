import { ethers, Signature, Wallet } from "ethers";
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

async function testPermit2UniversalRouter(wallet: Wallet, chain: ChainType) {
  console.log("Testing Permit2 Via Universal Router");

  const chainConfig = getChainConfig(chain);
  const permit2 = new Permit2(chain);
  const universalRouter = new UniversalRouter(chain);

  const TOKEN = chainConfig.tokenAddresses.usdc;
  const UNIVERSAL_ROUTER_ADDR = chainConfig.uniswap.universalRouterAddress;

  const nonce = await permit2.getPermitNonce(wallet, wallet.address, TOKEN, UNIVERSAL_ROUTER_ADDR);

  // 2) Build EIP-712 payload
  const domain = {
    name: "Permit2",
    chainId: (await wallet.provider!.getNetwork()).chainId,
    verifyingContract: chainConfig.uniswap.permit2Address,
  };
  const types = {
    PermitDetails: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
      { name: "nonce", type: "uint48" },
    ],
    PermitSingle: [
      { name: "details", type: "PermitDetails" },
      { name: "spender", type: "address" },
      { name: "sigDeadline", type: "uint256" },
    ],
  };
  const AMOUNT = ethers.parseUnits("50", 6);
  const DEADLINE = Math.floor(Date.now() / 1000) + 1200;

  const permit = {
    details: {
      token: TOKEN,
      amount: AMOUNT,
      expiration: DEADLINE,
      nonce: nonce,
    },
    spender: UNIVERSAL_ROUTER_ADDR,
    sigDeadline: DEADLINE,
  };

  // 3) Sign it
  const signature = await wallet.signTypedData(domain, types, permit);
  const { r, s, v } = Signature.from(signature);

  const command = CommandType.PERMIT2_PERMIT;

  const permitDetailsTuple = [
    permit.details.token,
    permit.details.amount,
    permit.details.expiration,
    permit.details.nonce,
  ] as const;

  const permitTuple = [permitDetailsTuple, permit.spender, permit.sigDeadline] as const;

  const encodedPermit = ethers.AbiCoder.defaultAbiCoder().encode(
    [
      "tuple(tuple(address token,uint160 amount,uint48 expiration,uint48 nonce) details,address spender,uint256 sigDeadline)", // PermitSingle
      "bytes", // signature
    ],
    [permitTuple, signature],
  );

  const tx = await universalRouter.createExecuteTransaction(wallet, command, [encodedPermit]);
  const txResponse = await wallet.sendTransaction(tx);
  const txReceipt = await txResponse.wait();
  if (!txReceipt) throw new Error("Transaction failed");
  console.log("Transaction succeeded");
}

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

  console.log("Proceeding to Universal Router test...");
  await testPermit2UniversalRouter(wallet, chain);
  throw new Error("Stop");

  const permit2 = new Permit2(chain);
  // Permit2 Allowance
  const permit2Allowance = await usdc.getRawAllowance(wallet.address, permit2.getPermit2Address());
  console.log("Permit2 Allowance: ", permit2Allowance);
  if (permit2Allowance <= 0n) {
    console.log("Approving Permit2...");
    const approveTx = await usdc.createApproveTransaction(permit2.getPermit2Address(), ethers.MaxUint256);
    const approveTxResponse = await wallet.sendTransaction(approveTx);
    const approveTxReceipt = await approveTxResponse.wait();
    if (!approveTxReceipt) {
      throw new Error("Approve tx failed");
    }
    console.log("Approved!");
  }

  // Permit2 interaction
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

  // Important: Universal Router usually doesn't support executing just a permit command
  // Let's combine it with a minimal swap to test both

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
    // permit2Input and swapInput: each a hex string
    const iface = UNIVERSAL_ROUTER_INTERFACE;
    const encodedData = iface.encodeFunctionData("execute", [commands, [permit2Input, swapInput], deadline]);

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
  const txRequest = await router.createExecuteTransaction(wallet, commands, [permit2Input, swapInput], deadline);

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

  // Send TX
  const txResponse2 = await wallet.sendTransaction(txRequest);
  console.log("txResponse:", txResponse2.hash);
  const receipt = await txResponse2.wait();
  if (!receipt) throw new Error("Transaction failed");
  console.log("txReceipt:", receipt!.hash);

  // Decode logs
  console.log("Decoding logs...");
  if (receipt) {
    const decodedLogs = decodeLogs(receipt!.logs);
    console.log("decodedLogs:", decodedLogs);
  }
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

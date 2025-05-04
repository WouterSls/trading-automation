import { ethers, Wallet } from "ethers";
import { getHardhatWallet_1 } from "../../../src/hooks/useSetup";
import { ChainType, getChainConfig } from "../../../src/config/chain-config";
import { UniversalRouter } from "../../../src/models/universal-router/UniversalRouter";
import { IV4ExactInputSingle } from "../../../src/models/uniswap-v4/uniswap-v4-types";
import { CommandType } from "../../../src/models/universal-router/commands";
import { getPoolKeyAndId } from "../../../src/models/uniswap-v4/uniswap-v4-utils";

export async function v4SwapInteraction(chain: ChainType, wallet: Wallet) {
  const chainConfig = getChainConfig(chain);

  const router = new UniversalRouter(chain);

  const usdcAddress = chainConfig.tokenAddresses.usdc;
  const ethAddress = ethers.ZeroAddress;
  const wagmiAddress = "";

  const createExactInputSingle = (
    inputCurrency: string,
    outputCurrency: string,
    inputAmount: bigint,
    minOutputAmount?: bigint,
  ) => {
    console.log("inputCurrency:", inputCurrency);
    console.log("outputCurrency:", outputCurrency);

    const { poolKey } = getPoolKeyAndId(inputCurrency, outputCurrency);
    console.log("poolKey:", poolKey);
    const isInputCurrencyStringSmaller = inputCurrency < outputCurrency;
    console.log("isInputCurrencyStringSmaller:", isInputCurrencyStringSmaller);
    const zeroForOne = isInputCurrencyStringSmaller;
    console.log("zeroForOne:", zeroForOne);
    minOutputAmount = minOutputAmount ?? 0n;
    return {
      poolKey: poolKey,
      zeroForOne: zeroForOne,
      inputAmount: inputAmount,
      minOutputAmount: minOutputAmount,
      hookData: poolKey.hooks,
    };
  };

  const inputCurrency = ethAddress;
  const outputCurrency = usdcAddress;
  const inputAmount = ethers.parseEther("1");
  //const minOutputAmount = calculateSlippage(inputAmount);

  const swap1Params: IV4ExactInputSingle = createExactInputSingle(inputCurrency, outputCurrency, inputAmount);
  //const swap2Params: IV4ExactInputSingle = createExactInputSingle(usdcAddress, wagmiAddress, inputAmount);

  const commandType = CommandType.V4_SWAP;
  const cmd = router.createV4ExactInputSingleCommand(swap1Params);
  console.log("cmd:", cmd);
  const deadline = Number(Math.floor(Date.now() / 1000) + 1200);

  const tx = await router.createExecuteTransaction(wallet, commandType, cmd, deadline);
  console.log("tx:", tx);
  //const txResponse = await wallet.sendTransaction(tx);
  //console.log("txResponse:", txResponse);
  //const txResponse = await wallet.call(tx);
  //console.log("txResponse:");
  //console.log(txResponse);
}

if (require.main === module) {
  const wallet = getHardhatWallet_1();
  const chain = ChainType.ETH;
  v4SwapInteraction(chain, wallet).catch(console.error);
}

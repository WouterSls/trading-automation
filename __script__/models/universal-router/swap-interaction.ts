import { ethers, Wallet } from "ethers";
import { getHardhatWallet_1 } from "../../../src/hooks/useSetup";
import { ChainType, getChainConfig, getOutputTokenAddress } from "../../../src/config/chain-config";
import { UniversalRouter } from "../../../src/models/universal-router/UniversalRouter";
import { CommandType } from "../../../src/models/universal-router/universal-router-types";
import { TradeCreationDto } from "../../../src/api/trades/TradesController";
import { prepareV4SwapInput } from "../../../src/models/universal-router/universal-router-utils";
import { OutputToken } from "../../../src/lib/types";

export async function v4SwapInteraction(wallet: Wallet, tradeCreationDto: TradeCreationDto) {
  const router = new UniversalRouter(tradeCreationDto.chain as ChainType);

  const { poolKey, zeroForOne } = await prepareV4SwapInput(tradeCreationDto);
  const inputAmount = tradeCreationDto.rawInputAmount;
  const minOutputAmount = 0n;
  const recipient = wallet.address;
  console.log("poolKey:", poolKey);
  console.log("zeroForOne:", zeroForOne);
  console.log();

  const command: CommandType = CommandType.V4_SWAP;
  const input = router.encodeV4SwapInput(poolKey, zeroForOne, inputAmount, minOutputAmount, recipient);

  const deadline = Number(Math.floor(Date.now() / 1000) + 1200);

  console.log("command:", command);
  console.log("input:", input);
  throw new Error("stop");
  const tx = await router.createExecuteTransaction(wallet, command, input, deadline);
  console.log("tx:", tx);
  const txResponse = await wallet.call(tx);
  console.log("txResponse:", txResponse);
}

if (require.main === module) {
  const wallet = getHardhatWallet_1();
  const chain = ChainType.ETH;
  const chainConfig = getChainConfig(chain);
  const usdcAddress = chainConfig.tokenAddresses.usdc;

  const rawInputAmount = ethers.parseEther("1");

  const tradeCreationDto1: TradeCreationDto = {
    walletId: 1,
    chain: chain,
    inputToken: ethers.ZeroAddress,
    rawInputAmount: rawInputAmount.toString(),
    outputToken: OutputToken.USDC,
  };
  v4SwapInteraction(wallet, tradeCreationDto1).catch(console.error);

  const tradeCreationDto2: TradeCreationDto = {
    walletId: 1,
    chain: chain,
    inputToken: usdcAddress,
    rawInputAmount: rawInputAmount.toString(),
    outputToken: OutputToken.ETH,
  };
  //v4SwapInteraction(wallet, tradeCreationDto2).catch(console.error);
}

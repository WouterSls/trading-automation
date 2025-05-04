import { ethers, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../../src/config/chain-config";
import { getHardhatWallet_1, getTheGraphApi } from "../../../src/hooks/useSetup";
import { PoolKey } from "../../../src/models/uniswap-v4/uniswap-v4-types";
import { FeeAmount, FeeToTickSpacing } from "../../../src/models/uniswap-v3/uniswap-v3-types";
import { validateNetwork } from "../../../src/lib/utils";
import { computePoolId, getBestPoolKey } from "../../../src/models/uniswap-v4/uniswap-v4-utils";
import { UniswapV4StateView } from "../../../src/models/uniswap-v4/UniswapV4StateView";

export async function stateViewInteraction(chain: ChainType, wallet: Wallet) {
  await validateNetwork(wallet, chain);

  const chainConfig = getChainConfig(chain);

  const usdcAddress = chainConfig.tokenAddresses.usdc;
  const daiAddress = chainConfig.tokenAddresses.dai;
  const ethAddress = ethers.ZeroAddress;

  const theGraphApi = getTheGraphApi();
  const poolKeys = await theGraphApi.fetchV4PoolKeysByTokens(chain, usdcAddress, daiAddress);
  const bestPoolKey = await getBestPoolKey(poolKeys);
  console.log("bestPoolKey", bestPoolKey);

  const stateView = new UniswapV4StateView(chain);

  const testKey1: PoolKey = {
    currency0: usdcAddress,
    currency1: daiAddress,
    fee: FeeAmount.LOW,
    tickSpacing: FeeToTickSpacing.get(FeeAmount.LOW)!,
    hooks: ethers.ZeroAddress,
  };

  const poolId1 = computePoolId(testKey1);

  //const slot01 = await stateView.getSlot0(wallet, poolId1);
  //console.log("USDC/DAI Low fee tier slot01", slot01);
}

if (require.main === module) {
  const chain = ChainType.ETH;
  const wallet = getHardhatWallet_1();
  stateViewInteraction(chain, wallet).catch(console.error);
}

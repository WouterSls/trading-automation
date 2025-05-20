import { UniswapV3Factory, UniswapV3Pool, Slot0, FeeAmount } from "../../../src/models/blockchain/uniswap-v3";
import { ChainType } from "../../../src/config/chain-config";
import { getEthWallet_1 } from "../../../src/hooks/useSetup";
import { calculatePriceFromSqrtPriceX96 } from "../../../src/models/blockchain/uniswap-v3/uniswap-v3-utils";

export async function factoryInteraction() {
  const wallet = getEthWallet_1();
  const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

  const factory = new UniswapV3Factory(ChainType.ETH);

  const factoryAddress = factory.getFactoryAddress();
  console.log(`Factory Address: ${factoryAddress}`);

  const pool: UniswapV3Pool = await factory.getPool(wallet, DAI_ADDRESS, WETH_ADDRESS, FeeAmount.MEDIUM);

  await printTokenPriceInfo(pool);
}

async function printTokenPriceInfo(pool: UniswapV3Pool) {
  const slot0: Slot0 = await pool.getSlot0();

  const sqrtPriceX96 = slot0.sqrtPriceX96;

  const price = calculatePriceFromSqrtPriceX96(sqrtPriceX96);

  const token0Address = await pool.getToken0Address();
  const token1Address = await pool.getToken1Address();

  console.log(`Token0: ${token0Address}`);
  console.log(`Token1: ${token1Address}`);

  console.log(`${token1Address} / ${token0Address} Price: ${price}`);
  console.log(`${token0Address} / ${token1Address} Price: ${1 / price}`);
}

if (require.main === module) {
  factoryInteraction().catch(console.error);
}

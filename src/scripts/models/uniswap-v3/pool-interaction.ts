import { getEthWallet_1 } from "../../../hooks/useSetup";
import { UniswapV3Factory, UniswapV3Pool, TickInfo } from "../../../models/uniswap-v3";
import { ChainType } from "../../../config/chain-config";

enum FeeTier {
    "0.05%" = 500,
    "0.3%" = 3000,
    "1%" = 10000
}

export async function poolInteraction() {
    const wallet = getEthWallet_1();
    const factory = new UniswapV3Factory(ChainType.ETH);

    const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

    const poolAddress = await factory.getPoolAddress(wallet, DAI_ADDRESS, WETH_ADDRESS, FeeTier["0.3%"]);

    const pool = new UniswapV3Pool(wallet, poolAddress);

    const liquidity = await pool.getLiquidity();
    const slot0 = await pool.getSlot0();

    const currentTick: bigint = slot0.tick;
    const currentTickNumber = Number(currentTick);
    const tickSpacing: bigint = await pool.getTickSpacing();
    const tickSpacingNumber = Number(tickSpacing);


    console.log(`Current Tick: ${currentTick}`);
    console.log(`Tick Spacing: ${tickSpacing}`);


    /**
     * const tickInfo = await pool.getTickInfo(currentTickNumber);
     * -73890
     * -> (0, 0, 0, 0, 0, 0, 0, false)
     * 
     * The reason the tick is not initialized (no info in tickBitmap) is because the tick is not a multiple of the tick spacing.
     * To find the closest multiple of the tick spacing, we can use floor division of the current tick and the tick spacing.
     * Then we multiply the result by the tick spacing to get the closest multiple of the tick spacing.
     * 
     */

    const tickBelow = Math.floor(currentTickNumber / tickSpacingNumber) * tickSpacingNumber;
    console.log(`tick below current tick: ${tickBelow}`);
    // Math.floor() is used to round down to the nearest integer.
    // division by tickspace of current tick gives us a decimal value -> Math.floor() rounds it down to the nearest integer. (=closest initialized tick below current tick)
    const tickAbove = tickBelow + tickSpacingNumber;
    console.log(`tick above: ${tickAbove}`);

    console.log(`Our tick ${currentTick} is between ${tickBelow} and ${tickAbove}`);
    console.log("--------------------------------");

    console.log(`Liquidity: ${liquidity}`);
    console.log("--------------------------------");
    const tick0Info: TickInfo = await pool.getTickInfo(tickBelow);
    console.log(`Tick ${tickBelow} Info:`);

    console.log(`\tliquidityGross: ${tick0Info.liquidityGross}`);
    console.log(`\tliquidityNet: ${tick0Info.liquidityNet}`);
    console.log(`\tinitialized: ${tick0Info.initialized}`);

    const tick1Info:TickInfo = await pool.getTickInfo(tickAbove);
    console.log(`Tick ${tickAbove} Info:`);
    console.log(`\tliquidityGross: ${tick1Info.liquidityGross}`);
    console.log(`\tliquidityNet: ${tick1Info.liquidityNet}`);
    console.log(`\tinitialized: ${tick1Info.initialized}`);


}
    

if (require.main === module) {
    poolInteraction().catch(console.error);
}

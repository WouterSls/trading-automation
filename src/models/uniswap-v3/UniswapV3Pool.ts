import { Contract, Wallet } from "ethers";
import { POOL_INTERFACE } from "../../contract-abis/uniswap-v3";
import { FeeAmount } from "./index";

export interface Slot0 {
  sqrtPriceX96: bigint;
  tick: bigint;
  observationIndex: string;
  observationCardinality: string;
  observationCardinalityNext: string;
  feeProtocol: string;
  unlocked: boolean;
}

export interface TickInfo {
  liquidityGross: string; // unit128
  liquidityNet: string; // int128
  feeGrowthOutside0X128: string; // uint256
  feeGrowthOutside1X128: string; // uint256
  tickCumulativeOutside: string; // int56
  secondsPerLiquidityOutsideX128: string; // uint160
  secondsOutside: string; // uint32
  initialized: boolean; // boolean
}

export class UniswapV3Pool {
  private poolContract: Contract;

  constructor(
    wallet: Wallet,
    private poolAddress: string,
    private factoryAddress: string,
    private token0Address: string,
    private token1Address: string,
    private fee: FeeAmount,
    private tickSpacing: number,
  ) {
    this.poolContract = new Contract(poolAddress, POOL_INTERFACE, wallet);
  }

  getPoolAddress = (): string => this.poolAddress;
  getFactoryAddress = (): string => this.factoryAddress;
  getToken0Address = (): string => this.token0Address;
  getToken1Address = (): string => this.token1Address;
  getFee = (): FeeAmount => this.fee;
  getTickSpacing = (): number => this.tickSpacing;

  /**
   * Get the liquidity
   * @returns liquidity
   */
  async getLiquidity() {
    const liquidity = await this.poolContract.liquidity();
    return liquidity;
  }

  /**
   * Get the slot0
   * @returns slot0
   */
  async getSlot0() {
    const slot0 = await this.poolContract.slot0();
    const slot0Object = {
      sqrtPriceX96: slot0[0],
      tick: slot0[1],
      observationIndex: slot0[2],
      observationCardinality: slot0[3],
      observationCardinalityNext: slot0[4],
      feeProtocol: slot0[5],
      unlocked: slot0[6],
    };
    return slot0Object as Slot0;
  }

  /**
   * Get the tick info
   * @param tickIndex - tick index
   * @returns tick info
   */
  async getTickInfo(tickIndex: number) {
    const tickInfo = await this.poolContract.ticks(tickIndex);
    const tickInfoObject = {
      liquidityGross: tickInfo[0],
      liquidityNet: tickInfo[1],
      feeGrowthOutside0X128: tickInfo[2],
      feeGrowthOutside1X128: tickInfo[3],
      tickCumulativeOutside: tickInfo[4],
      secondsPerLiquidityOutsideX128: tickInfo[5],
      secondsOutside: tickInfo[6],
      initialized: tickInfo[7],
    };
    return tickInfoObject as TickInfo;
  }
}

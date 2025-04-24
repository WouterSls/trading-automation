import { Contract, Wallet } from "ethers";
import { POOL_INTERFACE } from "../../contract-abis/uniswap-v3";

export interface Slot0 {
  sqrtPriceX96: string;
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
    private wallet: Wallet,
    private poolAddress: string,
  ) {
    this.poolContract = new Contract(poolAddress, POOL_INTERFACE, wallet);
  }

  // ----------- IMMUTABLES ------------

  /**
   * Get the address of the pool
   * @returns address of the pool
   */
  getPoolAddress = (): string => this.poolAddress;

  /**
   * Get the address of the token0
   * @returns address of the token0
   */
  async getToken0Address() {
    const token0Address = await this.poolContract.token0();
    return token0Address;
  }

  /**
   * Get the address of the token1
   * @returns address of the token1
   */
  async getToken1Address() {
    const token1Address = await this.poolContract.token1();
    return token1Address;
  }

  /**
   * Get the fee
   * @returns fee
   */
  async getFee() {
    const fee = await this.poolContract.fee();
    return fee;
  }

  /**
   * Get the tick spacing
   * @returns tick spacing
   */
  async getTickSpacing(): Promise<bigint> {
    const tickSpacing = await this.poolContract.tickSpacing();
    return tickSpacing;
  }

  // ----------- MUTABLES ------------

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

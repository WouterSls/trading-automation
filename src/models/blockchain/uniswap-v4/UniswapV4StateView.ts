import { Contract, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../../config/chain-config";
import { UNISWAP_V4_STATE_VIEW_INTERFACE } from "../../../lib/contract-abis/uniswap-v4";
import { PoolKey } from "./uniswap-v4-types";
import { computePoolId } from "./uniswap-v4-utils";

export class UniswapV4StateView {
  private stateViewContract: Contract;

  private STATE_MANAGER_ADDRESS: string;

  constructor(private chain: ChainType) {
    const chainConfig = getChainConfig(chain);

    this.STATE_MANAGER_ADDRESS = chainConfig.uniswap.v4.stateViewAddress;

    if (!this.STATE_MANAGER_ADDRESS || this.STATE_MANAGER_ADDRESS.trim() === "") {
      throw new Error(`State manager address not defined for chain: ${chainConfig.name}`);
    }

    this.stateViewContract = new Contract(this.STATE_MANAGER_ADDRESS, UNISWAP_V4_STATE_VIEW_INTERFACE);
  }

  async getSlot0(wallet: Wallet, poolKey: PoolKey): Promise<PoolKey> {
    this.stateViewContract = this.stateViewContract.connect(wallet) as Contract;

    const poolId = computePoolId(poolKey);

    const slot0 = await this.stateViewContract.getSlot0(poolId);
    return slot0;
  }

  async getLiquidity(wallet: Wallet, poolKey: PoolKey): Promise<bigint> {
    this.stateViewContract = this.stateViewContract.connect(wallet) as Contract;

    const poolId = computePoolId(poolKey);

    const liquidity = await this.stateViewContract.getLiquidity(poolId);
    return liquidity;
  }

  async getTickInfo(wallet: Wallet, poolKey: PoolKey, tick: number): Promise<any> {
    this.stateViewContract = this.stateViewContract.connect(wallet) as Contract;

    const poolId = computePoolId(poolKey);

    const tickInfo = await this.stateViewContract.getTickInfo(poolId, tick);
    return tickInfo;
  }

  async getTickLiquidity(wallet: Wallet, poolKey: PoolKey, tick: number): Promise<any> {
    this.stateViewContract = this.stateViewContract.connect(wallet) as Contract;

    const poolId = computePoolId(poolKey);

    const tickLiquidity = await this.stateViewContract.getTickLiquidity(poolId, tick);
    return tickLiquidity;
  }
}

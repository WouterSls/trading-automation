import { Contract, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { STATE_VIEW_INTERFACE } from "../../contract-abis/uniswap-v4";
import { PoolKey } from "./uniswap-v4-types";

export class UniswapV4StateView {
  private stateViewContract: Contract;

  private STATE_MANAGER_ADDRESS: string;

  constructor(private chain: ChainType) {
    const chainConfig = getChainConfig(chain);

    this.STATE_MANAGER_ADDRESS = chainConfig.uniswap.v4.stateViewAddress;

    if (!this.STATE_MANAGER_ADDRESS || this.STATE_MANAGER_ADDRESS.trim() === "") {
      throw new Error(`State manager address not defined for chain: ${chainConfig.name}`);
    }

    this.stateViewContract = new Contract(this.STATE_MANAGER_ADDRESS, STATE_VIEW_INTERFACE);
  }

  async getSlot0(wallet: Wallet, poolId: string): Promise<PoolKey> {
    this.stateViewContract = this.stateViewContract.connect(wallet) as Contract;
    const slot0 = await this.stateViewContract.getSlot0(poolId);
    return slot0;
  }

  async getLiquidity(wallet: Wallet, poolId: string): Promise<bigint> {
    this.stateViewContract = this.stateViewContract.connect(wallet) as Contract;
    const liquidity = await this.stateViewContract.getLiquidity(poolId);
    return liquidity;
  }

  async getTickInfo(wallet: Wallet, poolId: string, tick: number): Promise<any> {
    this.stateViewContract = this.stateViewContract.connect(wallet) as Contract;
    const tickInfo = await this.stateViewContract.getTickInfo(poolId, tick);
    return tickInfo;
  }

  async getTickLiquidity(wallet: Wallet, poolId: string, tick: number): Promise<any> {
    this.stateViewContract = this.stateViewContract.connect(wallet) as Contract;
    const tickLiquidity = await this.stateViewContract.getTickLiquidity(poolId, tick);
    return tickLiquidity;
  }
}

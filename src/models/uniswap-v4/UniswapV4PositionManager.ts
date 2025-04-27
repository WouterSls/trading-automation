import { Contract } from "ethers";
import { Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { POSITION_MANAGER_INTERFACE } from "../../contract-abis/uniswap-v4";
import { PoolKey } from "./uniswap-v4-types";

export class UniswapV4PositionManager {
  private positionManagerContract: Contract;

  private POSITION_MANAGER_ADDRESS: string;

  constructor(private chain: ChainType) {
    const chainConfig = getChainConfig(chain);

    this.POSITION_MANAGER_ADDRESS = chainConfig.uniswap.v4.positionManagerAddress;

    if (!this.POSITION_MANAGER_ADDRESS || this.POSITION_MANAGER_ADDRESS.trim() === "") {
      throw new Error(`Position manager address not defined for chain: ${chainConfig.name}`);
    }

    this.positionManagerContract = new Contract(this.POSITION_MANAGER_ADDRESS, POSITION_MANAGER_INTERFACE);
  }

  async getName(wallet: Wallet): Promise<string> {
    const positionManagerContract = this.positionManagerContract.connect(wallet) as Contract;
    const name = await positionManagerContract.name();
    return name;
  }

  async getPoolKeys(wallet: Wallet, poolId: string): Promise<PoolKey> {
    const positionManagerContract = this.positionManagerContract.connect(wallet) as Contract;
    const poolKeys = await positionManagerContract.poolKeys(poolId);
    return poolKeys;
  }
}

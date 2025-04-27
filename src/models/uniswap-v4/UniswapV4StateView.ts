import { Contract, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { STATE_MANAGER_INTERFACE } from "../../contract-abis/_index";

export class UniswapV4StateView {
  private stateViewContract: Contract;

  private STATE_MANAGER_ADDRESS: string;

  constructor(private chain: ChainType) {
    const chainConfig = getChainConfig(chain);

    this.STATE_MANAGER_ADDRESS = chainConfig.uniswap.v4.stateViewAddress;

    if (!this.STATE_MANAGER_ADDRESS || this.STATE_MANAGER_ADDRESS.trim() === "") {
      throw new Error(`State manager address not defined for chain: ${chainConfig.name}`);
    }

    this.stateViewContract = new Contract(this.STATE_MANAGER_ADDRESS, STATE_MANAGER_INTERFACE);
  }

  async getPoolManager(wallet: Wallet): Promise<string> {
    this.stateViewContract = this.stateViewContract.connect(wallet) as Contract;
    const poolManagerAddress = await this.stateViewContract.poolManager();
    return poolManagerAddress;
  }
}

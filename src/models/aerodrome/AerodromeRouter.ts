import { Contract } from "ethers";
import { ChainConfig, ChainType, getChainConfig } from "../../config/chain-config";
import { ROUTER_INTERFACE } from "../../contract-abis/uniswap-v3";

export class AerodromeRouter {
    private routerContract: Contract;

    constructor(chain: ChainType) {
        const chainConfig = getChainConfig(chain);

        const routerAddress = chainConfig.uniswap.universalRouterAddress;

        this.routerContract = new Contract(routerAddress, ROUTER_INTERFACE );
    }

    
    
}
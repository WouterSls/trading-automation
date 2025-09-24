import { Wallet } from "ethers";
import { EXECUTOR_INTERFACE } from "../../lib/smartcontract-abis/executor";
import { EIP712Domain } from "../../orders/order-types";
import { EIP712_TYPES, Order, RouteData, SignedOrder, SignedPermitSignatureData } from "../../trading/executor/executor-types";

export class Executor {
    constructor(private chainId: number, private executorAddress: string) { }

    getAddress = () => this.executorAddress;

    getDomain(): EIP712Domain {
        return {
            name: "EVM Trading Engine",
            version: "1",
            chainId: this.chainId,
            verifyingContract: this.executorAddress
        }
    }

    getOrderNonce(): number {
        return 0;
    }

    async signOrder(signer: Wallet, value: Order) {
        const domain = this.getDomain();
        const types = { Order: EIP712_TYPES.Order };

        try {
            return await signer.signTypedData(domain, types, value);
        } catch (error) {
            console.log("Error during signing IExecutor.Order typeData");
            throw error;
        }
    }

    static encodeExecuteOrder(signedPermitData: SignedPermitSignatureData, signedOrder: SignedOrder, routeData: RouteData) {
        return EXECUTOR_INTERFACE.encodeFunctionData("executeOrder", [signedPermitData, signedOrder, routeData]);
    }
}
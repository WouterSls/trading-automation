import { TransactionRequest } from "ethers";
import { ChainType, getChainConfig } from "../../../src/config/chain-config";
import { getHardhatWallet_1 } from "../../../src/hooks/useSetup";
import { ERC20 } from "../../../src/smartcontracts/ERC/ERC20";

export async function checkAllowanceEncoding() {
  const chain = ChainType.ETH;
  const chainConfig = getChainConfig(chain);
  const wallet = getHardhatWallet_1();

  const owner = wallet.address;
  const spender = chainConfig.uniswap.permit2Address;
  const token = chainConfig.tokenAddresses.usdc;

  const txData = ERC20.encodeAllowance(owner, spender);

  const tx: TransactionRequest = {
    to: token,
    data: txData,
  };

  const txResultData = await wallet.call(tx);

  const allowance = ERC20.decodeAllowance(txResultData);

  console.log(allowance);
}

if (require.main === module) {
  checkAllowanceEncoding().catch(console.error);
}

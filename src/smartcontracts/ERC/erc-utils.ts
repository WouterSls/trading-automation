import { ethers, Provider } from "ethers";
import { ERC20 } from "./ERC20";
import { ERC20_INTERFACE } from "../../lib/smartcontract-abis/_index";

export async function createMinimalErc20(address: string, provider: Provider): Promise<ERC20 | null> {
  const contract = new ethers.Contract(address, ERC20_INTERFACE, provider);

  const [name, symbol, decimals, totalSupply] = await Promise.all([
    contract.name().catch(() => "Not a token"),
    contract.symbol().catch(() => "Unknown"),
    contract.decimals().catch(() => 18),
    contract.totalSupply().catch(() => "0"),
  ]);

  if (name === "Not a token" || symbol === "Unknown" || totalSupply === "0") {
    return null;
  }
  const numberDecimals = Number(decimals);

  return new ERC20(name, symbol, address, numberDecimals, totalSupply, contract);
}
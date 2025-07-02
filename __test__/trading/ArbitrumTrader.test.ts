import { Wallet } from "ethers";
import { ChainType } from "../../src/config/chain-config";
import { Trader } from "../../src/trading/Trader";
import { TraderFactory } from "../../src/trading/TraderFactory";
import { NetworkForkManager } from "../helpers/network-fork";
import { getHardhatWallet_1 } from "../../src/hooks/useSetup";

describe("Ethereum Trader", () => {
  let wallet: Wallet;
  let trader: Trader;

  beforeAll(async () => {
    const chain = ChainType.ARB;
    await NetworkForkManager.startHardhatFork(chain);
    wallet = getHardhatWallet_1();
    trader = await TraderFactory.createTrader(wallet);
  });

  afterAll(async () => {
    await NetworkForkManager.cleanupHardhatFork();
  });

  describe("Network validation", () => {
    it("should create a trader on Base", async () => {
      const expectedChain = ChainType.ARB;

      const actualChain = await trader.getChain();

      expect(actualChain).toBe(expectedChain);
    });
  });
});

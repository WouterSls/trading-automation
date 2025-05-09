import { Wallet } from "ethers";
import { UniversalRouter } from "../../../src/models/universal-router/UniversalRouter";
import { NetworkForkManager } from "../../helpers/network-fork";
import { ChainType } from "../../../src/config/chain-config";
import { getHardhatWallet_1 } from "../../../src/hooks/useSetup";

describe("UniversalRouter address validation", () => {
  let router: UniversalRouter;
  let wallet: Wallet;

  beforeAll(async () => {
    await NetworkForkManager.startHardhatFork(ChainType.ETH);
    router = new UniversalRouter(ChainType.ETH);
  }, 20_000);

  beforeEach(() => {
    wallet = getHardhatWallet_1();
  });

  afterAll(async () => {
    await NetworkForkManager.cleanupHardhatFork();
  });
});

import { Wallet } from "ethers";
import { UniversalRouter } from "../../../src/models/universal-router/UniversalRouter";
import { ChainType } from "../../../src/config/chain-config";
import { NetworkForkManager } from "../../helpers/network-fork";
import { getHardhatWallet_1, getOfflineSigner_1 } from "../../../src/hooks/useSetup";

describe("ETH UniversalRouter", () => {
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

  describe("Validate Router Address", () => {
    it("wallet_validateIsRouterValidWallet_returns_true", async () => {
      // Arrange
      const expectedResult = true;

      // Act
      const actualResult = await router["_networkAndRouterCheck"](wallet);

      // Assert
      expect(actualResult).toBe(expectedResult);
    });
  });
});

/** 
describe("ARB UniversalRouter", () => {
  let router: UniversalRouter;
  let arbWallet: Wallet;

  // Set up the Arbitrum fork before running tests
  beforeAll(async () => {
    await NetworkForkManager.createFork(ChainType.ARB);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    router = new UniversalRouter(ChainType.ARB);
    arbWallet = NetworkForkManager.getWallet();
  });

  afterAll(async () => {
    await NetworkForkManager.cleanupFork();
  });

  describe("Validate Router Address", () => {
    it("arbWallet_validateIsRouterValidWallet_returns_true", async () => {
      const expectedResult = true;
      const actualResult = await router["_networkAndRouterCheck"](arbWallet);
      expect(actualResult).toBe(expectedResult);
    });
  });
});

describe("BASE UniversalRouter", () => {
  let router: UniversalRouter;
  let baseWallet: Wallet;

  // Set up the Base fork before running tests
  beforeAll(async () => {
    await NetworkForkManager.createFork(ChainType.BASE);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    router = new UniversalRouter(ChainType.BASE);
    baseWallet = NetworkForkManager.getWallet();
  });

  afterAll(async () => {
    await NetworkForkManager.cleanupFork();
  });

  describe("Validate Router Address", () => {
    it("baseWallet_validateIsRouterValidWallet_returns_true", async () => {
      const expectedResult = true;
      const actualResult = await router["_networkAndRouterCheck"](baseWallet);
      expect(actualResult).toBe(expectedResult);
    });
  });
});
*/

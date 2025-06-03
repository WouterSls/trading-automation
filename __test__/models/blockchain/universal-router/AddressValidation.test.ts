import { Wallet } from "ethers";
import { UniversalRouter } from "../../../../src/models/blockchain/universal-router/UniversalRouter";
import { ChainType } from "../../../../src/config/chain-config";
import { getArbitrumWallet_1, getBaseWallet_1, getEthWallet_1, getOfflineSigner_1 } from "../../../../src/hooks/useSetup";

const MISSING_PROVIDER_ERROR_MESSAGE = "Network Validation Failed";
const INVALID_NETWORK_ERROR_MESSAGE = "Wallet on different chain";

describe("address validation", () => {
  let ethWallet: Wallet;
  let arbWallet: Wallet;
  let baseWallet: Wallet;
  let offlineWallet: Wallet;

  beforeAll(async () => {
    ethWallet = getEthWallet_1();
    arbWallet = getArbitrumWallet_1();
    baseWallet = getBaseWallet_1();
    offlineWallet = getOfflineSigner_1();
  });

  describe("ETH address validation", () => {
    const router = new UniversalRouter(ChainType.ETH);

    it("validateRouter_validWallet_returnsTrue", async () => {
      // Arrange
      const isValidRouter = true;
      const expectedResult = isValidRouter;

      // Act
      const actualResult = await router.validateIsRouter(ethWallet);

      // Assert
      expect(actualResult).toBe(expectedResult);
    });

    it("validateRouter_offlineWallet_throwsError", async () => {
      // Arrange

      // Act / Assert
      await expect(router.validateIsRouter(offlineWallet)).rejects.toThrow(MISSING_PROVIDER_ERROR_MESSAGE);
    });

    it("validateRouter_invalidNetwork_throwsError", async () => {
      // Arrange

      // Act / Assert
      await expect(router.validateIsRouter(arbWallet)).rejects.toThrow(INVALID_NETWORK_ERROR_MESSAGE);
    });
  });

  describe("ARB address validation", () => {
    const router = new UniversalRouter(ChainType.ARB);

    it("validateRouter_validWallet_returnsTrue", async () => {
      // Arrange
      const isValidRouter = true;
      const expectedResult = isValidRouter;

      // Act
      const actualResult = await router.validateIsRouter(arbWallet);

      // Assert
      expect(actualResult).toBe(expectedResult);
    });

    it("validateRouter_offlineWallet_throwsError", async () => {
      // Arrange

      // Act / Assert
      await expect(router.validateIsRouter(offlineWallet)).rejects.toThrow(MISSING_PROVIDER_ERROR_MESSAGE);
    });
  });

  describe("BASE address validation", () => {
    const router = new UniversalRouter(ChainType.BASE);

    it("validateRouter_validWallet_returnsTrue", async () => {
      // Arrange
      const isValidRouter = true;
      const expectedResult = isValidRouter;

      // Act
      const actualResult = await router.validateIsRouter(baseWallet);

      // Assert
      expect(actualResult).toBe(expectedResult);
    });

    it("validateRouter_invalidWallet_throwsError", async () => {
      // Arrange

      // Act / Assert
      await expect(router.validateIsRouter(offlineWallet)).rejects.toThrow(MISSING_PROVIDER_ERROR_MESSAGE);
    });
  });
});

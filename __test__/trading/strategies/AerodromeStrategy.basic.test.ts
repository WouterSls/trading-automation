import { ChainType } from "../../../src/config/chain-config";
import { AerodromeStrategy } from "../../../src/models/trading/strategies/AerodromeStrategy";

const STRATEGY_NAME = "AerodromeStrategy";

describe("Aerodrome Strategy Basic Tests", () => {
  describe("constructor and basic setup", () => {
    it("should create strategy with correct name", () => {
      const strategy = new AerodromeStrategy(STRATEGY_NAME, ChainType.BASE);
      expect(strategy.getName()).toBe(STRATEGY_NAME);
    });

    it("should initialize with correct chain configuration", () => {
      const testStrategy = new AerodromeStrategy("TestStrategy", ChainType.BASE);
      expect(testStrategy.getName()).toBe("TestStrategy");
    });

    it("should throw error when initialized on non-Base chain", () => {
      expect(() => new AerodromeStrategy("TestStrategy", ChainType.ETH)).toThrow(
        "AerodromeStrategy is only supported on Base chain",
      );
    });

    it("should throw error when initialized on Arbitrum chain", () => {
      expect(() => new AerodromeStrategy("TestStrategy", ChainType.ARB)).toThrow(
        "AerodromeStrategy is only supported on Base chain",
      );
    });
  });

  describe("Cross-Chain validation", () => {
    it("should only work on Base chain", () => {
      expect(() => new AerodromeStrategy("Test", ChainType.ETH)).toThrow(
        "AerodromeStrategy is only supported on Base chain",
      );
      expect(() => new AerodromeStrategy("Test", ChainType.ARB)).toThrow(
        "AerodromeStrategy is only supported on Base chain",
      );
    });

    it("should work correctly on Base chain", () => {
      const strategy = new AerodromeStrategy("Test", ChainType.BASE);
      expect(strategy.getName()).toBe("Test");
    });
  });

  describe("strategy interface compliance", () => {
    let strategy: AerodromeStrategy;

    beforeEach(() => {
      strategy = new AerodromeStrategy("TestStrategy", ChainType.BASE);
    });

    it("should implement getName method", () => {
      expect(typeof strategy.getName).toBe("function");
      expect(strategy.getName()).toBe("TestStrategy");
    });

    it("should implement getEthUsdcPrice method", () => {
      expect(typeof strategy.getEthUsdcPrice).toBe("function");
    });

    it("should implement getTokenEthLiquidity method", () => {
      expect(typeof strategy.getTokenEthLiquidity).toBe("function");
    });

    it("should implement getTokenUsdcPrice method", () => {
      expect(typeof strategy.getTokenUsdcPrice).toBe("function");
    });

    it("should implement createBuyTransaction method", () => {
      expect(typeof strategy.createBuyTransaction).toBe("function");
    });

    it("should implement createSellTransaction method", () => {
      expect(typeof strategy.createSellTransaction).toBe("function");
    });

    it("should implement ensureTokenApproval method", () => {
      expect(typeof strategy.ensureTokenApproval).toBe("function");
    });
  });
});

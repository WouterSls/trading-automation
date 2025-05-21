import { ethers, Wallet } from "ethers";
import { NetworkForkManager } from "../../helpers/network-fork";
import { getArbitrumWallet_1, getHardhatWallet_1, getOfflineSigner_1 } from "../../../src/hooks/useSetup";
import { ChainConfig, ChainType, getChainConfig } from "../../../src/config/chain-config";

describe("ETH Uniswap V2 Strategy Test", () => {
  let chainConfig: ChainConfig;

  let wallet: Wallet;
  let nonNetworkWallet: Wallet;
  let offlineWallet: Wallet;

  beforeAll(async () => {
    const chain = ChainType.ETH;
    await NetworkForkManager.startHardhatFork(chain);
    chainConfig = getChainConfig(chain);
  });

  beforeEach(() => {
    wallet = getHardhatWallet_1();
    nonNetworkWallet = getArbitrumWallet_1();
    offlineWallet = getOfflineSigner_1();
  });

  afterAll(async () => {
    await NetworkForkManager.cleanupHardhatFork();
  });

  describe("getEthUsdcPrice", () => {});
});

describe("ARB Uniswap V2 Strategy Test", () => {
  let chainConfig: ChainConfig;

  let wallet: Wallet;
  let nonNetworkWallet: Wallet;
  let offlineWallet: Wallet;

  beforeAll(async () => {
    const chain = ChainType.ARB;
    await NetworkForkManager.startHardhatFork(chain);
    chainConfig = getChainConfig(chain);
  });

  beforeEach(() => {
    wallet = getHardhatWallet_1();
    nonNetworkWallet = getArbitrumWallet_1();
    offlineWallet = getOfflineSigner_1();
  });

  afterAll(async () => {
    await NetworkForkManager.cleanupHardhatFork();
  });

  describe("getEthUsdcPrice", () => {});
});

describe("BASE Uniswap V2 Strategy Test", () => {
  let chainConfig: ChainConfig;

  let wallet: Wallet;
  let nonNetworkWallet: Wallet;
  let offlineWallet: Wallet;

  beforeAll(async () => {
    const chain = ChainType.BASE;
    await NetworkForkManager.startHardhatFork(chain);
    chainConfig = getChainConfig(chain);
  });

  beforeEach(() => {
    wallet = getHardhatWallet_1();
    nonNetworkWallet = getArbitrumWallet_1();
    offlineWallet = getOfflineSigner_1();
  });

  afterAll(async () => {
    await NetworkForkManager.cleanupHardhatFork();
  });

  describe("getEthUsdcPrice", () => {});
});

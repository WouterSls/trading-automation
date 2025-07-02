import { ethers, Wallet } from "ethers";
import { getBaseWallet_1, getCoingeckoApi, getHardhatWallet_1, getTheGraphApi } from "../../src/hooks/useSetup";
import { createMinimalErc20 } from "../../src/smartcontracts/ERC/erc-utils";
import { TraderFactory } from "../../src/trading/TraderFactory";
import { GeckoTerminalApi } from "../../src/external-apis/GeckoTerminalApi";
import { ChainType, getChainConfig } from "../../src/config/chain-config";
import { InputType, TradeCreationDto } from "../../src/trading/types/_index";
import { ITradingStrategy } from "../../src/trading/ITradingStrategy";
import { encodePath, FeeAmount, UniswapV3QuoterV2 } from "../../src/smartcontracts/uniswap-v3";

// Define types for trade paths
interface SingleHopPath {
  type: "single";
  tokenIn: string;
  tokenOut: string;
  fee: FeeAmount;
  poolAddress: string;
}

interface MultiHopPath {
  type: "multi";
  path: string[];
  fees: FeeAmount[];
  encodedPath: string;
  poolAddress: string; // The pool that connects to the intermediate token
}

type TradePath = SingleHopPath | MultiHopPath;

interface TradePathResult {
  inputToken: string;
  inputTokenSymbol: string;
  paths: TradePath[];
}

/**
 * Generate trade paths from pools to WETH
 * @param pools - Array of pool data from The Graph
 * @param inputTokenAddress - The token we want to trade from
 * @param wethAddress - WETH contract address
 * @returns Array of possible trade paths to WETH
 */
function generateTradePathsToWeth(pools: any[], inputTokenAddress: string, wethAddress: string): TradePathResult[] {
  const results: TradePathResult[] = [];
  const inputTokenLower = inputTokenAddress.toLowerCase();
  const wethLower = wethAddress.toLowerCase();

  // Group pools by input token
  const poolsByInputToken = new Map<string, any[]>();

  for (const pool of pools) {
    let inputToken: string;
    let inputTokenSymbol: string;

    // Determine which token is our input token
    if (pool.token0.id.toLowerCase() === inputTokenLower) {
      inputToken = pool.token0.id;
      inputTokenSymbol = pool.token0.symbol;
    } else if (pool.token1.id.toLowerCase() === inputTokenLower) {
      inputToken = pool.token1.id;
      inputTokenSymbol = pool.token1.symbol;
    } else {
      continue; // This pool doesn't contain our input token
    }

    if (!poolsByInputToken.has(inputToken)) {
      poolsByInputToken.set(inputToken, []);
    }
    poolsByInputToken.get(inputToken)!.push(pool);
  }

  // Generate paths for each input token
  for (const [inputToken, tokenPools] of poolsByInputToken) {
    const inputTokenSymbol =
      tokenPools[0].token0.id.toLowerCase() === inputTokenLower
        ? tokenPools[0].token0.symbol
        : tokenPools[0].token1.symbol;

    const paths: TradePath[] = [];

    for (const pool of tokenPools) {
      const isToken0Input = pool.token0.id.toLowerCase() === inputTokenLower;
      const otherToken = isToken0Input ? pool.token1 : pool.token0;
      const poolFee = Number(pool.feeTier) as FeeAmount;

      // Check if the other token is WETH (direct path)
      if (otherToken.id.toLowerCase() === wethLower) {
        // Single hop: InputToken -> WETH
        // Create paths with different fee combinations
        const singleHopFees = [poolFee];

        // Add the pool's fee
        paths.push({
          type: "single",
          tokenIn: inputToken,
          tokenOut: wethAddress,
          fee: poolFee,
          poolAddress: pool.id,
        });
      } else {
        // Multi-hop: InputToken -> IntermediateToken -> WETH
        // Create two fee combinations as requested
        const multiHopPaths = [
          {
            path: [inputToken, otherToken.id, wethAddress],
            fees: [poolFee, FeeAmount.MEDIUM],
            poolAddress: pool.id,
          },
          {
            path: [inputToken, otherToken.id, wethAddress],
            fees: [poolFee, FeeAmount.HIGH],
            poolAddress: pool.id,
          },
        ];

        for (const pathConfig of multiHopPaths) {
          const encodedPath = encodePath(pathConfig.path, pathConfig.fees);

          paths.push({
            type: "multi",
            path: pathConfig.path,
            fees: pathConfig.fees,
            encodedPath,
            poolAddress: pathConfig.poolAddress,
          });
        }
      }
    }

    results.push({
      inputToken,
      inputTokenSymbol,
      paths,
    });
  }

  return results;
}

async function baseTraderInteraction(wallet: Wallet) {
  const chain = ChainType.BASE;
  const chainConfig = getChainConfig(chain);

  const graphApi = getTheGraphApi();
  const geckoTerminalApi = getCoingeckoApi();
  const quoter = new UniswapV3QuoterV2(chain);

  const network = await wallet.provider?.getNetwork();
  if (network?.chainId !== chainConfig.id) {
    throw new Error("Incorrect chain for wallet instance");
  }

  const trader = await TraderFactory.createTrader(wallet);
  if (trader.getChain() !== ChainType.BASE) {
    throw new Error("Wallet initialization issue");
  }

  const UNI_ADDRESS = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";
  const INPUT_AMOUNT = 1;
  const trade: TradeCreationDto = {
    chain: chain,
    inputType: InputType.ETH,
    inputToken: ethers.ZeroAddress,
    inputAmount: INPUT_AMOUNT.toString(),
    outputToken: UNI_ADDRESS,
  };

  const ethBalance = await wallet.provider?.getBalance(wallet.address);
  console.log("=== WALLET INFO ===");
  console.log(`${wallet.address} (network: ${trader.getChain()})`);
  console.log(`ETH: ${ethers.formatEther(ethBalance!)}`);
  console.log();

  const AERO_ADDRESS = "0x940181a94A35A4569E4529A3CDfB74e38FD98631";
  const GAME_ADDRESS = "0x1c4cca7c5db003824208adda61bd749e55f463a3";
  const WETH_ADDRESS = chainConfig.tokenAddresses.weth;
  const game = await createMinimalErc20(GAME_ADDRESS, wallet.provider!);
  if (!game) throw new Error("Error during GAME token creation");
  const gameUsdPrice = await geckoTerminalApi.getTokenUsdPrice(chain, GAME_ADDRESS);
  console.log(`${game.getName()} | ${game.getTokenAddress()}`);
  console.log(`$${gameUsdPrice}`);

  //const pools = await graphApi.getTopUniV3PoolsWithOrdering(chain, game.getTokenAddress(), "volumeUSD");
  const pools = await graphApi.getTopUniV3PoolsByTokenAmount(chain, GAME_ADDRESS);

  // Generate trade paths to WETH
  const tradePaths = generateTradePathsToWeth(pools, GAME_ADDRESS, WETH_ADDRESS);

  console.log("=== GENERATED TRADE PATHS ===");
  for (const tokenResult of tradePaths) {
    console.log(`\n${tokenResult.inputTokenSymbol} (${tokenResult.inputToken}) -> WETH paths:`);

    for (let i = 0; i < tokenResult.paths.length; i++) {
      const path = tokenResult.paths[i];
      console.log(`\nPath ${i + 1}:`);

      if (path.type === "single") {
        console.log(`  Type: Single Hop`);
        console.log(`  Route: ${tokenResult.inputTokenSymbol} -> WETH`);
        console.log(`  Fee: ${path.fee}`);
        console.log(`  Pool: ${path.poolAddress}`);
        console.log(`  Use: quoteExactInputSingle()`);
      } else {
        console.log(`  Type: Multi Hop`);
        console.log(
          `  Route: ${path.path
            .map((addr, idx) => {
              if (idx === 0) return tokenResult.inputTokenSymbol;
              if (idx === path.path.length - 1) return "WETH";
              // Find the intermediate token symbol from pools
              const intermediateToken = pools.find(
                (p) =>
                  p.token0.id.toLowerCase() === addr.toLowerCase() || p.token1.id.toLowerCase() === addr.toLowerCase(),
              );
              if (intermediateToken) {
                return intermediateToken.token0.id.toLowerCase() === addr.toLowerCase()
                  ? intermediateToken.token0.symbol
                  : intermediateToken.token1.symbol;
              }
              return addr.slice(0, 8) + "...";
            })
            .join(" -> ")}`,
        );
        console.log(`  Fees: [${path.fees.join(", ")}]`);
        console.log(`  Pool: ${path.poolAddress}`);
        console.log(`  Encoded Path: ${path.encodedPath}`);
        console.log(`  Use: quoteExactInput()`);
      }
    }
  }

  console.log("\n=== DETAILED POOL INFO ===");
  for (const pool of pools) {
    console.log("fee:", pool.feeTier);
    console.log(`${pool.token0.symbol} / ${pool.token1.symbol}`);
    console.log("address:", pool.id);
    if (pool.token0.name.toLowerCase().includes("game")) {
      console.log("Game locked: ", pool.totalValueLockedToken0);
    } else {
      console.log("Game locked:", pool.totalValueLockedToken1);
    }
    console.log("----------------------------------");
  }

  const strategies = trader.getStrategies();
  for (const strat of strategies) {
    console.log(strat.getName());
    const price = await strat.getEthUsdcPrice(wallet);
    //const gamePrice = await strat.getTokenUsdcPrice(wallet, game.getTokenAddress());
    //const ethLiq = await strat.getTokenEthLiquidity(wallet, game.getTokenAddress());
    console.log(`\tETH/USDC: ${price}`);
    // TODO: GAME uses virtual as intermediary token & not weth
    //console.log(`\tGAME/USDC: ${gamePrice}`);
    //console.log(`\tGAME eth liquidity depth: ${ethLiq}`);
  }
}

if (require.main === module) {
  const wallet = getHardhatWallet_1();
  const liveWallet = getBaseWallet_1();

  baseTraderInteraction(liveWallet).catch(console.error);
}

export { baseTraderInteraction };

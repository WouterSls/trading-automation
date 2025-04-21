import { ChainType, getChainConfig } from "../config/chain-config";

// Configs
const ethConfig = getChainConfig(ChainType.ETH);
const arbConfig = getChainConfig(ChainType.ARB);
const baseConfig = getChainConfig(ChainType.BASE);

// ETH
export const ETH_WETH_ADDRESS = ethConfig.tokenAddresses.weth;
export const ETH_USDC_ADDRESS = ethConfig.tokenAddresses.usdc;
export const ETH_PEPE_ADDRESS = "0x6982508145454Ce325dDbE47a25d4ec3d2311933";
export const ETH_BERASTONE_ADDRESS = "0x97Ad75064b20fb2B2447feD4fa953bF7F007a706";
export const ETH_FLAYER_ADDRESS = "0xf1a7000000950c7ad8aff13118bb7ab561a448ee";

export const ETH_EOA_ACCOUNT_ADDRESS = "0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b";

// ETH UNISWAP
export const V2_PAIR_ARB_WETH_ADDRESS = "0x103B03051Bf073c44DECfAF8dFd12275254AB97E";
export const V2_PAIR_PEPE_ETH_ADDRESS = "0xA43fe16908251ee70EF74718545e4FE6C5cCEc9f";
// 0.3% Fee
export const V3_POOL_PEPE_ETH_3000_ADDRESS = "0x11950d141EcB863F01007AdD7D1A342041227b58";
// 0.05% Fee
export const V3_POOL_PEPE_ETH_500_ADDRESS = "0x4990875800000000000000000000000000000000";

// BASE
export const BASE_WETH_ADDRESS = baseConfig.tokenAddresses.weth;
export const BASE_USDC_ADDRESS = baseConfig.tokenAddresses.usdc;
export const BASE_VIRTUAL_ADDRESS = "0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b";

// BASE UNISWAP
export const V2_PAIR_BASE_VIRTUAL_WETH_ADDRESS = "0xE31c372a7Af875b3B5E0F3713B17ef51556da667";

// ARBITRUM
export const ARB_WETH_ADDRESS = arbConfig.tokenAddresses.weth;
export const ARB_USDC_ADDRESS = arbConfig.tokenAddresses.usdc;
export const ARB_ARB_ADDRESS = "0x912CE59144191C1204E64559FE8253a0e49E6548";

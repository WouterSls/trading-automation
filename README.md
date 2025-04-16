# DeFi TypeScript

A TypeScript library for interacting with various DeFi protocols across multiple blockchains (Ethereum, Arbitrum, Base).

## Overview

This library provides a clean, type-safe interface for blockchain interactions, price data retrieval, and trading on decentralized exchanges. It supports multiple chains and protocols with a unified API.

## Features

- **Multi-Chain Support**: Ethereum, Arbitrum, and Base networks
- **Protocol Integrations**: Uniswap V2, Uniswap V3, and more
- **Price Data**: Integration with GeckoTerminal and Alchemy for token pricing
- **Wallet Management**: Tools for wallet information and transactions
- **Trading**: Token swapping and trading functionality
- **Type Safety**: Full TypeScript typing for a safer development experience

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```
ALCHEMY_API_KEY=your_alchemy_api_key
ETH_PRIVATE_KEY=your_ethereum_wallet_private_key
ARB_PRIVATE_KEY=your_arbitrum_wallet_private_key
BASE_PRIVATE_KEY=your_base_wallet_private_key
```

## Usage Examples

### Getting Token Prices

```typescript
import { AlchemyApi } from "./src/services/AlchemyApi";
import { NetworkEnum } from "./src/lib/types/alchemy-api.types";

const api = new AlchemyApi(process.env.ALCHEMY_API_KEY);
const tokenPrice = await api.getTokenPrice(NetworkEnum.MAINNET, "0xTokenAddress");
console.log(`Token price: $${tokenPrice.price}`);
```

### Trading Tokens

```typescript
import { buyToken } from "./src/scripts/trader/buyToken";

// Buy $100 worth of a token
await buyToken(100, "0xTokenAddress");
```

### Wallet Information

```typescript
import { Wallet } from "ethers";
import { getArbitrumWallet_1 } from "./src/config/setup-config";

const wallet = await getArbitrumWallet_1();
console.log(`Wallet address: ${wallet.address}`);
```

## Architecture

The project is organized into the following structure:

- **config/**: Chain configuration and setup
- **contract-abis/**: ABI definitions for smart contract interactions
- **lib/**: Utility functions and type definitions
- **models/**: Core business logic and abstractions
- **scripts/**: Executable scripts for various operations
- **services/**: External API integrations

## Supported Chains

- Ethereum Mainnet
- Arbitrum One
- Base

## Supported Protocols

- Uniswap V2
- Uniswap V3
- (More to come)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC

## Disclaimers

This software is for educational purposes only. Use at your own risk. Always verify transactions before signing them, and never expose your private keys.

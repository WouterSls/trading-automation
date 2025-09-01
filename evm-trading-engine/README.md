# EVM Trading Engine

A TypeScript library for interacting with various DeFi protocols across multiple blockchains (Ethereum, Arbitrum, Base).

## Overview

This library provides a clean, type-safe interface for blockchain interactions, price data retrieval, and trading on decentralized exchanges. It supports multiple chains and protocols with a unified API.

## Architecture

The project is organized into the following structure:

### Core Source (`src/`)

- **config/**: Chain configuration and trading setup
- **external-apis/**: External API integrations
- **hooks/**: Custom hooks and setup utilities
- **lib/**: Utility functions and type definitions
- **routing/**: Routing models strategies and logic
- **smartcontracts/**: Smartcontract interaction models
- **trading/**: Trading-specific models and logic

### Scripts (`__script__/`)

- **external-apis/**: Scripts for external service interactions
  - Alchemy wallet information retrieval
  - GeckoTerminal price and pool data
  - The Graph token pool information
- **hardhat/**: Hardhat-related scripts for testing and development
- **lib/**: library scripts for testing and development
- **smartcontracts/**: smartcontract interaction scripts
- **trading/**: Trading operation scripts

### Tests (`__test__/`)

- **external-apis/**: Scripts for external service interactions
- **helpers/**: Test utility functions and helpers
- **smartcontracts/**: Unit tests for smartcontracts abstractions
- **trading/**: Trading operation scripts

## Configuration

Create a `.env` file in the root directory with the following variables:

```
BASE_RPC_URL=
ARB_RPC_URL=
ETH_RPC_URL=

PRIVATE_KEY=

HARDHAT_RPC_URL= http://127.0.0.1:8545/
HARDHAT_PRIVATE_KEY_1=found on hardhat startup
HARDHAT_PRIVATE_KEY_2=found on hardhat startup

ALCHEMY_API_KEY=
THE_GRAPH_API_KEY=
```

setup and usage of .env variables can be found in hooks/useSetup.ts

## Usage Examples

for interaction with the trading engine check the (`__script__/`) directory for all interaction scripts

## Features

- **Multi-Chain Support**: Ethereum, Arbitrum, and Base networks
- **Protocol Integrations**: Uniswap V2, Uniswap V3, and Aerodrome
- **Price Data**: Integration with GeckoTerminal, Alchemy and TheGraph for token pricing and price info
- **Trading**: Token swapping and trading functionality
- **Type Safety**: Full TypeScript typing for a safer development experience

## Supported Chains

- Ethereum Mainnet
- Arbitrum One
- Base

## Supported Protocols

- Uniswap V2
- Uniswap V3
- Aerodrome

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the [MIT License](LICENSE).

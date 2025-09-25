# Trading Automation Repository

Repository to facilitate automated crypto trading. It aims to resolve the UX problem: why can't I simply sell token X at price Y?

## Overview

This project holds 3 sections.
- 1. docs 
- 2. evm-trading-engine
- 3. smart-contracts

### docs

Markdown files that explain / add on to the project. Currently holding a) EIP712 security deep dive, which explains the benefits of EIP-712 and why it should be used b) Token flow optimization guide, how can optimize gas usage of the executor contracts used in smart-contracts  

### evm-trading-engine

An EVM trading engine build with typescript and ethersjs. This allows automated trading in a custiodal way. Simulate and execute blockchain trading by using typescript abstraction of smart contracts and trader classes to orchestrate trading.

The engine is build to handle trades of type TradeCreationDto

```ts
export type TradeCreationDto = {
  chain: ChainType;
  inputType: InputType;
  inputToken: string;
  inputAmount: string | "ALL";
  outputToken: string;
};
```

### smart-contracts

The smart-contracts sections holds a foundry project that uses smartcontracts with EIP-712 to allow trading automation in a non-custiodial way. Inside you'll find an implemented Executor contract that uses a registry pattern to access trader that interact with various protocols.

The traders implement the following ITrader solidity interface

```solidity
interface ITrader {
    struct TradeParameters {
        address inputToken;
        uint256 inputAmount;
        address outputToken;
        ExecutorValidation.RouteData routeData;
    }

    /**
     * @notice Execute a trade using DEX-specific logic
     * @param params the trade parameters (path, fees, etc.)
     * @return amountOut The actual amount of output tokens received
     */
    function trade(TradeParameters calldata params) external returns (uint256 amountOut);

    /**
     * @notice Get the address of the contract this trader uses trade (Router, Exchange, Swapper)
     * @return The address for approvals and calls
     */
    function getTraderAddress() external view returns (address);

    /**
     * @notice A function to recover funds that are stuck in the contract
     * @param token The token to recover
     * @param to The recipient of the token
     */
    function emergencyRecover(address token, address to) external;
}
```
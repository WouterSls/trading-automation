# Trading Automation Repository

this project is archived in favor for the new [EIP-712 Executor Automation](https://github.com/WouterSls/EIP712-Executor-Automation) repository.

The original scope of the project was to automate trading in a custodial way. This remains available in the **EVM-trading-engine** section of the repo.

The new repository will focus on non-custiodal automated trading using EIP712 & account abstraction.

## Overview

This project holds 4 sections.
- 1. docs 
- 2. evm-trading-engine
- 3. scripts
- 4. smart-contracts

### docs

Markdown files that explain / add on to the project. Currently holding a) EIP712 security deep dive, which explains the benefits of EIP-712 and why it should be used b) Token flow optimization guide, how can optimize gas usage of the executor contracts c) type consistency guide, this guide directly relates to the script section. which holds scripts that enable type consistency between solidity and typescript. this guid gives a brief explanation.

### evm-trading-engine

Original scope of the project -> An EVM trading engine build with typescript and ethersjs. this will allow automated trading in a custiodial way. check the section for more info

### scripts

scripts that enable EIP712 type consistency between the smart-contracts (solidity) and evm-trading-engine (typescript) sections. read the type consistency guide for more info

### smart-contracts

foundry project with the initial outline of the executor contract setup and utilization.
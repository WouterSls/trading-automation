start:	
	@echo "Starting local ethereum fork with Hardhat..."
	npx hardhat node

start-base:
	@echo "Starting local Base chain fork with Hardhat..."
	FORK_NETWORK=base npx hardhat node

start-arbitrum:
	@echo "Starting local Arbitrum chain fork with Hardhat..."
	FORK_NETWORK=arbitrum npx hardhat node

kill:
	@echo "Killing port 8545 for local ethereum fork with Hardhat..."
	-@lsof -t -i:8545 | xargs -r kill -15
	@echo "Port 8545 killed"


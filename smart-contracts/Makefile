start-al:
	anvil --fork-url https://eth-mainnet.g.alchemy.com/v2/QxLBeuGOK2JfjGRgVSnumKzAWS_9k4-Z
start:
	anvil --fork-url https://reth-ethereum.ithaca.xyz/rpc

deploy:
	forge script script/Counter.s.sol --rpc-url $RPC_URL --broadcast --private-key $KEY -vvvv

deploy-token:
	forge script script/DeploySimpleToken.s.sol --rpc-url $RPC_URL --broadcast --private-key $KEY -vvvv

test-token:
	forge test --match-contract SimpleTokenTest -vvvv
	
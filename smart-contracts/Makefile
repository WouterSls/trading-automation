ifneq (,$(wildcard .env))
include .env
export
endif

start-eth:
	anvil --chain-id 31337 --fork-url $(ETH_RPC)

deploy-executor-local:
	forge script script/DeployExecutorETH.s.sol --rpc-url $(LOCAL_RPC) --broadcast

deploy-script-with-key:
	forge script script/DeployContract.s.sol --rpc-url $(RPC_URL) --broadcast --private-key $(KEY) -vvvv

deploy-script-with-env:
	forge script script/DeployContract.s.sol --rpc-url $(RPC_URL) --broadcast -vvvv
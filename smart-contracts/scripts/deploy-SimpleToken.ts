import { ethers } from "hardhat";
//import { SimpleToken } from "../typechain-types";

async function main() {
  console.log("🚀 Deploying SimpleToken...");
  console.log("============================");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("📋 Deployment Details:");
  console.log("  Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("  Deployer:", deployer.address);
  console.log("  Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log();

  // Token configuration
  const TOKEN_CONFIG = {
    name: "Trading Engine Token",
    symbol: "TET", 
    decimals: 18,
    initialSupply: 1000000, // 1 million tokens
    owner: deployer.address
  };

  console.log("🪙 Token Configuration:");
  console.log("  Name:", TOKEN_CONFIG.name);
  console.log("  Symbol:", TOKEN_CONFIG.symbol); 
  console.log("  Decimals:", TOKEN_CONFIG.decimals);
  console.log("  Initial Supply:", TOKEN_CONFIG.initialSupply.toLocaleString());
  console.log("  Owner:", TOKEN_CONFIG.owner);
  console.log();

  // Deploy the contract
  console.log("📤 Deploying contract...");
  const SimpleTokenFactory = await ethers.getContractFactory("SimpleToken");
  const simpleToken = await SimpleTokenFactory.deploy(
    TOKEN_CONFIG.name,
    TOKEN_CONFIG.symbol,
    TOKEN_CONFIG.decimals,
    TOKEN_CONFIG.initialSupply,
    TOKEN_CONFIG.owner
  );

  console.log("⏳ Waiting for deployment confirmation...");
  await simpleToken.waitForDeployment();
  
  const contractAddress = await simpleToken.getAddress();
  console.log("✅ SimpleToken deployed successfully!");
  console.log("  Contract Address:", contractAddress);
  console.log();

  // Verify deployment by reading contract state
  console.log("🔍 Verifying deployment...");
  const name = await simpleToken.name();
  const symbol = await simpleToken.symbol();
  const decimals = await simpleToken.decimals();
  const totalSupply = await simpleToken.totalSupply();
  const ownerBalance = await simpleToken.balanceOf(deployer.address);
  const domainSeparator = await simpleToken.getDomainSeparator();

  console.log("📊 Contract State:");
  console.log("  Name:", name);
  console.log("  Symbol:", symbol);
  console.log("  Decimals:", decimals);
  console.log("  Total Supply:", ethers.formatUnits(totalSupply, decimals));
  console.log("  Owner Balance:", ethers.formatUnits(ownerBalance, decimals));
  console.log("  Domain Separator:", domainSeparator);
  console.log();

  // Save deployment info for integration with your trading engine
  const deploymentInfo = {
    contractAddress,
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    blockNumber: await ethers.provider.getBlockNumber(),
    timestamp: new Date().toISOString(),
    config: TOKEN_CONFIG,
    domainSeparator
  };

  console.log("💾 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  console.log();
  console.log("🎉 Deployment Complete!");
  console.log("📝 You can now integrate this contract with your trading engine:");
  console.log(`   const token = new ethers.Contract("${contractAddress}", SimpleTokenABI, provider);`);
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

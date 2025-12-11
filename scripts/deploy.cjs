const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

/**
 * Deploy Zackathon contract to Sepolia testnet
 * This script deploys the FHEVM v0.9-powered hackathon platform
 */
async function main() {
  console.log("\n🚀 Deploying Zackathon contract to Sepolia...");
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", hre.network.config.chainId);
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    throw new Error("❌ Deployer has no ETH! Get Sepolia ETH from faucet: https://sepoliafaucet.com");
  }
  
  console.log("\n📝 Deploying Zackathon contract...");
  
  const Zackathon = await hre.ethers.getContractFactory("Zackathon");
  const zackathon = await Zackathon.deploy();
  
  console.log("⏳ Waiting for deployment transaction...");
  await zackathon.waitForDeployment();
  
  const address = await zackathon.getAddress();
  
  console.log("\n✅ Zackathon deployed successfully!");
  console.log("📍 Contract address:", address);
  console.log("🔗 View on Etherscan:", `https://sepolia.etherscan.io/address/${address}`);
  
  console.log("\n🔐 FHEVM v0.9 Configuration (Sepolia):");
  console.log("ACL Contract:          0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D");
  console.log("KMS Verifier:          0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A");
  console.log("Input Verifier:        0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0");
  console.log("Decryption Address:    0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478");
  console.log("Input Verification:    0x483b9dE06E4E4C7D35CCf5837A1668487406D955");
  console.log("Gateway Chain ID:      10901");
  console.log("Relayer URL:           https://relayer.testnet.zama.org");
  
  const config = {
    contractAddress: address,
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    fhevm: {
      aclContractAddress: '0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D',
      kmsContractAddress: '0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A',
      inputVerifierContractAddress: '0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0',
      verifyingContractAddressDecryption: '0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478',
      verifyingContractAddressInputVerification: '0x483b9dE06E4E4C7D35CCf5837A1668487406D955',
      chainId: 11155111,
      gatewayChainId: 10901,
      relayerUrl: 'https://relayer.testnet.zama.org'
    }
  };
  
  const utilsDir = path.join(__dirname, '..', 'src', 'utils');
  if (!fs.existsSync(utilsDir)) {
    fs.mkdirSync(utilsDir, { recursive: true });
  }
  
  const configPath = path.join(utilsDir, 'contractConfig.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  console.log("\n💾 Contract config saved to:", configPath);
  
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    if (envContent.includes('VITE_CONTRACT_ADDRESS=')) {
      envContent = envContent.replace(
        /VITE_CONTRACT_ADDRESS=.*/,
        `VITE_CONTRACT_ADDRESS=${address}`
      );
    } else {
      envContent += `\n\n# Contract address (Auto-generated)\nVITE_CONTRACT_ADDRESS=${address}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log("✅ Updated .env with contract address");
  }
  
  console.log("\n📋 Next steps:");
  console.log("1. Start your app: npm run dev");
  console.log("\n✨ Deployment complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
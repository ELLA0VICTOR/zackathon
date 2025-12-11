import { ethers } from "ethers";
import contractArtifact from '../../artifacts/contracts/Zackathon.sol/Zackathon.json';

/**
 * Get contract address from environment or config
 * Priority: VITE_CONTRACT_ADDRESS env variable > contractConfig.json
 */
export const getContractAddress = () => {
  const envAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
  
  if (envAddress) {
    console.log('📍 Using contract address from env:', envAddress);
    return envAddress;
  }
  
  console.warn('⚠️ No VITE_CONTRACT_ADDRESS found in environment');
  return null;
};

/**
 * Load contract address from config file (async fallback)
 */
export const getContractAddressAsync = async () => {
  try {
    const config = await import("./contractConfig.json");
    const address = config.default?.contractAddress || config.contractAddress;
    console.log('📍 Using contract address from config:', address);
    return address;
  } catch (err) {
    console.warn('Failed to load contractConfig.json:', err.message);
    return getContractAddress();
  }
};

/**
 * Get connected Ethers Contract instance
 * 
 * @param {ethers.Signer | ethers.Provider} signerOrProvider - Ethers signer or provider
 * @returns {ethers.Contract | null} Contract instance
 */
export const getContract = (signerOrProvider) => {
  const address = getContractAddress();
  
  if (!address) {
    console.error("❌ No contract address found. Deploy contract first or set VITE_CONTRACT_ADDRESS");
    return null;
  }
  
  if (!signerOrProvider) {
    console.warn("⚠️ No signer or provider passed to getContract()");
    return null;
  }
  
  try {
    const contract = new ethers.Contract(address, contractArtifact.abi, signerOrProvider);
    console.log('✓ Contract instance created:', address);
    return contract;
  } catch (error) {
    console.error('❌ Failed to create contract instance:', error);
    return null;
  }
};

/**
 * Get contract ABI
 * @returns {any[]} Contract ABI
 */
export const getContractABI = () => {
  return contractArtifact.abi;
};

/**
 * Validate contract address format
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid Ethereum address
 */
export const isValidAddress = (address) => {
  if (!address) return false;
  return ethers.isAddress(address);
};

/**
 * Format address for display (0x1234...5678)
 * @param {string} address - Full address
 * @param {number} chars - Number of chars to show on each side
 * @returns {string} Formatted address
 */
export const formatAddress = (address, chars = 4) => {
  if (!address) return '';
  if (!isValidAddress(address)) return address;
  return `${address.substring(0, chars + 2)}...${address.substring(42 - chars)}`;
};

/**
 * Parse transaction error message
 * @param {Error} error - Error from contract call
 * @returns {string} User-friendly error message
 */
export const parseContractError = (error) => {
  if (!error) return 'Unknown error';
  
  const message = error.message || error.toString();
  
  if (message.includes('user rejected')) {
    return 'Transaction rejected by user';
  }
  
  if (message.includes('insufficient funds')) {
    return 'Insufficient ETH for transaction';
  }
  
  if (message.includes('Only organizer')) {
    return 'Only hackathon organizer can perform this action';
  }
  
  if (message.includes('Only judge')) {
    return 'Only authorized judges can perform this action';
  }
  
  if (message.includes('Already registered')) {
    return 'You are already registered for this hackathon';
  }
  
  if (message.includes('Already submitted')) {
    return 'You have already submitted a project';
  }
  
  if (message.includes('Not registered')) {
    return 'You must register for the hackathon first';
  }
  
  if (message.includes('Submission deadline passed')) {
    return 'Submission deadline has passed';
  }
  
  if (message.includes('Judging deadline passed')) {
    return 'Judging deadline has passed';
  }
  
  if (message.includes('Too early')) {
    return 'Cannot perform this action yet - wait for deadline';
  }
  
  if (message.includes('Invalid hackathon')) {
    return 'Hackathon not found';
  }
  
  if (message.includes('Max participants reached')) {
    return 'Maximum number of participants reached';
  }
  
  if (message.includes('Minimum 3 judges required')) {
    return 'Hackathon must have at least 3 judges';
  }
  
  if (message.includes('Access not granted')) {
    return 'Judge access has not been granted yet';
  }
  
  if (message.includes('Not all judges scored')) {
    return 'All judges must submit scores before calculating winners';
  }
  
  if (message.includes('Already scored')) {
    return 'You have already scored this submission';
  }
  
  if (message.includes('No submissions')) {
    return 'No submissions to process';
  }
  
  if (message.includes('Winners not calculated')) {
    return 'Winners must be calculated before revealing results';
  }
  
  return message.substring(0, 100);
};

/**
 * Wait for transaction confirmation with retry logic
 * @param {ethers.TransactionResponse} tx - Transaction response
 * @param {number} confirmations - Number of confirmations to wait for
 * @returns {Promise<ethers.TransactionReceipt>} Transaction receipt
 */
export const waitForTransaction = async (tx, confirmations = 1) => {
  console.log('⏳ Waiting for transaction confirmation...');
  console.log('  → Transaction hash:', tx.hash);
  
  try {
    const receipt = await tx.wait(confirmations);
    console.log('✓ Transaction confirmed!');
    console.log('  → Block number:', receipt.blockNumber);
    console.log('  → Gas used:', receipt.gasUsed.toString());
    return receipt;
  } catch (error) {
    console.error('❌ Transaction failed:', error);
    throw new Error(parseContractError(error));
  }
};

/**
 * Estimate gas for contract call
 * @param {Function} contractMethod - Contract method to estimate
 * @param {any[]} args - Method arguments
 * @returns {Promise<bigint>} Estimated gas
 */
export const estimateGas = async (contractMethod, ...args) => {
  try {
    const gasEstimate = await contractMethod.estimateGas(...args);
    const gasWithBuffer = (gasEstimate * 120n) / 100n;
    console.log('⛽ Gas estimate:', {
      estimated: gasEstimate.toString(),
      withBuffer: gasWithBuffer.toString()
    });
    return gasWithBuffer;
  } catch (error) {
    console.warn('⚠️ Gas estimation failed:', error.message);
    return 500000n;
  }
};

/**
 * Check if user has enough ETH for transaction
 * @param {ethers.Provider} provider - Ethers provider
 * @param {string} address - User address
 * @param {bigint} estimatedGas - Estimated gas amount
 * @returns {Promise<boolean>} True if user has enough ETH
 */
export const checkBalance = async (provider, address, estimatedGas) => {
  try {
    const balance = await provider.getBalance(address);
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || 20000000000n;
    const requiredAmount = estimatedGas * gasPrice;
    
    const hasEnough = balance >= requiredAmount;
    
    if (!hasEnough) {
      console.warn('⚠️ Insufficient balance:', {
        balance: ethers.formatEther(balance),
        required: ethers.formatEther(requiredAmount)
      });
    }
    
    return hasEnough;
  } catch (error) {
    console.error('❌ Balance check failed:', error);
    return false;
  }
};
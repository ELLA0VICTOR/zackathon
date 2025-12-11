/**
 * FHEVM v0.9 Initialization for Zackathon
 * Using @zama-fhe/relayer-sdk v0.3.0-5 (CDN)
 * 
 * CDN URL: https://cdn.zama.org/relayer-sdk-js/0.3.0-5/relayer-sdk-js.umd.cjs
 * 
 * CRITICAL WORKFLOW:
 * 1. SDK loaded via <script> tag in index.html (creates window.relayerSDK global)
 * 2. Call window.relayerSDK.initSDK() to load WASM
 * 3. Call window.relayerSDK.createInstance() with v0.9 Sepolia config
 */

let fhevmInstance = null;
let isInitialized = false;

/**
 * FHEVM v0.9 Sepolia Configuration
 * Source: Verified addresses from Zama documentation 2025
 */
const SEPOLIA_V09_CONFIG = {
  aclContractAddress: '0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D',
  kmsContractAddress: '0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A',
  inputVerifierContractAddress: '0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0',
  verifyingContractAddressDecryption: '0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478',
  verifyingContractAddressInputVerification: '0x483b9dE06E4E4C7D35CCf5837A1668487406D955',
  chainId: 11155111,
  gatewayChainId: 10901,
  relayerUrl: 'https://relayer.testnet.zama.org',
};

/**
 * Wait for SDK to load from CDN with timeout
 * @param {number} maxWaitMs - Maximum wait time in milliseconds
 * @returns {Promise<void>}
 */
async function waitForSDKLoaded(maxWaitMs = 10000) {
  if (typeof window === 'undefined') {
    throw new Error('Must run in browser environment');
  }
  
  if (window.relayerSDK && window.relayerSDK.initSDK && window.relayerSDK.createInstance) {
    return;
  }
  
  const startTime = Date.now();
  const checkInterval = 100;
  
  return new Promise((resolve, reject) => {
    const checkSDK = () => {
      if (window.relayerSDK && window.relayerSDK.initSDK && window.relayerSDK.createInstance) {
        resolve();
        return;
      }
      
      const elapsed = Date.now() - startTime;
      if (elapsed >= maxWaitMs) {
        reject(new Error(
          `FHEVM SDK failed to load within ${maxWaitMs}ms. ` +
          'Make sure this script is in index.html:\n' +
          '<script src="https://cdn.zama.org/relayer-sdk-js/0.3.0-5/relayer-sdk-js.umd.cjs"></script>'
        ));
        return;
      }
      
      setTimeout(checkSDK, checkInterval);
    };
    
    checkSDK();
  });
}

/**
 * Initialize FHEVM SDK
 * MUST be called before any encryption/decryption operations
 * 
 * @returns {Promise<FhevmInstance>}
 */
export async function initFhevm() {
  if (fhevmInstance && isInitialized) {
    console.log('✓ FHEVM already initialized, returning existing instance');
    return fhevmInstance;
  }
  
  try {
    console.log('🔧 Initializing FHEVM SDK v0.9 (CDN v0.3.0-5)...');
    
    console.log('  → Waiting for SDK script to load...');
    await waitForSDKLoaded(10000);
    console.log('  ✓ SDK loaded from CDN');
    
    console.log('  → Loading TFHE WASM...');
    await window.relayerSDK.initSDK();
    console.log('  ✓ TFHE WASM loaded successfully');
    
    console.log('  → Creating FHEVM instance with v0.9 config...');
    
    const config = {
      ...SEPOLIA_V09_CONFIG,
      network: 'https://sepolia.infura.io/v3/d05efcb7210a474e8b98308181a49685',
    };
    
    console.log('  → Config:', {
      chainId: config.chainId,
      gatewayChainId: config.gatewayChainId,
      relayerUrl: config.relayerUrl,
      hasMetaMask: !!window.ethereum
    });
    
    try {
      fhevmInstance = await window.relayerSDK.createInstance(config);
    } catch (error) {
      console.warn('Failed to create instance, retrying...', error);
      await new Promise(resolve => setTimeout(resolve, 1000));
      fhevmInstance = await window.relayerSDK.createInstance(config);
    }
    
    isInitialized = true;
    
    console.log('  ✓ FHEVM instance created successfully');
    console.log('✅ FHEVM SDK v0.9 initialization complete');
    
    return fhevmInstance;
  } catch (error) {
    console.error('❌ FHEVM initialization failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      sdkLoaded: !!window.relayerSDK,
      sdkMethods: window.relayerSDK ? Object.keys(window.relayerSDK) : []
    });
    
    isInitialized = false;
    fhevmInstance = null;
    throw new Error(`FHEVM initialization failed: ${error.message}`);
  }
}

/**
 * Get current FHEVM instance
 * @throws {Error} If FHEVM not initialized
 */
export function getFhevmInstance() {
  if (!fhevmInstance || !isInitialized) {
    throw new Error('FHEVM not initialized. Call initFhevm() first.');
  }
  return fhevmInstance;
}

/**
 * Convert IPFS CID to BigInt using SHA-256 hash
 * 
 * CRITICAL FIX: CIDs (especially CIDv1 like "bafkrei...") are base32-encoded
 * and cannot be directly converted to BigInt. Instead, we:
 * 1. Hash the CID string with SHA-256 (deterministic)
 * 2. Convert the hash to BigInt
 * 3. This works for ANY CID format (v0, v1, future versions)
 * 
 * @param {string} ipfsCid - IPFS CID (any format)
 * @returns {Promise<bigint>} BigInt representation
 */
async function cidToBigInt(ipfsCid) {
  console.log(`  → Converting CID to BigInt: ${ipfsCid.substring(0, 20)}...`);
  
  // Encode CID string to bytes
  const encoder = new TextEncoder();
  const cidBytes = encoder.encode(ipfsCid);
  
  // Hash with SHA-256 (browser Web Crypto API)
  const hashBuffer = await crypto.subtle.digest('SHA-256', cidBytes);
  
  // Convert hash to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Convert to BigInt
  const bigIntValue = BigInt('0x' + hashHex);
  
  console.log(`  → SHA-256 hash: ${hashHex.substring(0, 32)}...`);
  console.log(`  → BigInt: ${bigIntValue.toString().substring(0, 20)}...`);
  
  return bigIntValue;
}

/**
 * Encrypt IPFS hash for project submission
 * 
 * FIXED VERSION: Properly handles CIDv1 (bafkrei...) and CIDv0 (Qm...)
 * by hashing the CID to a deterministic BigInt value
 * 
 * @param {string} contractAddress - Zackathon contract address
 * @param {string} userAddress - Participant's address
 * @param {string} ipfsHash - IPFS content hash to encrypt (any CID format)
 * @returns {Promise<{handles: string[], inputProof: string}>}
 */
export async function encryptIPFSHash(contractAddress, userAddress, ipfsHash) {
  try {
    console.log(`🔐 Encrypting IPFS hash: ${ipfsHash.substring(0, 20)}...`);
    console.log(`  → CID format: ${ipfsHash.startsWith('Qm') ? 'CIDv0' : ipfsHash.startsWith('baf') ? 'CIDv1' : 'Unknown'}`);
    
    const instance = getFhevmInstance();
    
    const buffer = instance.createEncryptedInput(contractAddress, userAddress);
    
    // CRITICAL FIX: Convert CID to BigInt via SHA-256 hash
    const ipfsHashBigInt = await cidToBigInt(ipfsHash);
    buffer.add256(ipfsHashBigInt);
    
    console.log('  → Encrypting and generating proof...');
    const encryptedData = await buffer.encrypt();
    
    console.log('  ✓ IPFS hash encrypted successfully');
    console.log('  → Handle:', encryptedData.handles[0]);
    console.log('  → Proof length:', encryptedData.inputProof.length);
    
    return {
      handles: encryptedData.handles,
      inputProof: encryptedData.inputProof
    };
  } catch (error) {
    console.error('❌ IPFS hash encryption failed:', error);
    throw new Error(`IPFS hash encryption failed: ${error.message}`);
  }
}

/**
 * Encrypt judge score for submission
 * 
 * @param {string} contractAddress - Zackathon contract address
 * @param {string} userAddress - Judge's address
 * @param {number} score - Score value (1-50 range for 5 categories * 10 max)
 * @returns {Promise<{handles: string[], inputProof: string}>}
 */
export async function encryptScore(contractAddress, userAddress, score) {
  try {
    console.log(`🔐 Encrypting score: ${score}`);
    
    const instance = getFhevmInstance();
    
    const buffer = instance.createEncryptedInput(contractAddress, userAddress);
    
    buffer.add16(BigInt(score));
    
    console.log('  → Encrypting and generating proof...');
    const encryptedData = await buffer.encrypt();
    
    console.log('  ✓ Score encrypted successfully');
    console.log('  → Handle:', encryptedData.handles[0]);
    console.log('  → Proof length:', encryptedData.inputProof.length);
    
    return {
      handles: encryptedData.handles,
      inputProof: encryptedData.inputProof
    };
  } catch (error) {
    console.error('❌ Score encryption failed:', error);
    throw new Error(`Score encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt submission IPFS hash (judges only, after access granted)
 * 
 * NOTE: This decrypts the SHA-256 hash of the CID, not the original CID.
 * The smart contract would need to store the original CID separately if needed,
 * or you can store a mapping off-chain.
 * 
 * @param {string} encryptedHandle - Encrypted euint256 handle from contract
 * @returns {Promise<string>} Decrypted hash value (hex string)
 */
export async function decryptIPFSHash(encryptedHandle) {
  try {
    console.log('🔓 Decrypting IPFS hash...');
    
    const instance = getFhevmInstance();
    
    const handles = [encryptedHandle];
    
    console.log('  → Calling publicDecrypt...');
    const decryptionResults = await instance.publicDecrypt(handles);
    
    const clearValue = decryptionResults.clearValues[0];
    const hashValue = '0x' + clearValue.toString(16).padStart(64, '0');
    
    console.log('  ✓ Hash decrypted successfully');
    console.log('  → Hash:', hashValue.substring(0, 20) + '...');
    console.log('  ⚠️  Note: This is the SHA-256 hash of the CID, not the original CID');
    
    return hashValue;
  } catch (error) {
    console.error('❌ Hash decryption failed:', error);
    throw new Error(`Hash decryption failed: ${error.message}`);
  }
}

/**
 * Public decryption workflow for winner scores
 * 
 * @param {string[]} handles - Array of encrypted score handles
 * @returns {Promise<{clearValues: Object, abiEncodedClearValues: string, decryptionProof: string}>}
 */
export async function decryptScores(handles) {
  try {
    console.log('🔓 Decrypting scores...');
    console.log(`  → Number of handles: ${handles.length}`);
    
    const instance = getFhevmInstance();
    
    console.log('  → Calling publicDecrypt...');
    const decryptionResults = await instance.publicDecrypt(handles);
    
    console.log('  ✓ Scores decrypted successfully');
    console.log('  → Clear values:', Object.keys(decryptionResults.clearValues).length);
    
    return decryptionResults;
  } catch (error) {
    console.error('❌ Score decryption failed:', error);
    throw new Error(`Score decryption failed: ${error.message}`);
  }
}

/**
 * Format decrypted scores for submission to contract
 * 
 * @param {Object} clearValues - Clear values from publicDecrypt
 * @param {string[]} handles - Original handles (for ordering)
 * @returns {number[]} Array of decrypted scores in correct order
 */
export function formatDecryptedScores(clearValues, handles) {
  const scoresArray = [];
  
  for (let i = 0; i < handles.length; i++) {
    const value = clearValues[i];
    if (value === undefined || value === null) {
      throw new Error(`Missing decrypted value at index ${i}`);
    }
    scoresArray.push(Number(value));
  }
  
  console.log('📊 Formatted scores:', scoresArray);
  return scoresArray;
}

/**
 * Extract handles from contract return values
 * 
 * @param {any[]} rawHandles - Raw handles from contract calls
 * @returns {string[]} Clean handle array
 */
export function extractHandles(rawHandles) {
  return rawHandles.map(h => {
    if (typeof h === 'string') return h;
    if (h && h._hex) return h._hex;
    if (h && h.hex) return h.hex;
    if (typeof h === 'bigint') return '0x' + h.toString(16);
    throw new Error(`Unsupported handle format: ${typeof h}`);
  });
}

/**
 * Validate handles before decryption
 * 
 * @param {string[]} handles - Array of handles to validate
 */
export function validateHandles(handles) {
  if (!Array.isArray(handles) || handles.length === 0) {
    throw new Error('Invalid handles array');
  }
  
  for (let i = 0; i < handles.length; i++) {
    const handle = handles[i];
    if (!handle || typeof handle !== 'string' || !handle.startsWith('0x')) {
      throw new Error(`Invalid handle at index ${i}: ${handle}`);
    }
  }
}

/**
 * Convert data to hex string
 * 
 * @param {any} data - Data to convert
 * @returns {string} Hex string with 0x prefix
 */
export function toHex(data) {
  if (!data) throw new Error("Missing data to hexify");
  if (typeof data === "string" && data.startsWith("0x")) return data;
  if (data instanceof Uint8Array) {
    return "0x" + Array.from(data, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  throw new Error("Unsupported data type for toHex(): " + typeof data);
}

/**
 * Convert hex to fixed 32-byte format
 * 
 * @param {string} hex - Hex string
 * @returns {string} 32-byte padded hex string
 */
export function toFixed32(hex) {
  if (!hex.startsWith("0x")) throw new Error("Missing 0x prefix");
  const clean = hex.slice(2);
  if (clean.length > 64) return "0x" + clean.slice(0, 64);
  return "0x" + clean.padEnd(64, "0");
}

/**
 * Check if FHEVM is initialized
 */
export function isSDKInitialized() {
  return isInitialized && fhevmInstance !== null;
}

/**
 * Reset FHEVM instance (for testing/debugging)
 */
export function resetFhevmInstance() {
  console.warn('⚠️ Resetting FHEVM instance');
  fhevmInstance = null;
  isInitialized = false;
}
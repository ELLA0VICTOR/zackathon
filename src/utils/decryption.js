/**
 * FHEVM v0.9 Public Decryption Workflow for Zackathon
 * 
 * CRITICAL v0.9 WORKFLOW:
 * 1. Contract marks ciphertext as publicly decryptable: FHE.makePubliclyDecryptable()
 * 2. Client fetches ciphertext handles from contract
 * 3. Client calls instance.publicDecrypt(handles) → returns PublicDecryptResults
 * 4. Client submits cleartext + decryptionProof back to contract
 * 5. Contract verifies with FHE.checkSignatures()
 * 
 * Docs: https://docs.zama.org/protocol/relayer-sdk-guides/fhevm-relayer/decryption/public-decryption
 */

import { getFhevmInstance } from './fhevm';

/**
 * Decrypt winner scores using FHEVM v0.9 public decryption
 * 
 * SDK returns PublicDecryptResults:
 * {
 *   clearValues: Record<handle, bigint | boolean | hex>,
 *   abiEncodedClearValues: `0x${string}`,
 *   decryptionProof: `0x${string}`
 * }
 * 
 * @param {string[]} handlesList - Array of ciphertext handles (bytes32 hex strings)
 * @returns {Promise<PublicDecryptResults>} Full decryption result with proof
 */
export async function decryptScores(handlesList) {
  try {
    console.log('🔓 Starting FHEVM v0.9 public decryption...');
    console.log(`  → Handles to decrypt: ${handlesList.length}`);
    
    if (!handlesList || handlesList.length === 0) {
      throw new Error('No handles provided for decryption');
    }
    
    validateHandles(handlesList);
    console.log('  ✓ Handle validation passed');
    
    const instance = getFhevmInstance();
    
    console.log('  → Calling instance.publicDecrypt()...');
    const results = await instance.publicDecrypt(handlesList);
    
    console.log('  ✓ Decryption successful');
    console.log('  → Results structure:', {
      hasClearValues: !!results.clearValues,
      hasAbiEncoded: !!results.abiEncodedClearValues,
      hasProof: !!results.decryptionProof,
      clearValuesCount: Object.keys(results.clearValues || {}).length,
      proofLength: results.decryptionProof?.length
    });
    
    if (results.clearValues) {
      Object.entries(results.clearValues).forEach(([handle, value]) => {
        console.log(`    Handle ${handle.slice(0, 10)}... → ${value}`);
      });
    }
    
    if (!results.clearValues || Object.keys(results.clearValues).length !== handlesList.length) {
      throw new Error(
        `Incomplete decryption: expected ${handlesList.length} values, ` +
        `got ${Object.keys(results.clearValues || {}).length}`
      );
    }
    
    if (!results.decryptionProof || results.decryptionProof === '0x') {
      throw new Error('Decryption proof missing from results');
    }
    
    return results;
  } catch (error) {
    console.error('❌ Public decryption failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      handlesList
    });
    throw new Error(`Failed to decrypt scores: ${error.message}`);
  }
}

/**
 * Decrypt single IPFS hash (for judges viewing submissions)
 * 
 * @param {string} handle - Single ciphertext handle
 * @returns {Promise<string>} Decrypted IPFS hash
 */
export async function decryptIPFSHash(handle) {
  try {
    console.log('🔓 Decrypting IPFS hash...');
    console.log(`  → Handle: ${handle}`);
    
    if (!handle) {
      throw new Error('No handle provided');
    }
    
    validateHandles([handle]);
    
    const instance = getFhevmInstance();
    
    console.log('  → Calling publicDecrypt...');
    const results = await instance.publicDecrypt([handle]);
    
    if (!results.clearValues || !results.clearValues[handle]) {
      throw new Error('Failed to decrypt IPFS hash');
    }
    
    const clearValue = results.clearValues[handle];
    const ipfsHash = typeof clearValue === 'bigint' 
      ? '0x' + clearValue.toString(16).padStart(64, '0')
      : clearValue;
    
    console.log('  ✓ IPFS hash decrypted');
    console.log(`  → Hash: ${ipfsHash.substring(0, 20)}...`);
    
    return ipfsHash;
  } catch (error) {
    console.error('❌ IPFS hash decryption failed:', error);
    throw new Error(`Failed to decrypt IPFS hash: ${error.message}`);
  }
}

/**
 * Format decrypted results for display
 * Converts PublicDecryptResults.clearValues to ordered array
 * 
 * @param {Object} clearValues - clearValues from PublicDecryptResults
 * @param {string[]} handleOrder - Array of handles in correct order
 * @returns {number[]} Array of scores as numbers
 */
export function formatDecryptedResults(clearValues, handleOrder) {
  if (!clearValues || !handleOrder) {
    throw new Error('Invalid clearValues or handle order');
  }
  
  console.log('📊 Formatting decrypted results...');
  console.log('  → Handles order:', handleOrder.length);
  console.log('  → Clear values count:', Object.keys(clearValues).length);
  
  const resultsArray = handleOrder.map((handle, index) => {
    const value = clearValues[handle];
    
    if (value === undefined) {
      console.warn(`⚠️ No value found for handle ${handle}, using 0`);
      return 0;
    }
    
    const numValue = typeof value === 'bigint' ? Number(value) : (value || 0);
    console.log(`  → Submission ${index}: ${numValue} points`);
    
    return numValue;
  });
  
  console.log('  ✓ Results formatted:', resultsArray);
  return resultsArray;
}

/**
 * Extract ciphertext handles from contract response
 * Handles various formats from ethers.js
 * 
 * @param {Array} ciphertexts - Array of ciphertext responses from contract
 * @returns {string[]} Array of handle strings (with 0x prefix)
 */
export function extractHandles(ciphertexts) {
  console.log('🔍 Extracting handles from contract data...');
  
  if (!Array.isArray(ciphertexts)) {
    throw new Error('Ciphertexts must be an array');
  }
  
  const handles = ciphertexts.map((ct, index) => {
    let handle;
    
    if (typeof ct === 'string') {
      handle = ct;
    } else if (ct && ct.data) {
      handle = ct.data;
    } else if (ct && ct._hex) {
      handle = ct._hex;
    } else if (ct && typeof ct.toString === 'function') {
      handle = ct.toString();
    } else {
      throw new Error(`Invalid ciphertext format at index ${index}: ${typeof ct}`);
    }
    
    if (!handle.startsWith('0x')) {
      handle = '0x' + handle;
    }
    
    console.log(`  → Handle ${index}: ${handle.substring(0, 20)}...`);
    return handle;
  });
  
  console.log(`  ✓ Extracted ${handles.length} handles`);
  return handles;
}

/**
 * Validate handle format
 * Handles must be 32-byte hex strings (64 hex chars + 0x prefix)
 * 
 * @param {string[]} handles - Array of handles to validate
 * @throws {Error} If any handle is invalid
 */
export function validateHandles(handles) {
  if (!Array.isArray(handles)) {
    throw new Error('Handles must be an array');
  }
  
  if (handles.length === 0) {
    throw new Error('Handles array cannot be empty');
  }
  
  for (let i = 0; i < handles.length; i++) {
    const handle = handles[i];
    
    if (!handle || typeof handle !== 'string') {
      throw new Error(`Invalid handle at index ${i}: not a string`);
    }
    
    if (!handle.startsWith('0x')) {
      throw new Error(`Invalid handle at index ${i}: missing 0x prefix`);
    }
    
    const cleanHandle = handle.slice(2);
    
    if (cleanHandle.length !== 64) {
      throw new Error(
        `Invalid handle at index ${i}: expected 64 hex chars, got ${cleanHandle.length}`
      );
    }
    
    if (!/^[0-9a-fA-F]+$/.test(cleanHandle)) {
      throw new Error(`Invalid handle at index ${i}: contains non-hex characters`);
    }
  }
  
  return true;
}

/**
 * Batch decrypt multiple submission scores
 * Useful for judges reviewing multiple submissions
 * 
 * @param {Object} contract - Contract instance
 * @param {number} hackathonId - Hackathon ID
 * @param {number[]} submissionIds - Array of submission IDs to decrypt
 * @returns {Promise<Map<number, number>>} Map of submission ID to score
 */
export async function batchDecryptScores(contract, hackathonId, submissionIds) {
  try {
    console.log('🔓 Batch decrypting scores...');
    console.log(`  → Hackathon: ${hackathonId}`);
    console.log(`  → Submissions: ${submissionIds.length}`);
    
    const handles = [];
    const idMap = new Map();
    
    for (const submissionId of submissionIds) {
      const handle = await contract.publicDecryptableScores(hackathonId, submissionId);
      handles.push(handle);
      idMap.set(handles.length - 1, submissionId);
    }
    
    const cleanHandles = extractHandles(handles);
    validateHandles(cleanHandles);
    
    const results = await decryptScores(cleanHandles);
    
    const scoreMap = new Map();
    Object.entries(results.clearValues).forEach(([handle, value], index) => {
      const submissionId = idMap.get(index);
      const score = typeof value === 'bigint' ? Number(value) : value;
      scoreMap.set(submissionId, score);
    });
    
    console.log('  ✓ Batch decryption complete');
    console.log(`  → Decrypted ${scoreMap.size} scores`);
    
    return scoreMap;
  } catch (error) {
    console.error('❌ Batch decryption failed:', error);
    throw new Error(`Batch decryption failed: ${error.message}`);
  }
}

/**
 * Check if ciphertext is marked as publicly decryptable
 * 
 * @param {Object} contract - Contract instance
 * @param {string} handle - Ciphertext handle
 * @returns {Promise<boolean>} True if publicly decryptable
 */
export async function isPubliclyDecryptable(contract, handle) {
  try {
    const bytes32Handle = handle.startsWith('0x') ? handle : '0x' + handle;
    
    const result = await contract.isPubliclyDecryptable(bytes32Handle);
    
    console.log(`  → Handle ${handle.substring(0, 20)}... is ${result ? '' : 'NOT '}publicly decryptable`);
    
    return result;
  } catch (error) {
    console.error('Failed to check if publicly decryptable:', error);
    return false;
  }
}

/**
 * Wait for ciphertext to become publicly decryptable
 * Polls the contract until the ciphertext is marked as decryptable
 * 
 * @param {Object} contract - Contract instance
 * @param {string} handle - Ciphertext handle
 * @param {number} maxAttempts - Maximum polling attempts (default: 10)
 * @param {number} delayMs - Delay between attempts in ms (default: 2000)
 * @returns {Promise<boolean>} True when decryptable
 */
export async function waitForPubliclyDecryptable(contract, handle, maxAttempts = 10, delayMs = 2000) {
  console.log('⏳ Waiting for ciphertext to become publicly decryptable...');
  
  for (let i = 0; i < maxAttempts; i++) {
    const isDecryptable = await isPubliclyDecryptable(contract, handle);
    
    if (isDecryptable) {
      console.log(`  ✓ Ciphertext is now publicly decryptable (attempt ${i + 1}/${maxAttempts})`);
      return true;
    }
    
    if (i < maxAttempts - 1) {
      console.log(`  → Not yet decryptable, waiting ${delayMs}ms... (attempt ${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw new Error('Timeout waiting for ciphertext to become publicly decryptable');
}
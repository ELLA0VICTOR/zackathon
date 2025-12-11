/**
 * Encryption utilities for Zackathon project submissions
 * Uses Storacha (formerly Web3.Storage) for IPFS storage
 * 
 * WORKFLOW:
 * 1. Collect project submission data from form
 * 2. Encrypt data locally (optional layer)
 * 3. Upload to IPFS via Storacha → get CID
 * 4. Encrypt CID with FHEVM → submit to contract
 */

import { create } from '@storacha/client';

let storachaClient = null;
let currentSpace = null;

/**
 * Initialize Storacha client
 * Uses email-based authentication (no API token needed)
 * 
 * @param {string} email - User's email for authentication
 * @returns {Promise<Object>} Initialized client with space
 */
export async function initStorachaClient(email) {
  if (storachaClient && currentSpace) {
    console.log('✓ Storacha client already initialized');
    return { client: storachaClient, space: currentSpace };
  }

  try {
    console.log('🔧 Initializing Storacha client...');
    console.log(`  → Email: ${email}`);

    storachaClient = await create();

    console.log('  → Logging in with email...');
    console.log('  ⚠️  Check your email for verification link!');
    
    const account = await storachaClient.login(email);
    console.log('  ✓ Email verified and logged in');

    console.log('  → Waiting for payment plan...');
    await account.plan.wait();
    console.log('  ✓ Payment plan confirmed');

    const spaces = storachaClient.spaces();
    
    if (spaces.length > 0) {
      currentSpace = spaces[0];
      console.log('  → Using existing space:', currentSpace.name);
    } else {
      console.log('  → Creating new space...');
      currentSpace = await storachaClient.createSpace('zackathon-submissions', { account });
      console.log('  ✓ Space created:', currentSpace.did());
    }

    await storachaClient.setCurrentSpace(currentSpace.did());

    console.log('✅ Storacha client initialized successfully');
    console.log('  → Space DID:', currentSpace.did());

    return { client: storachaClient, space: currentSpace };
  } catch (error) {
    console.error('❌ Storacha initialization failed:', error);
    
    if (error.message.includes('email')) {
      throw new Error('Email verification failed. Please check your email and try again.');
    }
    
    if (error.message.includes('payment')) {
      throw new Error('Payment plan selection required. Please complete the setup.');
    }

    throw new Error(`Storacha initialization failed: ${error.message}`);
  }
}

/**
 * Get or create Storacha client
 * @param {string} email - User's email for initialization if needed
 * @returns {Promise<Object>} Client instance
 */
async function getStorachaClient(email) {
  if (!storachaClient || !currentSpace) {
    if (!email) {
      throw new Error('Email required for first-time Storacha initialization');
    }
    await initStorachaClient(email);
  }
  return storachaClient;
}

/**
 * Prepare project submission data for IPFS
 * 
 * @param {Object} submissionData - Project submission details
 * @param {string} submissionData.projectName - Project name
 * @param {string} submissionData.description - Full description
 * @param {string} submissionData.githubRepo - GitHub repository URL
 * @param {string} submissionData.liveDemo - Live demo URL
 * @param {string} submissionData.videoDemo - Demo video URL
 * @param {string[]} submissionData.techStack - Array of technologies used
 * @param {string} submissionData.additionalNotes - Additional documentation
 * @returns {Object} Formatted submission data
 */
export function prepareSubmissionData(submissionData) {
  console.log('📦 Preparing submission data...');
  
  const {
    projectName,
    description,
    githubRepo,
    liveDemo,
    videoDemo,
    techStack,
    additionalNotes
  } = submissionData;
  
  if (!projectName || !description) {
    throw new Error('Project name and description are required');
  }
  
  const formattedData = {
    projectName: projectName.trim(),
    description: description.trim(),
    githubRepo: githubRepo?.trim() || '',
    liveDemo: liveDemo?.trim() || '',
    videoDemo: videoDemo?.trim() || '',
    techStack: Array.isArray(techStack) ? techStack : [],
    additionalNotes: additionalNotes?.trim() || '',
    timestamp: new Date().toISOString(),
    version: '1.0'
  };
  
  console.log('  ✓ Submission data prepared');
  console.log('  → Project:', formattedData.projectName);
  console.log('  → Tech stack:', formattedData.techStack.join(', '));
  
  return formattedData;
}

/**
 * Upload submission data to IPFS via Storacha
 * 
 * @param {Object} submissionData - Prepared submission data
 * @param {string} email - User's email for Storacha authentication
 * @returns {Promise<string>} IPFS content hash (CID)
 */
export async function uploadToIPFS(submissionData, email) {
  try {
    console.log('📤 Uploading to IPFS via Storacha...');
    console.log('  → Project:', submissionData.projectName);
    
    const client = await getStorachaClient(email);
    
    const jsonData = JSON.stringify(submissionData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    
    const fileName = `${submissionData.projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.json`;
    const file = new File([blob], fileName, { type: 'application/json' });
    
    console.log('  → Uploading to Storacha...');
    const cid = await client.uploadFile(file);
    
    console.log('  ✓ Upload successful!');
    console.log('  → IPFS CID:', cid.toString());
    console.log('  → Gateway URL:', `https://${cid}.ipfs.storacha.link`);
    
    return cid.toString();
  } catch (error) {
    console.error('❌ IPFS upload failed:', error);
    
    if (error.message.includes('email')) {
      throw new Error('Authentication failed. Please verify your email.');
    }
    
    if (error.message.includes('space')) {
      throw new Error('Space not initialized. Please try again.');
    }
    
    if (error.message.includes('network')) {
      throw new Error('Network error during upload. Please check your connection.');
    }
    
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
}

/**
 * Upload multiple files as directory to IPFS
 * 
 * @param {File[]} files - Array of File objects
 * @param {string} email - User's email for Storacha authentication
 * @returns {Promise<string>} IPFS directory CID
 */
export async function uploadDirectoryToIPFS(files, email) {
  try {
    console.log('📤 Uploading directory to IPFS...');
    console.log('  → Files:', files.length);
    
    const client = await getStorachaClient(email);
    
    console.log('  → Uploading to Storacha...');
    const cid = await client.uploadDirectory(files);
    
    console.log('  ✓ Directory upload successful!');
    console.log('  → IPFS CID:', cid.toString());
    console.log('  → Gateway URL:', `https://${cid}.ipfs.storacha.link`);
    
    return cid.toString();
  } catch (error) {
    console.error('❌ Directory upload failed:', error);
    throw new Error(`Directory upload failed: ${error.message}`);
  }
}

/**
 * Retrieve submission data from IPFS using public gateway
 * Note: Storacha client doesn't have a direct retrieval method, use HTTP gateway
 * 
 * @param {string} cid - IPFS content hash
 * @returns {Promise<Object>} Submission data
 */
export async function retrieveFromIPFS(cid) {
  try {
    console.log('📥 Retrieving from IPFS...');
    console.log('  → CID:', cid);
    
    const gateways = [
      `https://${cid}.ipfs.storacha.link`,
      `https://ipfs.io/ipfs/${cid}`,
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`
    ];
    
    let lastError;
    
    for (const gateway of gateways) {
      try {
        console.log(`  → Trying gateway: ${gateway.split('/')[2]}...`);
        
        const response = await fetch(gateway, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const text = await response.text();
        let data;
        
        try {
          data = JSON.parse(text);
        } catch {
          const files = text.match(/href="([^"]+\.json)"/);
          if (files && files[1]) {
            const fileUrl = `${gateway}/${files[1]}`;
            const fileResponse = await fetch(fileUrl);
            const fileText = await fileResponse.text();
            data = JSON.parse(fileText);
          } else {
            throw new Error('Could not parse IPFS response');
          }
        }
        
        console.log('  ✓ Retrieved successfully');
        console.log('  → Project:', data.projectName);
        
        return data;
      } catch (error) {
        lastError = error;
        console.warn(`  ✗ Gateway failed: ${error.message}`);
        continue;
      }
    }
    
    throw lastError || new Error('All IPFS gateways failed');
  } catch (error) {
    console.error('❌ IPFS retrieval failed:', error);
    throw new Error(`IPFS retrieval failed: ${error.message}`);
  }
}

/**
 * Convert IPFS CID to hex for FHEVM encryption
 * CIDs are base58/base32 encoded, we convert to numeric format
 * 
 * @param {string} cid - IPFS content hash
 * @returns {string} Hex representation for encryption
 */
export function cidToHex(cid) {
  console.log('🔄 Converting CID to hex...');
  console.log('  → CID:', cid);
  
  const encoder = new TextEncoder();
  const bytes = encoder.encode(cid);
  
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const paddedHex = hex.padEnd(64, '0').substring(0, 64);
  
  console.log('  ✓ Converted to hex');
  console.log('  → Hex:', '0x' + paddedHex.substring(0, 20) + '...');
  
  return paddedHex;
}

/**
 * Convert hex back to IPFS CID
 * 
 * @param {string} hex - Hex representation
 * @returns {string} IPFS CID
 */
export function hexToCid(hex) {
  console.log('🔄 Converting hex to CID...');
  
  const cleanHex = hex.replace('0x', '').replace(/0+$/, '');
  
  const bytes = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substr(i, 2), 16));
  }
  
  const decoder = new TextDecoder();
  const cid = decoder.decode(new Uint8Array(bytes));
  
  console.log('  ✓ Converted to CID');
  console.log('  → CID:', cid);
  
  return cid;
}

/**
 * Complete submission workflow: prepare → upload → return CID
 * 
 * @param {Object} submissionData - Raw submission form data
 * @param {string} email - User's email for Storacha authentication
 * @returns {Promise<{cid: string, ipfsUrl: string, data: Object}>}
 */
export async function processSubmission(submissionData, email) {
  try {
    console.log('🚀 Processing submission...');
    
    const prepared = prepareSubmissionData(submissionData);
    
    const cid = await uploadToIPFS(prepared, email);
    
    const ipfsUrl = `https://${cid}.ipfs.storacha.link`;
    
    console.log('✅ Submission processed successfully');
    console.log('  → CID:', cid);
    console.log('  → IPFS URL:', ipfsUrl);
    
    return {
      cid,
      ipfsUrl,
      data: prepared
    };
  } catch (error) {
    console.error('❌ Submission processing failed:', error);
    throw error;
  }
}

/**
 * Validate submission data before upload
 * 
 * @param {Object} data - Submission data to validate
 * @returns {Object} Validation result {valid: boolean, errors: string[]}
 */
export function validateSubmissionData(data) {
  const errors = [];
  
  if (!data.projectName || data.projectName.trim().length < 3) {
    errors.push('Project name must be at least 3 characters');
  }
  
  if (!data.description || data.description.trim().length < 50) {
    errors.push('Description must be at least 50 characters');
  }
  
  if (data.githubRepo && !isValidUrl(data.githubRepo)) {
    errors.push('Invalid GitHub repository URL');
  }
  
  if (data.liveDemo && !isValidUrl(data.liveDemo)) {
    errors.push('Invalid live demo URL');
  }
  
  if (data.videoDemo && !isValidUrl(data.videoDemo)) {
    errors.push('Invalid video demo URL');
  }
  
  if (!Array.isArray(data.techStack) || data.techStack.length === 0) {
    errors.push('At least one technology must be specified');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate URL format
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Storacha client is initialized
 * @returns {boolean} True if initialized
 */
export function isStorachaInitialized() {
  return !!(storachaClient && currentSpace);
}

/**
 * Get current space information
 * @returns {Object | null} Space info or null if not initialized
 */
export function getCurrentSpace() {
  if (!currentSpace) return null;
  
  return {
    did: currentSpace.did(),
    name: currentSpace.name
  };
}

/**
 * Reset Storacha client (for logout or testing)
 */
export function resetStorachaClient() {
  console.warn('⚠️ Resetting Storacha client');
  storachaClient = null;
  currentSpace = null;
}
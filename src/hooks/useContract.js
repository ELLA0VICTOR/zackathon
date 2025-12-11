import { useState, useEffect } from 'react';
import { getContract, parseContractError, waitForTransaction } from '../utils/contract';
import { 
  encryptIPFSHash, 
  encryptScore, 
  isSDKInitialized,
  toHex,
  toFixed32,
  decryptScores,
  extractHandles,
  validateHandles,
  formatDecryptedScores
} from '../utils/fhevm';
import { ethers } from 'ethers';

/**
 * Contract interaction hook for Zackathon
 * Provides all contract methods with encryption/decryption
 */
export function useContract(signer) {
  const [contract, setContract] = useState(null);

  useEffect(() => {
    if (signer) {
      const contractInstance = getContract(signer);
      setContract(contractInstance);
    }
  }, [signer]);

  /**
   * Create a new hackathon
   */
  const createHackathon = async (
    name,
    description,
    prizeDetails,
    submissionDeadline,
    judgingDeadline,
    maxParticipants,
    judges
  ) => {
    if (!contract) throw new Error('Contract not initialized');

    try {
      console.log('📝 Creating hackathon...', { name, judges: judges.length });

      const tx = await contract.createHackathon(
        name,
        description,
        prizeDetails,
        submissionDeadline,
        judgingDeadline,
        maxParticipants,
        judges
      );

      const receipt = await waitForTransaction(tx);

      const event = receipt.logs.find(log => {
        try {
          return contract.interface.parseLog(log)?.name === 'HackathonCreated';
        } catch {
          return false;
        }
      });

      const hackathonId = event ? contract.interface.parseLog(event).args.hackathonId : null;

      console.log('✅ Hackathon created with ID:', hackathonId?.toString());
      return { hackathonId: hackathonId?.toString(), receipt };
    } catch (error) {
      console.error('❌ Create hackathon failed:', error);
      throw new Error(parseContractError(error));
    }
  };

  /**
   * Register for a hackathon
   */
  const registerForHackathon = async (
    hackathonId,
    email,
    discord,
    twitter,
    teamName,
    teamMembers
  ) => {
    if (!contract) throw new Error('Contract not initialized');

    try {
      console.log('📝 Registering for hackathon...', { hackathonId, email });

      const tx = await contract.registerForHackathon(
        hackathonId,
        email,
        discord,
        twitter,
        teamName,
        teamMembers
      );

      const receipt = await waitForTransaction(tx);

      console.log('✅ Registration successful');
      return receipt;
    } catch (error) {
      console.error('❌ Registration failed:', error);
      throw new Error(parseContractError(error));
    }
  };

  /**
   * Submit encrypted project IPFS hash
   */
  const submitProject = async (hackathonId, ipfsHash, userAddress) => {
    if (!contract) throw new Error('Contract not initialized');
    if (!isSDKInitialized()) throw new Error('FHEVM SDK not initialized. Please refresh.');

    try {
      console.log('🗳️ Submitting project...', { hackathonId, ipfsHash: ipfsHash.substring(0, 20) + '...' });

      const contractAddress = await contract.getAddress();
      const encrypted = await encryptIPFSHash(contractAddress, userAddress, ipfsHash);

      const handleHex = toFixed32(toHex(encrypted.handles[0]));
      const proofHex = toHex(encrypted.inputProof);

      const tx = await contract.submitProject(hackathonId, handleHex, proofHex);
      const receipt = await waitForTransaction(tx);

      console.log('✅ Project submitted successfully');
      return receipt;
    } catch (error) {
      console.error('❌ Project submission failed:', error);
      throw new Error(parseContractError(error));
    }
  };

  /**
   * Grant judge access to submissions (organizer only)
   */
  const grantJudgeAccess = async (hackathonId) => {
    if (!contract) throw new Error('Contract not initialized');

    try {
      console.log('🔓 Granting judge access...', hackathonId);

      const tx = await contract.grantJudgeAccess(hackathonId);
      const receipt = await waitForTransaction(tx);

      console.log('✅ Judge access granted - submissions now decryptable');
      return receipt;
    } catch (error) {
      console.error('❌ Grant access failed:', error);
      throw new Error(parseContractError(error));
    }
  };

  /**
   * Submit encrypted judge score
   */
  const submitScore = async (hackathonId, submissionId, score, userAddress) => {
    if (!contract) throw new Error('Contract not initialized');
    if (!isSDKInitialized()) throw new Error('FHEVM SDK not initialized. Please refresh.');

    try {
      console.log('📊 Submitting score...', { hackathonId, submissionId, score });

      const contractAddress = await contract.getAddress();
      const encrypted = await encryptScore(contractAddress, userAddress, score);

      const handleHex = toFixed32(toHex(encrypted.handles[0]));
      const proofHex = toHex(encrypted.inputProof);

      const tx = await contract.submitScore(hackathonId, submissionId, handleHex, proofHex);
      const receipt = await waitForTransaction(tx);

      console.log('✅ Score submitted successfully');
      return receipt;
    } catch (error) {
      console.error('❌ Score submission failed:', error);
      throw new Error(parseContractError(error));
    }
  };

  /**
   * Calculate winners using encrypted scores (organizer only)
   */
  const calculateWinners = async (hackathonId) => {
    if (!contract) throw new Error('Contract not initialized');

    try {
      console.log('🏆 Calculating winners...', hackathonId);

      const tx = await contract.calculateWinners(hackathonId);
      const receipt = await waitForTransaction(tx);

      console.log('✅ Winners calculated - scores marked for public decryption');
      return receipt;
    } catch (error) {
      console.error('❌ Calculate winners failed:', error);
      throw new Error(parseContractError(error));
    }
  };

  /**
   * Decrypt and submit winner scores (organizer only)
   * FHEVM v0.9 public decryption workflow
   */
  const decryptAndSubmitScores = async (hackathonId, submissionCount) => {
    if (!contract) throw new Error('Contract not initialized');

    try {
      console.log('🔓 Starting FHEVM v0.9 decryption workflow...');
      console.log(`  → Hackathon ID: ${hackathonId}`);
      console.log(`  → Submissions: ${submissionCount}`);

      console.log('\n📡 Step 1: Fetching encrypted score handles...');
      const rawHandles = [];

      for (let i = 0; i < submissionCount; i++) {
        console.log(`  → Fetching encrypted total score for submission ${i}...`);
        const handle = await contract.publicDecryptableScores(hackathonId, i);
        rawHandles.push(handle);
        console.log(`    ✓ Got handle: ${handle}`);
      }

      const handles = extractHandles(rawHandles);
      console.log('  ✓ All handles fetched');

      validateHandles(handles);
      console.log('  ✓ Handles validated');

      console.log('\n🔐 Step 2: Decrypting via FHEVM SDK...');
      const decryptionResults = await decryptScores(handles);
      console.log('  ✓ Decryption successful');

      console.log('\n📊 Step 3: Formatting results...');
      const scoresArray = formatDecryptedScores(decryptionResults.clearValues, handles);
      console.log('  → Scores:', scoresArray);

      const abiEncodedResults = decryptionResults.abiEncodedClearValues;
      const proof = decryptionResults.decryptionProof;

      if (!proof || proof === '0x') {
        throw new Error('Invalid decryption proof from SDK');
      }

      console.log('\n📤 Step 4: Submitting to contract...');
      const tx = await contract.submitDecryptedScores(hackathonId, scoresArray, proof);

      console.log('  → Waiting for confirmation...');
      const receipt = await waitForTransaction(tx);

      console.log('\n✅ FHEVM v0.9 workflow complete!');
      console.log('📊 Final scores:', scoresArray);

      return { scores: scoresArray, receipt };
    } catch (error) {
      console.error('\n❌ Decryption workflow failed:', error);

      if (error.message.includes('Invalid handle')) {
        throw new Error('Invalid ciphertext handles. Ensure winners are calculated first.');
      } else if (error.message.includes('not initialized')) {
        throw new Error('FHEVM SDK not initialized. Please refresh.');
      } else if (error.message.includes('Failed to decrypt')) {
        throw new Error('Decryption failed. Ensure scores are publicly decryptable.');
      } else if (error.message.includes('checkSignatures')) {
        throw new Error('Signature verification failed. Contact support.');
      } else {
        throw new Error(`Decryption workflow failed: ${error.message}`);
      }
    }
  };

  /**
   * Get hackathon details
   */
  const getHackathonDetails = async (hackathonId) => {
    if (!contract) return null;
    try {
      return await contract.getHackathonDetails(hackathonId);
    } catch (error) {
      console.error('❌ Get hackathon details failed:', error);
      return null;
    }
  };

  /**
   * Get participant details
   */
  const getParticipant = async (hackathonId, address) => {
    if (!contract) return null;
    try {
      return await contract.getParticipant(hackathonId, address);
    } catch (error) {
      console.error('❌ Get participant failed:', error);
      return null;
    }
  };

  /**
   * Get all participants for a hackathon
   */
  const getParticipantList = async (hackathonId) => {
    if (!contract) return [];
    try {
      return await contract.getParticipantList(hackathonId);
    } catch (error) {
      console.error('❌ Get participant list failed:', error);
      return [];
    }
  };

  /**
   * Get submission count
   */
  const getSubmissionCount = async (hackathonId) => {
    if (!contract) return 0;
    try {
      const count = await contract.getSubmissionCount(hackathonId);
      return Number(count);
    } catch (error) {
      console.error('❌ Get submission count failed:', error);
      return 0;
    }
  };

  /**
   * Get submission details (public info only)
   */
  const getSubmission = async (hackathonId, submissionId) => {
    if (!contract) return null;
    try {
      return await contract.getSubmission(hackathonId, submissionId);
    } catch (error) {
      console.error('❌ Get submission failed:', error);
      return null;
    }
  };

  /**
   * Get winners for a hackathon
   */
  const getWinners = async (hackathonId) => {
    if (!contract) return [];
    try {
      return await contract.getWinners(hackathonId);
    } catch (error) {
      console.error('❌ Get winners failed:', error);
      return [];
    }
  };

  /**
   * Get decrypted score for a submission
   */
  const getDecryptedScore = async (hackathonId, submissionId) => {
    if (!contract) return { score: 0, isDecrypted: false };
    try {
      return await contract.getDecryptedScore(hackathonId, submissionId);
    } catch (error) {
      console.error('❌ Get decrypted score failed:', error);
      return { score: 0, isDecrypted: false };
    }
  };

  /**
   * Check if address is a judge
   */
  const isHackathonJudge = async (hackathonId, address) => {
    if (!contract) return false;
    try {
      return await contract.isHackathonJudge(hackathonId, address);
    } catch (error) {
      console.error('❌ Check judge failed:', error);
      return false;
    }
  };

  /**
   * Get total hackathon count
   */
  const getTotalHackathons = async () => {
    if (!contract) return 0;
    try {
      const count = await contract.getTotalHackathons();
      return Number(count);
    } catch (error) {
      console.error('❌ Get total hackathons failed:', error);
      return 0;
    }
  };

  /**
   * Get encrypted IPFS hash (judges only, after access granted)
   */
  const getSubmissionIPFSHash = async (hackathonId, submissionId) => {
    if (!contract) return null;
    try {
      return await contract.getSubmissionIPFSHash(hackathonId, submissionId);
    } catch (error) {
      console.error('❌ Get IPFS hash failed:', error);
      throw new Error(parseContractError(error));
    }
  };

  return {
    contract,
    createHackathon,
    registerForHackathon,
    submitProject,
    grantJudgeAccess,
    submitScore,
    calculateWinners,
    decryptAndSubmitScores,
    getHackathonDetails,
    getParticipant,
    getParticipantList,
    getSubmissionCount,
    getSubmission,
    getWinners,
    getDecryptedScore,
    isHackathonJudge,
    getTotalHackathons,
    getSubmissionIPFSHash,
  };
}
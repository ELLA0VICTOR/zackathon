import { useState, useEffect, useCallback } from 'react';
import { useContract } from './useContract';
import { useWalletContext } from '@/context/WalletContext';
import { retrieveFromIPFS } from '@/utils/encryption';
import { decryptIPFSHash } from '@/utils/decryption';

/**
 * Custom hook for managing hackathon submissions
 * Handles submission fetching, creation, and decryption for judges
 */
export function useSubmissions(hackathonId) {
  const { signer, account } = useWalletContext();
  const contract = useContract(signer);

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submissionCount, setSubmissionCount] = useState(0);

  /**
   * Fetch all submissions for a hackathon
   */
  const fetchSubmissions = useCallback(async () => {
    if (!contract.contract || !hackathonId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const count = await contract.getSubmissionCount(hackathonId);
      setSubmissionCount(count);

      if (count === 0) {
        setSubmissions([]);
        setLoading(false);
        return;
      }

      const submissionPromises = [];
      for (let i = 0; i < count; i++) {
        submissionPromises.push(contract.getSubmission(hackathonId, i));
      }

      const results = await Promise.all(submissionPromises);

      const formattedSubmissions = results.map((result, index) => ({
        submissionId: Number(result.id),
        participant: result.participant,
        submissionTime: Number(result.submissionTime),
        status: Number(result.status),
        judgeCount: Number(result.judgeCount),
      }));

      setSubmissions(formattedSubmissions);
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [contract, hackathonId]);

  /**
   * Fetch single submission details
   */
  const fetchSubmission = useCallback(async (submissionId) => {
    if (!contract.contract || !hackathonId || submissionId === undefined) {
      return null;
    }

    try {
      const result = await contract.getSubmission(hackathonId, submissionId);

      return {
        submissionId: Number(result.id),
        participant: result.participant,
        submissionTime: Number(result.submissionTime),
        status: Number(result.status),
        judgeCount: Number(result.judgeCount),
      };
    } catch (err) {
      console.error('Failed to fetch submission:', err);
      throw err;
    }
  }, [contract, hackathonId]);

  /**
   * Decrypt and fetch submission project data (judges only)
   */
  const fetchSubmissionData = useCallback(async (submissionId) => {
    if (!contract.contract || !hackathonId || submissionId === undefined) {
      throw new Error('Missing required parameters');
    }

    try {
      console.log('🔓 Fetching submission data...');
      console.log(`  → Hackathon: ${hackathonId}, Submission: ${submissionId}`);

      const encryptedIPFSHash = await contract.getSubmissionIPFSHash(
        hackathonId,
        submissionId
      );

      console.log('  → Got encrypted IPFS hash');

      const ipfsHash = await decryptIPFSHash(encryptedIPFSHash);

      console.log('  → Decrypted IPFS hash:', ipfsHash.substring(0, 20) + '...');

      const projectData = await retrieveFromIPFS(ipfsHash);

      console.log('  ✓ Retrieved project data from IPFS');

      return projectData;
    } catch (err) {
      console.error('Failed to fetch submission data:', err);
      
      if (err.message.includes('Only judge')) {
        throw new Error('You must be a judge to view submission details');
      }
      
      if (err.message.includes('Access not granted')) {
        throw new Error('Judge access has not been granted yet');
      }
      
      throw err;
    }
  }, [contract, hackathonId]);

  /**
   * Get user's submission for the hackathon
   */
  const getMySubmission = useCallback(() => {
    if (!account) return null;
    
    return submissions.find(
      s => s.participant.toLowerCase() === account.toLowerCase()
    );
  }, [submissions, account]);

  /**
   * Check if user has submitted
   */
  const hasSubmitted = useCallback(() => {
    return !!getMySubmission();
  }, [getMySubmission]);

  /**
   * Get submissions by status
   */
  const filterByStatus = useCallback((status) => {
    return submissions.filter(s => s.status === status);
  }, [submissions]);

  /**
   * Get pending submissions (not judged)
   */
  const getPendingSubmissions = useCallback(() => {
    return submissions.filter(s => s.status === 0);
  }, [submissions]);

  /**
   * Get judged submissions
   */
  const getJudgedSubmissions = useCallback(() => {
    return submissions.filter(s => s.status === 1);
  }, [submissions]);

  /**
   * Sort submissions by time
   */
  const sortByTime = useCallback((ascending = true) => {
    return [...submissions].sort((a, b) => {
      const diff = a.submissionTime - b.submissionTime;
      return ascending ? diff : -diff;
    });
  }, [submissions]);

  /**
   * Get submission with winner info
   */
  const getSubmissionWithWinner = useCallback(async (submissionId) => {
    if (!contract.contract || !hackathonId) return null;

    try {
      const submission = await fetchSubmission(submissionId);
      const winners = await contract.getWinners(hackathonId);

      const winner = winners.find(
        w => Number(w.submissionId) === submissionId
      );

      if (winner) {
        return {
          ...submission,
          isWinner: true,
          ranking: Number(winner.ranking),
          finalScore: Number(winner.finalScore),
        };
      }

      return {
        ...submission,
        isWinner: false,
      };
    } catch (err) {
      console.error('Failed to get submission with winner info:', err);
      return null;
    }
  }, [contract, hackathonId, fetchSubmission]);

  /**
   * Get all submissions with winner info
   */
  const getSubmissionsWithWinners = useCallback(async () => {
    if (!contract.contract || !hackathonId || submissions.length === 0) {
      return submissions;
    }

    try {
      const winners = await contract.getWinners(hackathonId);

      return submissions.map(submission => {
        const winner = winners.find(
          w => Number(w.submissionId) === submission.submissionId
        );

        if (winner) {
          return {
            ...submission,
            isWinner: true,
            ranking: Number(winner.ranking),
            finalScore: Number(winner.finalScore),
          };
        }

        return {
          ...submission,
          isWinner: false,
        };
      });
    } catch (err) {
      console.error('Failed to get submissions with winners:', err);
      return submissions;
    }
  }, [contract, hackathonId, submissions]);

  /**
   * Get decrypted score for submission
   */
  const getDecryptedScore = useCallback(async (submissionId) => {
    if (!contract.contract || !hackathonId || submissionId === undefined) {
      return { score: 0, isDecrypted: false };
    }

    try {
      const result = await contract.getDecryptedScore(hackathonId, submissionId);
      
      return {
        score: Number(result.score),
        isDecrypted: result.isDecrypted,
      };
    } catch (err) {
      console.error('Failed to get decrypted score:', err);
      return { score: 0, isDecrypted: false };
    }
  }, [contract, hackathonId]);

  /**
   * Get all decrypted scores
   */
  const getAllDecryptedScores = useCallback(async () => {
    if (!contract.contract || !hackathonId || submissions.length === 0) {
      return [];
    }

    try {
      const scorePromises = submissions.map((_, index) =>
        getDecryptedScore(index)
      );

      const scores = await Promise.all(scorePromises);

      return submissions.map((submission, index) => ({
        ...submission,
        ...scores[index],
      }));
    } catch (err) {
      console.error('Failed to get all decrypted scores:', err);
      return submissions;
    }
  }, [contract, hackathonId, submissions, getDecryptedScore]);

  /**
   * Check if user has scored a submission
   */
  const hasScored = useCallback(async (submissionId) => {
    if (!contract.contract || !account || !hackathonId || submissionId === undefined) {
      return false;
    }

    try {
      const submission = await fetchSubmission(submissionId);
      return submission.judgeCount > 0;
    } catch (err) {
      return false;
    }
  }, [contract, account, hackathonId, fetchSubmission]);

  /**
   * Get submission statistics
   */
  const getStatistics = useCallback(() => {
    return {
      total: submissions.length,
      pending: submissions.filter(s => s.status === 0).length,
      judged: submissions.filter(s => s.status === 1).length,
      averageJudgeCount: submissions.length > 0
        ? submissions.reduce((sum, s) => sum + s.judgeCount, 0) / submissions.length
        : 0,
    };
  }, [submissions]);

  /**
   * Refresh submissions
   */
  const refresh = useCallback(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (hackathonId) {
      fetchSubmissions();
    }
  }, [fetchSubmissions, hackathonId]);

  return {
    // Data
    submissions,
    submissionCount,
    loading,
    error,
    
    // Fetch methods
    fetchSubmissions,
    fetchSubmission,
    fetchSubmissionData,
    refresh,
    
    // User-specific methods
    getMySubmission,
    hasSubmitted,
    hasScored,
    
    // Filter/Sort methods
    filterByStatus,
    getPendingSubmissions,
    getJudgedSubmissions,
    sortByTime,
    
    // Winner methods
    getSubmissionWithWinner,
    getSubmissionsWithWinners,
    
    // Score methods
    getDecryptedScore,
    getAllDecryptedScores,
    
    // Statistics
    getStatistics,
  };
}

export default useSubmissions;
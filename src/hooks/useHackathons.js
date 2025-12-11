import { useState, useEffect, useCallback, useRef } from 'react';
import { useContract } from './useContract';
import { useWalletContext } from '@/context/WalletContext';

/**
 * Custom hook for managing hackathon data
 * CRITICAL FIXES:
 * 1. Added retry logic with exponential backoff
 * 2. Contract readiness checking before operations
 * 3. Better caching to prevent repeated null returns
 * 4. Persistent state across re-renders
 */
export function useHackathons() {
  const { signer, account, isConnected } = useWalletContext();
  const contract = useContract(signer);

  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  // Cache for individual hackathon fetches
  const hackathonCacheRef = useRef(new Map());
  
  /**
   * Wait for contract to be ready with timeout
   */
  const waitForContract = useCallback(async (maxRetries = 10, delayMs = 500) => {
    console.log('⏳ Waiting for contract initialization...');
    
    for (let i = 0; i < maxRetries; i++) {
      if (contract && contract.contract) {
        console.log('✓ Contract ready');
        return true;
      }
      
      console.log(`  → Retry ${i + 1}/${maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    console.error('❌ Contract initialization timeout');
    return false;
  }, [contract]);

  /**
   * Fetch all hackathons from contract
   */
  const fetchHackathons = useCallback(async () => {
    if (!isConnected || !signer) {
      setLoading(false);
      setHackathons([]);
      return;
    }

    // Wait for contract to be ready
    const isReady = await waitForContract();
    if (!isReady) {
      setError('Contract not initialized. Please refresh.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📡 Fetching hackathons from contract...');
      const total = await contract.getTotalHackathons();
      console.log('  → Total hackathons:', total);
      setTotalCount(total);

      if (total === 0) {
        console.log('  → No hackathons found');
        setHackathons([]);
        setLoading(false);
        return;
      }

      console.log('  → Fetching details for', total, 'hackathons...');
      const hackathonPromises = [];
      for (let i = 1; i <= total; i++) {
        hackathonPromises.push(contract.getHackathonDetails(i));
      }

      const results = await Promise.all(hackathonPromises);
      console.log('  → Received', results.length, 'hackathon details');

      const formattedHackathons = results.map((result) => ({
        id: Number(result.id),
        name: result.name,
        description: result.description,
        prizeDetails: result.prizeDetails,
        submissionDeadline: Number(result.submissionDeadline),
        judgingDeadline: Number(result.judgingDeadline),
        organizer: result.organizer,
        judges: result.judges,
        maxParticipants: Number(result.maxParticipants),
        status: Number(result.status),
        participantCount: Number(result.participantCount),
        submissionCount: Number(result.submissionCount),
        judgeAccessGranted: result.judgeAccessGranted,
      }));

      console.log('✅ Hackathons loaded successfully:', formattedHackathons.length);
      
      // Update cache
      formattedHackathons.forEach(h => {
        hackathonCacheRef.current.set(h.id, h);
      });
      
      setHackathons(formattedHackathons);
    } catch (err) {
      console.error('❌ Failed to fetch hackathons:', err);
      setError(err.message);
      setHackathons([]);
    } finally {
      setLoading(false);
    }
  }, [contract, isConnected, signer, waitForContract]);

  /**
   * Fetch single hackathon details with retry and caching
   * CRITICAL FIX: No longer returns null immediately if contract not ready
   */
  const fetchHackathon = useCallback(async (hackathonId, retryCount = 0) => {
    if (!hackathonId) {
      console.error('❌ fetchHackathon: No hackathonId provided');
      return null;
    }

    console.log(`🔍 Fetching hackathon ${hackathonId} (attempt ${retryCount + 1})...`);

    // Check cache first
    const cached = hackathonCacheRef.current.get(hackathonId);
    if (cached) {
      console.log('  ✓ Found in cache');
      return cached;
    }

    // Wait for contract to be ready
    if (!contract || !contract.contract) {
      if (retryCount < 5) {
        console.log(`  ⏳ Contract not ready, retrying in ${500 * (retryCount + 1)}ms...`);
        await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1)));
        return fetchHackathon(hackathonId, retryCount + 1);
      } else {
        console.error('  ❌ Contract initialization failed after retries');
        throw new Error('Contract not initialized. Please refresh the page.');
      }
    }

    try {
      console.log('  → Fetching from contract...');
      const result = await contract.getHackathonDetails(hackathonId);

      const formatted = {
        id: Number(result.id),
        name: result.name,
        description: result.description,
        prizeDetails: result.prizeDetails,
        submissionDeadline: Number(result.submissionDeadline),
        judgingDeadline: Number(result.judgingDeadline),
        organizer: result.organizer,
        judges: result.judges,
        maxParticipants: Number(result.maxParticipants),
        status: Number(result.status),
        participantCount: Number(result.participantCount),
        submissionCount: Number(result.submissionCount),
        judgeAccessGranted: result.judgeAccessGranted,
      };

      // Cache the result
      hackathonCacheRef.current.set(hackathonId, formatted);
      console.log('  ✓ Hackathon fetched and cached');

      return formatted;
    } catch (err) {
      console.error('  ❌ Failed to fetch hackathon:', err);
      
      // Retry on network errors
      if (retryCount < 3 && (err.message.includes('network') || err.message.includes('timeout'))) {
        console.log(`  🔄 Retrying due to network error...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return fetchHackathon(hackathonId, retryCount + 1);
      }
      
      throw err;
    }
  }, [contract]);

  /**
   * Fetch participants for a hackathon with retry
   */
  const fetchParticipants = useCallback(async (hackathonId, retryCount = 0) => {
    if (!hackathonId) return [];

    // Wait for contract
    if (!contract || !contract.contract) {
      if (retryCount < 5) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return fetchParticipants(hackathonId, retryCount + 1);
      }
      return [];
    }

    try {
      const participantAddresses = await contract.getParticipantList(hackathonId);

      const participantPromises = participantAddresses.map(address =>
        contract.getParticipant(hackathonId, address)
      );

      const results = await Promise.all(participantPromises);

      return results.map((result) => ({
        wallet: result.wallet,
        email: result.email,
        discord: result.discord,
        twitter: result.twitter,
        teamName: result.teamName,
        teamMembers: result.teamMembers,
        registrationTime: Number(result.registrationTime),
        hasSubmitted: result.hasSubmitted,
      }));
    } catch (err) {
      console.error('Failed to fetch participants:', err);
      return [];
    }
  }, [contract]);

  /**
   * Check if current user is organizer
   */
  const isOrganizer = useCallback((hackathon) => {
    if (!account || !hackathon) return false;
    return hackathon.organizer.toLowerCase() === account.toLowerCase();
  }, [account]);

  /**
   * Check if current user is judge
   */
  const isJudge = useCallback(async (hackathonId) => {
    if (!contract || !contract.contract || !account || !hackathonId) return false;

    try {
      return await contract.isHackathonJudge(hackathonId, account);
    } catch (err) {
      console.error('Failed to check judge status:', err);
      return false;
    }
  }, [contract, account]);

  /**
   * Check if current user has registered
   */
  const hasRegistered = useCallback(async (hackathonId) => {
    if (!contract || !contract.contract || !account || !hackathonId) return false;

    try {
      const participant = await contract.getParticipant(hackathonId, account);
      return participant.wallet !== '0x0000000000000000000000000000000000000000';
    } catch (err) {
      return false;
    }
  }, [contract, account]);

  /**
   * Filter hackathons by status
   */
  const filterByStatus = useCallback((status) => {
    return hackathons.filter(h => h.status === status);
  }, [hackathons]);

  /**
   * Get active hackathons (status 0 or 1)
   */
  const getActiveHackathons = useCallback(() => {
    return hackathons.filter(h => h.status === 0 || h.status === 1);
  }, [hackathons]);

  /**
   * Get hackathons user is organizing
   */
  const getMyOrganizedHackathons = useCallback(() => {
    if (!account) return [];
    return hackathons.filter(h => 
      h.organizer.toLowerCase() === account.toLowerCase()
    );
  }, [hackathons, account]);

  /**
   * Get hackathons user is judging
   */
  const getMyJudgingHackathons = useCallback(() => {
    if (!account) return [];
    return hackathons.filter(h => 
      h.judges.some(judge => judge.toLowerCase() === account.toLowerCase())
    );
  }, [hackathons, account]);

  /**
   * Sort hackathons by deadline
   */
  const sortByDeadline = useCallback((ascending = true) => {
    return [...hackathons].sort((a, b) => {
      const diff = a.submissionDeadline - b.submissionDeadline;
      return ascending ? diff : -diff;
    });
  }, [hackathons]);

  /**
   * Search hackathons by name
   */
  const searchHackathons = useCallback((query) => {
    if (!query) return hackathons;
    
    const lowerQuery = query.toLowerCase();
    return hackathons.filter(h => 
      h.name.toLowerCase().includes(lowerQuery) ||
      h.description.toLowerCase().includes(lowerQuery)
    );
  }, [hackathons]);

  /**
   * Get hackathon status label
   */
  const getStatusLabel = useCallback((status) => {
    const statusMap = {
      0: 'Registration Open',
      1: 'Submissions Open',
      2: 'Judging',
      3: 'Completed'
    };
    return statusMap[status] || 'Unknown';
  }, []);

  /**
   * Check if deadline has passed
   */
  const hasDeadlinePassed = useCallback((deadline) => {
    const now = Math.floor(Date.now() / 1000);
    return now >= deadline;
  }, []);

  /**
   * Refresh hackathons and clear cache
   */
  const refresh = useCallback(() => {
    hackathonCacheRef.current.clear();
    fetchHackathons();
  }, [fetchHackathons]);

  /**
   * Clear cache for specific hackathon (useful after updates)
   */
  const clearHackathonCache = useCallback((hackathonId) => {
    hackathonCacheRef.current.delete(hackathonId);
  }, []);

  // Auto-fetch when contract becomes ready
  const hasFetchedRef = useRef(false);
  const contractReadyRef = useRef(false);

  useEffect(() => {
    const isContractReady = !!(contract && contract.contract);
    
    // If contract becomes ready for the first time, fetch
    if (isContractReady && !contractReadyRef.current) {
      contractReadyRef.current = true;
      hasFetchedRef.current = true;
      console.log('✓ Contract ready, fetching hackathons...');
      fetchHackathons();
    }
    
    // If contract was ready but now isn't (disconnect), reset
    if (!isContractReady && contractReadyRef.current) {
      contractReadyRef.current = false;
      hasFetchedRef.current = false;
    }
    
    // If wallet disconnected, clear data
    if (!isConnected || !signer) {
      setLoading(false);
      setHackathons([]);
      hackathonCacheRef.current.clear();
      contractReadyRef.current = false;
      hasFetchedRef.current = false;
    }
  }, [isConnected, signer, contract?.contract, fetchHackathons]);

  return {
    // Data
    hackathons,
    totalCount,
    loading,
    error,
    
    // Fetch methods
    fetchHackathons,
    fetchHackathon,
    fetchParticipants,
    refresh,
    clearHackathonCache,
    
    // Check methods
    isOrganizer,
    isJudge,
    hasRegistered,
    hasDeadlinePassed,
    
    // Filter/Sort methods
    filterByStatus,
    getActiveHackathons,
    getMyOrganizedHackathons,
    getMyJudgingHackathons,
    sortByDeadline,
    searchHackathons,
    
    // Utility methods
    getStatusLabel,
  };
}

export default useHackathons;
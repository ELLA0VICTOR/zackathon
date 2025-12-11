import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RegistrationDialog } from '@/components/hackathon/RegistrationDialog';
import { SubmissionDialog } from '@/components/hackathon/SubmissionDialog';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { CountdownTimer } from '@/components/common/CountdownTimer';
import { useHackathons } from '@/hooks/useHackathons';
import { useSubmissions } from '@/hooks/useSubmissions';
import { useContract } from '@/hooks/useContract';
import { useWalletContext } from '@/context/WalletContext';
import {
  Trophy,
  Calendar,
  Users,
  FileText,
  Gavel,
  Lock,
  Unlock,
  Award,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatAddress, formatDate } from '@/utils/helpers';
import { cn } from '@/lib/utils';

/**
 * Hackathon Detail Page - FULLY FIXED VERSION
 * CRITICAL FIXES:
 * 1. Proper async state loading with retries
 * 2. Better error handling with user feedback
 * 3. Registration state sync after actions
 * 4. Submit button conditions simplified and debugged
 */
export function HackathonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const hackathonId = parseInt(id);

  const [selectedTab, setSelectedTab] = useState('overview');
  const [participants, setParticipants] = useState([]);
  const [isJudge, setIsJudge] = useState(false);
  const [hasRegistered, setHasRegistered] = useState(false);
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const { account, signer, isConnected } = useWalletContext();
  const contract = useContract(signer);
  const { 
    hackathons,
    fetchHackathon, 
    fetchParticipants, 
    isOrganizer, 
    getStatusLabel,
    refresh: refreshHackathons,
    clearHackathonCache
  } = useHackathons();

  const {
    submissions,
    loading: submissionsLoading,
    refresh: refreshSubmissions
  } = useSubmissions(hackathonId);

  const [hackathon, setHackathon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Main data loading function
  const loadHackathonData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      
      console.log('🔍 Loading hackathon data for ID:', hackathonId);
      console.log('  → Contract ready:', !!contract?.contract);
      console.log('  → Account:', account);
      console.log('  → Retry attempt:', retryCount);

      // STRATEGY 1: Try to get from already-loaded hackathons array (instant!)
      let data = hackathons.find(h => h.id === hackathonId);
      
      if (data) {
        console.log('✓ Found hackathon in pre-loaded list');
      } else {
        // STRATEGY 2: Fetch directly from contract with retry logic
        console.log('📡 Hackathon not in cache, fetching from contract...');
        try {
          data = await fetchHackathon(hackathonId);
        } catch (err) {
          console.error('❌ fetchHackathon error:', err);
          
          // If it's just a "contract not ready" error and we haven't retried much, retry
          if (retryCount < 3 && err.message.includes('Contract not initialized')) {
            console.log(`  🔄 Will retry in ${1000 * (retryCount + 1)}ms...`);
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, 1000 * (retryCount + 1));
            return;
          }
          
          throw err;
        }
      }
      
      if (!data) {
        console.error('❌ Hackathon not found after all strategies');
        setLoadError('Hackathon not found. It may not exist or contract is still loading.');
        toast.error('Hackathon not found', {
          description: 'This hackathon may not exist or the blockchain connection is slow.'
        });
        return;
      }

      console.log('✓ Hackathon loaded:', data.name);
      setHackathon(data);

      // Fetch participants
      console.log('👥 Fetching participants...');
      const participantList = await fetchParticipants(hackathonId);
      console.log('  ✓ Loaded', participantList.length, 'participants');
      setParticipants(participantList);

      if (account && contract?.contract) {
        // Check if user is judge
        const judgeStatus = await contract.isHackathonJudge(hackathonId, account);
        setIsJudge(judgeStatus);
        console.log('  → User is judge:', judgeStatus);

        // Check if user has registered
        const registered = participantList.some(
          p => p.wallet.toLowerCase() === account.toLowerCase()
        );
        setHasRegistered(registered);
        console.log('  → User registered:', registered);

        // DEBUG: Log submit button conditions
        console.log('\n🎯 SUBMIT BUTTON CONDITIONS:');
        console.log('  → isConnected:', isConnected);
        console.log('  → hasRegistered:', registered);
        console.log('  → status:', data.status, '(1 = Submissions Open)');
        console.log('  → deadline:', data.submissionDeadline);
        console.log('  → now:', Math.floor(Date.now() / 1000));
        console.log('  → before deadline:', Math.floor(Date.now() / 1000) < data.submissionDeadline);
        
        const willShowSubmit = isConnected && registered && data.status === 1 && 
          Math.floor(Date.now() / 1000) < data.submissionDeadline;
        console.log('  → 🚀 WILL SHOW SUBMIT BUTTON:', willShowSubmit);
      }

      // Reset retry count on success
      setRetryCount(0);
    } catch (error) {
      console.error('❌ Failed to load hackathon:', error);
      setLoadError(error.message);
      toast.error('Failed to load hackathon', {
        description: error.message,
        action: retryCount < 3 ? {
          label: 'Retry',
          onClick: () => setRetryCount(prev => prev + 1)
        } : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  // Load data when component mounts or hackathonId changes
  useEffect(() => {
    if (hackathonId && !isNaN(hackathonId)) {
      loadHackathonData();
    }
  }, [hackathonId, account, contract?.contract, retryCount]);

  // Refresh after registration
  const handleRegistrationSuccess = async () => {
    console.log('✅ Registration successful, refreshing data...');
    
    // Clear cache for this hackathon
    clearHackathonCache(hackathonId);
    
    // Wait a bit for blockchain to update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reload data
    await loadHackathonData();
    
    toast.success('Registration data refreshed!');
  };

  // Refresh after submission
  const handleSubmissionSuccess = async () => {
    console.log('✅ Submission successful, refreshing data...');
    
    clearHackathonCache(hackathonId);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await loadHackathonData();
    await refreshSubmissions();
    
    toast.success('Submission data refreshed!');
  };

  const handleGrantAccess = async () => {
    if (!contract.contract) {
      toast.error('Contract not initialized');
      return;
    }

    setIsGrantingAccess(true);
    try {
      await contract.grantJudgeAccess(hackathonId);
      toast.success('Judge access granted!', {
        description: 'Judges can now view and score submissions'
      });
      clearHackathonCache(hackathonId);
      await loadHackathonData();
      refreshSubmissions();
    } catch (error) {
      console.error('Failed to grant access:', error);
      toast.error('Failed to grant judge access', {
        description: error.message
      });
    } finally {
      setIsGrantingAccess(false);
    }
  };

  const handleCalculateWinners = async () => {
    if (!contract.contract) {
      toast.error('Contract not initialized');
      return;
    }

    setIsCalculating(true);
    try {
      await contract.calculateWinners(hackathonId);
      toast.success('Winners calculated!', {
        description: 'Scores are now marked for public decryption'
      });
      clearHackathonCache(hackathonId);
      await loadHackathonData();
    } catch (error) {
      console.error('Failed to calculate winners:', error);
      toast.error('Failed to calculate winners', {
        description: error.message
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleDecryptScores = async () => {
    if (!contract.contract) {
      toast.error('Contract not initialized');
      return;
    }

    setIsDecrypting(true);
    try {
      const result = await contract.decryptAndSubmitScores(hackathonId, submissions.length);
      toast.success('Scores decrypted and winners announced!', {
        description: `Final scores: ${result.scores.join(', ')}`
      });
      clearHackathonCache(hackathonId);
      await loadHackathonData();
      setSelectedTab('results');
    } catch (error) {
      console.error('Failed to decrypt scores:', error);
      toast.error('Failed to decrypt scores', {
        description: error.message
      });
    } finally {
      setIsDecrypting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <PageLoading message={
        retryCount > 0 
          ? `Loading hackathon... (Retry ${retryCount}/3)` 
          : "Loading hackathon details..."
      } />
    );
  }

  // Error state with retry
  if (loadError || !hackathon) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-center">
              {loadError ? 'Loading Error' : 'Hackathon Not Found'}
            </CardTitle>
            <CardDescription className="text-center">
              {loadError || "The hackathon you're looking for doesn't exist"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {retryCount < 3 && (
              <Button 
                onClick={() => setRetryCount(prev => prev + 1)} 
                className="w-full"
                variant="secondary"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Loading
              </Button>
            )}
            <Button onClick={() => navigate('/')} className="w-full" variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOrganizerUser = isOrganizer(hackathon);
  
  // CRITICAL FIX: Simplified submit button logic with clear conditions
  const canRegister = isConnected && !hasRegistered && !isJudge && (hackathon.status === 0 || hackathon.status === 1);
  
  // Submit button should show when:
  // 1. User is connected
  // 2. User is registered
  // 3. Hackathon status is 1 (Submissions Open)
  // 4. Current time is before deadline
  const canSubmit = isConnected && 
                    hasRegistered && 
                    hackathon.status === 1 && 
                    Math.floor(Date.now() / 1000) < hackathon.submissionDeadline;
  
  const canGrantAccess = isOrganizerUser && !hackathon.judgeAccessGranted && 
    Math.floor(Date.now() / 1000) >= hackathon.submissionDeadline && 
    submissions.length > 0;
  const canCalculate = isOrganizerUser && hackathon.status === 2 && 
    Math.floor(Date.now() / 1000) >= hackathon.judgingDeadline;
  const canDecrypt = isOrganizerUser && hackathon.status === 3;

  const statusConfig = {
    0: { label: 'Registration Open', color: 'bg-blue-500', variant: 'default' },
    1: { label: 'Submissions Open', color: 'bg-green-500', variant: 'secondary' },
    2: { label: 'Judging', color: 'bg-yellow-500', variant: 'outline' },
    3: { label: 'Completed', color: 'bg-gray-500', variant: 'outline' }
  };

  const status = statusConfig[hackathon.status] || statusConfig[0];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Hackathons
      </Button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{hackathon.name}</h1>
            <p className="text-muted-foreground">{hackathon.description}</p>
          </div>
          <Badge variant={status.variant} className="shrink-0">
            {status.label}
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-sm">Participants</span>
              </div>
              <p className="text-2xl font-bold">
                {hackathon.participantCount}
                {hackathon.maxParticipants > 0 && ` / ${hackathon.maxParticipants}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FileText className="h-4 w-4" />
                <span className="text-sm">Submissions</span>
              </div>
              <p className="text-2xl font-bold">{hackathon.submissionCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Gavel className="h-4 w-4" />
                <span className="text-sm">Judges</span>
              </div>
              <p className="text-2xl font-bold">{hackathon.judges.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Deadline</span>
              </div>
              <p className="text-sm font-medium">
                {formatDate(hackathon.submissionDeadline)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* DEBUG INFO (shown in development or when query param ?debug=1) */}
      {(process.env.NODE_ENV === 'development' || window.location.search.includes('debug=1')) && (
        <Card className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <div className="text-xs font-mono space-y-1">
              <div className="font-bold text-sm mb-2">🐛 DEBUG INFO:</div>
              <div>✓ isConnected: {isConnected.toString()}</div>
              <div>✓ hasRegistered: {hasRegistered.toString()}</div>
              <div>✓ status: {hackathon.status} (1 = Submissions Open)</div>
              <div>✓ deadline: {hackathon.submissionDeadline}</div>
              <div>✓ now: {Math.floor(Date.now() / 1000)}</div>
              <div>✓ beforeDeadline: {(Math.floor(Date.now() / 1000) < hackathon.submissionDeadline).toString()}</div>
              <div className="pt-2 font-bold">→ canSubmit: {canSubmit.toString()}</div>
              {canSubmit && <div className="text-green-600 dark:text-green-400">✅ Submit button SHOULD be visible!</div>}
              {!canSubmit && (
                <div className="text-red-600 dark:text-red-400">
                  ❌ Submit button hidden because: 
                  {!isConnected && ' not connected'}
                  {!hasRegistered && ' not registered'}
                  {hackathon.status !== 1 && ' status not open'}
                  {Math.floor(Date.now() / 1000) >= hackathon.submissionDeadline && ' deadline passed'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {isConnected && (
        <div className="flex flex-wrap gap-3 mb-6">
          {canRegister && (
            <RegistrationDialog
              hackathon={hackathon}
              onSuccess={handleRegistrationSuccess}
              trigger={
                <Button>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Register Now
                </Button>
              }
            />
          )}

          {canSubmit && (
            <SubmissionDialog
              hackathon={hackathon}
              onSuccess={handleSubmissionSuccess}
              trigger={
                <Button className="bg-green-600 hover:bg-green-700">
                  <FileText className="mr-2 h-4 w-4" />
                  Submit Project
                </Button>
              }
            />
          )}

          {/* Helper badge if registered but can't submit yet */}
          {isConnected && hasRegistered && !canSubmit && hackathon.status === 1 && (
            <Badge variant="secondary" className="py-2 px-4">
              <CheckCircle2 className="mr-2 h-3 w-3" />
              You're registered! {Math.floor(Date.now() / 1000) >= hackathon.submissionDeadline ? 'Submissions closed' : 'Submit button will appear'}
            </Badge>
          )}

          {canGrantAccess && (
            <Button
              onClick={handleGrantAccess}
              disabled={isGrantingAccess}
              variant="secondary"
            >
              {isGrantingAccess ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Granting Access...
                </>
              ) : (
                <>
                  <Unlock className="mr-2 h-4 w-4" />
                  Grant Judge Access
                </>
              )}
            </Button>
          )}

          {canCalculate && (
            <Button
              onClick={handleCalculateWinners}
              disabled={isCalculating}
              variant="secondary"
            >
              {isCalculating ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Trophy className="mr-2 h-4 w-4" />
                  Calculate Winners
                </>
              )}
            </Button>
          )}

          {canDecrypt && (
            <Button
              onClick={handleDecryptScores}
              disabled={isDecrypting}
            >
              {isDecrypting ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Decrypting...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Decrypt & Announce Winners
                </>
              )}
            </Button>
          )}

          {isJudge && hackathon.judgeAccessGranted && (
            <Button
              onClick={() => navigate('/judge')}
              variant="outline"
            >
              <Gavel className="mr-2 h-4 w-4" />
              Go to Judge Dashboard
            </Button>
          )}
        </div>
      )}

      {/* Countdown Timer */}
      {hackathon.status <= 1 && Math.floor(Date.now() / 1000) < hackathon.submissionDeadline && (
        <Card className="mb-6 border-primary/20">
          <CardContent className="pt-6">
            <CountdownTimer deadline={hackathon.submissionDeadline} variant="detailed" />
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="participants">
            Participants
            <Badge variant="secondary" className="ml-2">{participants.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="submissions">
            Submissions
            <Badge variant="secondary" className="ml-2">{submissions.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>About This Hackathon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-muted-foreground">{hackathon.description}</p>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Prizes
                </h4>
                <p className="text-muted-foreground whitespace-pre-line">{hackathon.prizeDetails}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Submission Deadline</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(hackathon.submissionDeadline)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Judging Deadline</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(hackathon.judgingDeadline)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organizer & Judges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Organized by</p>
                <code className="px-3 py-2 rounded bg-muted font-mono text-sm block">
                  {hackathon.organizer}
                </code>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Judges ({hackathon.judges.length})
                </p>
                <div className="space-y-2">
                  {hackathon.judges.map((judge, index) => (
                    <code key={index} className="px-3 py-2 rounded bg-muted font-mono text-sm block">
                      {judge}
                    </code>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                {hackathon.judgeAccessGranted ? (
                  <>
                    <Unlock className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Judge Access: Granted</p>
                      <p className="text-sm text-muted-foreground">
                        Judges can now view encrypted submissions
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="font-medium">Submissions: Encrypted</p>
                      <p className="text-sm text-muted-foreground">
                        All submissions remain fully encrypted on-chain
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Participants Tab */}
        <TabsContent value="participants" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Registered Participants</CardTitle>
              <CardDescription>
                {participants.length} participant{participants.length !== 1 ? 's' : ''} registered
              </CardDescription>
            </CardHeader>
            <CardContent>
              {participants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No participants yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Wallet</TableHead>
                      <TableHead>Discord</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants.map((participant, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">
                          {formatAddress(participant.wallet)}
                        </TableCell>
                        <TableCell>{participant.discord}</TableCell>
                        <TableCell>{participant.teamName || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(participant.registrationTime)}
                        </TableCell>
                        <TableCell>
                          {participant.hasSubmitted ? (
                            <Badge variant="secondary">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submissions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Submissions</CardTitle>
              <CardDescription>
                {submissions.length} submission{submissions.length !== 1 ? 's' : ''} received
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No submissions yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submission ID</TableHead>
                      <TableHead>Participant</TableHead>
                      <TableHead>Submitted At</TableHead>
                      <TableHead>Judge Count</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission.submissionId}>
                        <TableCell className="font-mono">
                          #{submission.submissionId}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatAddress(submission.participant)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(submission.submissionTime)}
                        </TableCell>
                        <TableCell>
                          {submission.judgeCount} / {hackathon.judges.length}
                        </TableCell>
                        <TableCell>
                          {submission.status === 0 ? (
                            <Badge variant="outline">Pending</Badge>
                          ) : (
                            <Badge variant="secondary">Judged</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Hackathon Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hackathon.status < 3 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium mb-2">Results Not Available Yet</p>
                  <p className="text-sm">
                    Winners will be announced after the judging deadline
                  </p>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium mb-2">Results Processing</p>
                  <p className="text-sm">
                    Organizer needs to decrypt and announce winners
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HackathonDetail;
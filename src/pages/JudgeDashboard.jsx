import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { JudgeScoreDialog } from '@/components/hackathon/JudgeScoreDialog';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { useHackathons } from '@/hooks/useHackathons';
import { useWalletContext } from '@/context/WalletContext';
import {
  Gavel,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Eye,
  Star,
} from 'lucide-react';
import { formatAddress, formatDate } from '@/utils/helpers';
import { cn } from '@/lib/utils';

/**
 * Judge Dashboard Page
 * Central hub for judges to view assigned hackathons and score submissions
 */
export function JudgeDashboard() {
  const [selectedTab, setSelectedTab] = useState('active');
  const [judgeHackathons, setJudgeHackathons] = useState([]);
  const [loading, setLoading] = useState(true);

  const { account, isConnected } = useWalletContext();
  const { 
    hackathons, 
    loading: hackathonsLoading,
    getStatusLabel,
    refresh 
  } = useHackathons();

  useEffect(() => {
    if (!hackathonsLoading && account) {
      loadJudgeHackathons();
    }
  }, [hackathonsLoading, hackathons, account]);

  const loadJudgeHackathons = async () => {
    try {
      setLoading(true);
      
      const judging = hackathons.filter(h => 
        h.judges.some(judge => judge.toLowerCase() === account.toLowerCase())
      );

      setJudgeHackathons(judging);
    } catch (error) {
      console.error('Failed to load judge hackathons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreSuccess = () => {
    refresh();
    loadJudgeHackathons();
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="text-center">Wallet Not Connected</CardTitle>
            <CardDescription className="text-center">
              Please connect your wallet to access the judge dashboard
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading || hackathonsLoading) {
    return <PageLoading message="Loading judge dashboard..." />;
  }

  const activeHackathons = judgeHackathons.filter(h => h.status === 2);
  const upcomingHackathons = judgeHackathons.filter(h => h.status < 2 && h.judgeAccessGranted === false);
  const completedHackathons = judgeHackathons.filter(h => h.status === 3);

  const statusConfig = {
    0: { label: 'Registration', variant: 'default' },
    1: { label: 'Submissions', variant: 'secondary' },
    2: { label: 'Judging', variant: 'outline' },
    3: { label: 'Completed', variant: 'outline' }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Gavel className="h-10 w-10" />
          Judge Dashboard
        </h1>
        <p className="text-muted-foreground">
          Review submissions and assign scores for hackathons you're judging
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active Judging</p>
                <p className="text-3xl font-bold">{activeHackathons.length}</p>
              </div>
              <Clock className="h-10 w-10 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Upcoming</p>
                <p className="text-3xl font-bold">{upcomingHackathons.length}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Completed</p>
                <p className="text-3xl font-bold">{completedHackathons.length}</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {judgeHackathons.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Gavel className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Judge Assignments</h3>
            <p className="text-muted-foreground mb-6">
              You haven't been assigned as a judge for any hackathons yet
            </p>
            <Button asChild>
              <Link to="/">Browse Hackathons</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="active">
              Active
              {activeHackathons.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeHackathons.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Upcoming
              {upcomingHackathons.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {upcomingHackathons.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed
              {completedHackathons.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {completedHackathons.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Active Tab */}
          <TabsContent value="active" className="mt-6">
            {activeHackathons.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active judging assignments</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {activeHackathons.map((hackathon) => (
                  <HackathonJudgeCard
                    key={hackathon.id}
                    hackathon={hackathon}
                    onScoreSuccess={handleScoreSuccess}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Upcoming Tab */}
          <TabsContent value="upcoming" className="mt-6">
            {upcomingHackathons.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming judging assignments</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {upcomingHackathons.map((hackathon) => (
                  <Card key={hackathon.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{hackathon.name}</CardTitle>
                        <Badge variant={statusConfig[hackathon.status].variant}>
                          {statusConfig[hackathon.status].label}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {hackathon.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>{hackathon.submissionCount} submissions</span>
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <p>Submission Deadline:</p>
                        <p className="font-medium text-foreground">
                          {formatDate(hackathon.submissionDeadline)}
                        </p>
                      </div>

                      <Button variant="outline" className="w-full" asChild>
                        <Link to={`/hackathon/${hackathon.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Completed Tab */}
          <TabsContent value="completed" className="mt-6">
            {completedHackathons.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No completed hackathons</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {completedHackathons.map((hackathon) => (
                  <Card key={hackathon.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{hackathon.name}</CardTitle>
                        <Badge variant="outline">Completed</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>{hackathon.submissionCount} submissions</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>Judged</span>
                        </div>
                      </div>

                      <Button variant="outline" className="w-full" asChild>
                        <Link to={`/hackathon/${hackathon.id}`}>
                          View Results
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/**
 * Hackathon Judge Card Component
 * Shows submissions for a hackathon with scoring interface
 */
function HackathonJudgeCard({ hackathon, onScoreSuccess }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const { useSubmissions } = require('@/hooks/useSubmissions');
  const submissionsHook = useSubmissions(hackathon.id);

  useEffect(() => {
    if (!submissionsHook.loading) {
      setSubmissions(submissionsHook.submissions);
      setLoading(false);
    }
  }, [submissionsHook.loading, submissionsHook.submissions]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{hackathon.name}</CardTitle>
            <CardDescription className="mt-1">
              {hackathon.description}
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0">
            Judging Phase
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
            <p className="text-sm">Loading submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No submissions to review</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {submissions.length} submission{submissions.length !== 1 ? 's' : ''} to review
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/hackathon/${hackathon.id}`}>
                  View Hackathon
                </Link>
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Judge Progress</TableHead>
                  <TableHead>Action</TableHead>
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
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {submission.judgeCount} / {hackathon.judges.length}
                        </span>
                        {submission.judgeCount === hackathon.judges.length && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <JudgeScoreDialog
                        hackathonId={hackathon.id}
                        submission={submission}
                        onSuccess={onScoreSuccess}
                        trigger={
                          <Button variant="outline" size="sm">
                            <Star className="mr-2 h-4 w-4" />
                            Review
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default JudgeDashboard;
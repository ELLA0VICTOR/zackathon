import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { useHackathons } from '@/hooks/useHackathons';
import { useContract } from '@/hooks/useContract';
import { useWalletContext } from '@/context/WalletContext';
import {
  Trophy,
  Search,
  Award,
  Medal,
  Github,
  Globe,
  Video,
  Eye,
  Star,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { formatAddress, formatDate } from '@/utils/helpers';
import { cn } from '@/lib/utils';

/**
 * Results Page
 * Display completed hackathons with winners and project details
 */
export function Results() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [hackathonWinners, setHackathonWinners] = useState({});
  const [loadingWinners, setLoadingWinners] = useState({});

  const { signer } = useWalletContext();
  const contract = useContract(signer);
  const { hackathons, loading } = useHackathons();

  const completedHackathons = hackathons.filter(h => h.status === 3);

  useEffect(() => {
    if (contract.contract && completedHackathons.length > 0) {
      loadAllWinners();
    }
  }, [contract.contract, completedHackathons.length]);

  const loadAllWinners = async () => {
    for (const hackathon of completedHackathons) {
      if (!hackathonWinners[hackathon.id] && !loadingWinners[hackathon.id]) {
        loadWinners(hackathon.id);
      }
    }
  };

  const loadWinners = async (hackathonId) => {
    setLoadingWinners(prev => ({ ...prev, [hackathonId]: true }));

    try {
      const winners = await contract.getWinners(hackathonId);
      
      setHackathonWinners(prev => ({
        ...prev,
        [hackathonId]: winners
      }));
    } catch (error) {
      console.error(`Failed to load winners for hackathon ${hackathonId}:`, error);
    } finally {
      setLoadingWinners(prev => ({ ...prev, [hackathonId]: false }));
    }
  };

  if (loading) {
    return <PageLoading message="Loading results..." />;
  }

  const filteredHackathons = completedHackathons.filter(h =>
    searchQuery ? (
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) : true
  );

  const rankIcons = {
    1: { icon: Trophy, color: 'text-yellow-500', label: '1st Place' },
    2: { icon: Award, color: 'text-gray-400', label: '2nd Place' },
    3: { icon: Medal, color: 'text-amber-700', label: '3rd Place' }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Trophy className="h-10 w-10 text-yellow-500" />
          Hackathon Results
        </h1>
        <p className="text-muted-foreground">
          Browse completed hackathons and view winning projects
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Hackathons</p>
                <p className="text-3xl font-bold">{completedHackathons.length}</p>
              </div>
              <Calendar className="h-10 w-10 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Winners</p>
                <p className="text-3xl font-bold">
                  {Object.values(hackathonWinners).reduce((sum, winners) => sum + winners.length, 0)}
                </p>
              </div>
              <Star className="h-10 w-10 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Submissions</p>
                <p className="text-3xl font-bold">
                  {completedHackathons.reduce((sum, h) => sum + h.submissionCount, 0)}
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search hackathons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Results List */}
      {filteredHackathons.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? 'No Results Found' : 'No Completed Hackathons'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery 
                ? 'Try adjusting your search query'
                : 'Completed hackathons will appear here'}
            </p>
            {searchQuery && (
              <Button onClick={() => setSearchQuery('')} variant="outline">
                Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {filteredHackathons.map((hackathon) => (
            <Card key={hackathon.id} className="overflow-hidden">
              <CardHeader className="bg-muted/30">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl mb-2">{hackathon.name}</CardTitle>
                    <CardDescription>{hackathon.description}</CardDescription>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    Completed
                  </Badge>
                </div>

                <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Ended {formatDate(hackathon.judgingDeadline)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>{hackathon.submissionCount} submissions</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                {loadingWinners[hackathon.id] ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Star className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                    <p className="text-sm">Loading winners...</p>
                  </div>
                ) : !hackathonWinners[hackathon.id] || hackathonWinners[hackathon.id].length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Winners not announced yet</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Winners Podium */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {hackathonWinners[hackathon.id]
                        .sort((a, b) => a.ranking - b.ranking)
                        .map((winner) => {
                          const rankInfo = rankIcons[winner.ranking];
                          const Icon = rankInfo?.icon || Trophy;

                          return (
                            <Card
                              key={winner.ranking}
                              className={cn(
                                'border-2',
                                winner.ranking === 1 && 'border-yellow-500/50 bg-yellow-500/5',
                                winner.ranking === 2 && 'border-gray-400/50 bg-gray-400/5',
                                winner.ranking === 3 && 'border-amber-700/50 bg-amber-700/5'
                              )}
                            >
                              <CardContent className="pt-6 text-center">
                                <Icon className={cn('h-12 w-12 mx-auto mb-3', rankInfo?.color)} />
                                <Badge variant="secondary" className="mb-3">
                                  {rankInfo?.label}
                                </Badge>
                                <p className="font-mono text-sm mb-2">
                                  {formatAddress(winner.participant)}
                                </p>
                                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                  <Star className="h-4 w-4" />
                                  <span>{winner.finalScore} points</span>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>

                    {/* Prize Details */}
                    <Card className="bg-muted/30">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Award className="h-5 w-5" />
                          Prize Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-line">{hackathon.prizeDetails}</p>
                      </CardContent>
                    </Card>

                    {/* View Hackathon Button */}
                    <div className="flex justify-center pt-2">
                      <Button variant="outline" asChild>
                        <Link to={`/hackathon/${hackathon.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Full Hackathon Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default Results;
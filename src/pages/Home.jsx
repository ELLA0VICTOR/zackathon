import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { HackathonCard, HackathonCardSkeleton } from '@/components/hackathon/HackathonCard';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { useHackathons } from '@/hooks/useHackathons';
import { useWalletContext } from '@/context/WalletContext';
import { 
  Trophy, 
  Plus, 
  Search, 
  Filter,
  Shield,
  Lock,
  Zap,
  TrendingUp
} from 'lucide-react';

/**
 * Home Page
 * Main landing page with hackathon listing and hero section
 */
export function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');

  const { 
    hackathons, 
    loading, 
    error,
    getActiveHackathons,
    getMyOrganizedHackathons,
    getMyJudgingHackathons,
    refresh 
  } = useHackathons();

  const { isConnected } = useWalletContext();

  const getFilteredHackathons = () => {
    let filtered = hackathons;

    if (selectedTab === 'active') {
      filtered = getActiveHackathons();
    } else if (selectedTab === 'organized') {
      filtered = getMyOrganizedHackathons();
    } else if (selectedTab === 'judging') {
      filtered = getMyJudgingHackathons();
    }

    if (searchQuery) {
      filtered = filtered.filter(h => 
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredHackathons = getFilteredHackathons();

  if (loading && hackathons.length === 0) {
    return <PageLoading message="Loading hackathons..." />;
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-background" />
        
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Encrypted Hackathon Submissions.{' '}
              <span className="text-primary">Fair Judging.</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The first decentralized hackathon platform where submissions remain fully encrypted until judging begins. Zero compromise on privacy.
            </p>

            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <Button size="lg" asChild>
                <Link to="/create">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Hackathon
                </Link>
              </Button>
              
              <Button size="lg" variant="outline" asChild>
                <Link to="#hackathons">
                  <Trophy className="mr-2 h-5 w-5" />
                  Browse Hackathons
                </Link>
              </Button>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
            <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
              <Shield className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Encrypted Submissions</h3>
              <p className="text-sm text-muted-foreground">
                All projects encrypted on-chain. No one can see submissions until judging starts.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
              <Lock className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Fair Judging</h3>
              <p className="text-sm text-muted-foreground">
                Judges receive access only after deadline. Scores remain encrypted until reveal.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
              <Zap className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Trustless Winners</h3>
              <p className="text-sm text-muted-foreground">
                Winner calculation on encrypted scores. Provably fair and tamper-proof.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* Hackathons Section */}
      <section id="hackathons" className="py-16 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Hackathons</h2>
              <p className="text-muted-foreground">
                Discover and participate in encrypted hackathons
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search hackathons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-4">
              <TabsTrigger value="all">
                All
                {hackathons.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {hackathons.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="active">
                Active
                {getActiveHackathons().length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {getActiveHackathons().length}
                  </Badge>
                )}
              </TabsTrigger>
              {isConnected && (
                <>
                  <TabsTrigger value="organized">
                    My Events
                  </TabsTrigger>
                  <TabsTrigger value="judging">
                    Judging
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              {filteredHackathons.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No hackathons found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery 
                      ? 'Try adjusting your search query'
                      : 'Be the first to create a hackathon!'}
                  </p>
                  {!searchQuery && (
                    <Button asChild>
                      <Link to="/create">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Hackathon
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredHackathons.map((hackathon) => (
                    <HackathonCard
                      key={hackathon.id}
                      hackathon={hackathon}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="active" className="space-y-6">
              {filteredHackathons.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No active hackathons</h3>
                  <p className="text-muted-foreground">
                    Check back later for new events
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredHackathons.map((hackathon) => (
                    <HackathonCard
                      key={hackathon.id}
                      hackathon={hackathon}
                      variant="featured"
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {isConnected && (
              <>
                <TabsContent value="organized" className="space-y-6">
                  {filteredHackathons.length === 0 ? (
                    <div className="text-center py-12">
                      <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No organized hackathons</h3>
                      <p className="text-muted-foreground mb-4">
                        Create your first hackathon to get started
                      </p>
                      <Button asChild>
                        <Link to="/create">
                          <Plus className="mr-2 h-4 w-4" />
                          Create Hackathon
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredHackathons.map((hackathon) => (
                        <HackathonCard
                          key={hackathon.id}
                          hackathon={hackathon}
                          showActions={false}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="judging" className="space-y-6">
                  {filteredHackathons.length === 0 ? (
                    <div className="text-center py-12">
                      <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No judging assignments</h3>
                      <p className="text-muted-foreground">
                        You haven't been assigned as a judge yet
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredHackathons.map((hackathon) => (
                        <HackathonCard
                          key={hackathon.id}
                          hackathon={hackathon}
                          showActions={false}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </section>
    </div>
  );
}

export default Home;
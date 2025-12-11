import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RegistrationDialog } from '@/components/hackathon/RegistrationDialog';
import { CountdownTimer, DeadlineBadge } from '@/components/common/CountdownTimer';
import { 
  Calendar, 
  Users, 
  Trophy, 
  FileText,
  Clock,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatAddress, formatDate } from '@/utils/helpers';

/**
 * Hackathon Card Component
 * Displays hackathon information in a card format
 * 
 * @param {Object} props
 * @param {Object} props.hackathon - Hackathon data
 * @param {boolean} props.showActions - Show action buttons
 * @param {boolean} props.isRegistered - User registration status
 * @param {string} props.variant - Card variant: 'default', 'compact', 'featured'
 */
export function HackathonCard({ 
  hackathon, 
  showActions = true,
  isRegistered = false,
  variant = 'default',
  className 
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  const statusConfig = {
    0: { label: 'Registration Open', color: 'bg-blue-500', badgeVariant: 'default' },
    1: { label: 'Submissions Open', color: 'bg-green-500', badgeVariant: 'secondary' },
    2: { label: 'Judging', color: 'bg-yellow-500', badgeVariant: 'outline' },
    3: { label: 'Completed', color: 'bg-gray-500', badgeVariant: 'outline' }
  };

  const status = statusConfig[hackathon.status] || statusConfig[0];
  const isActive = hackathon.status === 0 || hackathon.status === 1;
  const hasDeadlinePassed = Math.floor(Date.now() / 1000) >= hackathon.submissionDeadline;

  const handleRegistrationSuccess = () => {
    setRefreshKey(prev => prev + 1); // Force re-render
  };

  if (variant === 'compact') {
    return (
      <Card className={cn(
        'hover:border-primary/50 transition-all duration-200',
        className
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-1">{hackathon.name}</CardTitle>
            <Badge variant={status.badgeVariant} className="shrink-0">
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{hackathon.participantCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>{hackathon.submissionCount}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link to={`/hackathon/${hackathon.id}`}>View Details</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (variant === 'featured') {
    return (
      <Card className={cn(
        'hover:border-primary/50 hover:shadow-xl transition-all duration-300 border-primary/20',
        className
      )}>
        <CardHeader>
          <div className="flex items-start justify-between gap-2 mb-2">
            <Trophy className="h-8 w-8 text-primary" />
            <DeadlineBadge deadline={hackathon.submissionDeadline} />
          </div>
          <CardTitle className="text-2xl">{hackathon.name}</CardTitle>
          <CardDescription className="text-base">
            {hackathon.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className={cn('h-2 w-2 rounded-full', status.color)} />
            <span className="font-medium">{status.label}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Participants</span>
              </div>
              <p className="text-lg font-semibold">
                {hackathon.participantCount}
                {hackathon.maxParticipants > 0 && ` / ${hackathon.maxParticipants}`}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Submissions</span>
              </div>
              <p className="text-lg font-semibold">{hackathon.submissionCount}</p>
            </div>
          </div>

          {!hasDeadlinePassed && (
            <CountdownTimer 
              deadline={hackathon.submissionDeadline}
              variant="detailed"
            />
          )}

          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Award className="h-4 w-4 text-primary" />
              <span className="font-medium line-clamp-1">{hackathon.prizeDetails}</span>
            </div>
          </div>
        </CardContent>

        {showActions && (
          <CardFooter className="gap-2">
            {isActive && !isRegistered && (
              <RegistrationDialog
                key={refreshKey}
                hackathon={hackathon}
                onSuccess={handleRegistrationSuccess}
                trigger={
                  <Button className="flex-1">
                    Register Now
                  </Button>
                }
              />
            )}
            <Button variant="outline" className="flex-1" asChild>
              <Link to={`/hackathon/${hackathon.id}`}>View Details</Link>
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }

  return (
    <Card className={cn(
      'hover:border-primary/50 transition-all duration-200',
      className
    )}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle>{hackathon.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {hackathon.description}
            </CardDescription>
          </div>
          <Badge variant={status.badgeVariant}>
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <div>
              <p className="text-xs">Deadline</p>
              <p className="font-medium text-foreground">
                {formatDate(hackathon.submissionDeadline)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <div>
              <p className="text-xs">Participants</p>
              <p className="font-medium text-foreground">
                {hackathon.participantCount}
                {hackathon.maxParticipants > 0 && ` / ${hackathon.maxParticipants}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <div>
              <p className="text-xs">Submissions</p>
              <p className="font-medium text-foreground">
                {hackathon.submissionCount}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Trophy className="h-4 w-4" />
            <div>
              <p className="text-xs">Judges</p>
              <p className="font-medium text-foreground">
                {hackathon.judges.length}
              </p>
            </div>
          </div>
        </div>

        {!hasDeadlinePassed && isActive && (
          <div className="pt-2 border-t">
            <CountdownTimer 
              deadline={hackathon.submissionDeadline}
              variant="compact"
            />
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Organized by</span>
          <code className="px-2 py-1 rounded bg-muted font-mono">
            {formatAddress(hackathon.organizer)}
          </code>
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="gap-2">
          {isActive && !isRegistered && (
            <RegistrationDialog
              key={refreshKey}
              hackathon={hackathon}
              onSuccess={handleRegistrationSuccess}
              trigger={
                <Button className="flex-1">
                  Register
                </Button>
              }
            />
          )}
          {isRegistered && (
            <Badge variant="secondary" className="flex-1 justify-center py-2">
              Registered
            </Badge>
          )}
          <Button variant="outline" className="flex-1" asChild>
            <Link to={`/hackathon/${hackathon.id}`}>
              View Details
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

/**
 * Hackathon Card Skeleton
 * Loading state for hackathon cards
 */
export function HackathonCardSkeleton({ variant = 'default' }) {
  if (variant === 'compact') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="space-y-3 pb-3">
          <div className="flex gap-4">
            <div className="h-4 w-16 bg-muted animate-pulse rounded" />
            <div className="h-4 w-16 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
        <CardFooter>
          <div className="h-9 w-full bg-muted animate-pulse rounded" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="space-y-2">
          <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
          <div className="h-4 w-full bg-muted animate-pulse rounded" />
          <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="h-12 bg-muted animate-pulse rounded" />
          <div className="h-12 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <div className="h-10 flex-1 bg-muted animate-pulse rounded" />
        <div className="h-10 flex-1 bg-muted animate-pulse rounded" />
      </CardFooter>
    </Card>
  );
}

export default HackathonCard;
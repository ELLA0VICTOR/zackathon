import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

/**
 * Countdown Timer Component
 * Displays time remaining until a deadline with live updates
 * 
 * @param {Object} props
 * @param {number} props.deadline - Unix timestamp (seconds)
 * @param {string} props.variant - Display variant: 'default', 'compact', 'detailed'
 * @param {Function} props.onComplete - Callback when countdown reaches zero
 * @param {string} props.className - Additional classes
 */
export function CountdownTimer({ 
  deadline, 
  variant = 'default',
  onComplete,
  className 
}) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(deadline));
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!deadline) return;

    const timer = setInterval(() => {
      const time = calculateTimeLeft(deadline);
      setTimeLeft(time);

      if (time.total <= 0 && !isExpired) {
        setIsExpired(true);
        if (onComplete) onComplete();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline, isExpired, onComplete]);

  if (!deadline) {
    return <span className="text-muted-foreground">No deadline set</span>;
  }

  if (isExpired || timeLeft.total <= 0) {
    return (
      <Badge variant="destructive" className={className}>
        Expired
      </Badge>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className={getUrgencyColor(timeLeft.total)}>
          {formatCompact(timeLeft)}
        </span>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Time Remaining</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <TimeUnit value={timeLeft.days} label="Days" />
          <TimeUnit value={timeLeft.hours} label="Hours" />
          <TimeUnit value={timeLeft.minutes} label="Minutes" />
          <TimeUnit value={timeLeft.seconds} label="Seconds" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Clock className="h-5 w-5 text-muted-foreground" />
      <div className="flex gap-2">
        {timeLeft.days > 0 && (
          <TimeBox value={timeLeft.days} label="d" />
        )}
        <TimeBox value={timeLeft.hours} label="h" />
        <TimeBox value={timeLeft.minutes} label="m" />
        <TimeBox value={timeLeft.seconds} label="s" />
      </div>
    </div>
  );
}

/**
 * Time Unit Component (for detailed variant)
 */
function TimeUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center p-2 rounded-md bg-muted">
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

/**
 * Time Box Component (for default variant)
 */
function TimeBox({ value, label }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-lg font-semibold tabular-nums">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

/**
 * Calculate time left until deadline
 */
function calculateTimeLeft(deadline) {
  const now = Math.floor(Date.now() / 1000);
  const deadlineTimestamp = typeof deadline === 'bigint' ? Number(deadline) : deadline;
  const total = deadlineTimestamp - now;

  if (total <= 0) {
    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = Math.floor(total % 60);

  return { total, days, hours, minutes, seconds };
}

/**
 * Format time for compact display
 */
function formatCompact(timeLeft) {
  if (timeLeft.days > 0) {
    return `${timeLeft.days}d ${timeLeft.hours}h`;
  }
  if (timeLeft.hours > 0) {
    return `${timeLeft.hours}h ${timeLeft.minutes}m`;
  }
  if (timeLeft.minutes > 0) {
    return `${timeLeft.minutes}m ${timeLeft.seconds}s`;
  }
  return `${timeLeft.seconds}s`;
}

/**
 * Get text color based on urgency
 */
function getUrgencyColor(totalSeconds) {
  if (totalSeconds < 3600) {
    return 'text-destructive font-semibold';
  }
  if (totalSeconds < 86400) {
    return 'text-yellow-500 font-medium';
  }
  return 'text-foreground';
}

/**
 * Deadline Badge Component
 * Simple badge showing deadline status
 */
export function DeadlineBadge({ deadline, className }) {
  const now = Math.floor(Date.now() / 1000);
  const deadlineTimestamp = typeof deadline === 'bigint' ? Number(deadline) : deadline;
  const diff = deadlineTimestamp - now;

  if (diff <= 0) {
    return <Badge variant="destructive" className={className}>Ended</Badge>;
  }

  if (diff < 3600) {
    return <Badge variant="destructive" className={className}>Ending Soon</Badge>;
  }

  if (diff < 86400) {
    return <Badge variant="outline" className={cn('border-yellow-500 text-yellow-500', className)}>
      Ending Today
    </Badge>;
  }

  return <Badge variant="secondary" className={className}>Active</Badge>;
}

export default CountdownTimer;
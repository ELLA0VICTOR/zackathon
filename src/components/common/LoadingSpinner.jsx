import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Loading Spinner Component
 * Displays animated loading spinner with optional text
 * 
 * @param {Object} props
 * @param {string} props.size - Size variant: 'sm', 'md', 'lg', 'xl'
 * @param {string} props.text - Optional loading text
 * @param {boolean} props.fullScreen - Center in full screen
 * @param {string} props.className - Additional classes
 */
export function LoadingSpinner({ 
  size = 'md', 
  text = '', 
  fullScreen = false,
  className 
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const spinner = (
    <div className={cn(
      'flex flex-col items-center justify-center gap-3',
      className
    )}>
      <Loader2 className={cn(
        'animate-spin text-primary',
        sizeClasses[size]
      )} />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}

/**
 * Inline Loading Spinner
 * Smaller spinner for inline use (buttons, text, etc.)
 */
export function InlineSpinner({ className }) {
  return (
    <Loader2 className={cn('h-4 w-4 animate-spin', className)} />
  );
}

/**
 * Loading Card Skeleton
 * Displays skeleton loader for card content
 */
export function LoadingCard() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="space-y-2">
        <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
        <div className="h-4 w-full bg-muted animate-pulse rounded" />
        <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
      </div>
      <div className="flex gap-2">
        <div className="h-10 flex-1 bg-muted animate-pulse rounded" />
        <div className="h-10 flex-1 bg-muted animate-pulse rounded" />
      </div>
    </div>
  );
}

/**
 * Loading Table Skeleton
 * Displays skeleton loader for table content
 */
export function LoadingTable({ rows = 5, columns = 4 }) {
  return (
    <div className="rounded-md border">
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: columns }).map((_, j) => (
              <div 
                key={j} 
                className="h-8 flex-1 bg-muted animate-pulse rounded"
                style={{ animationDelay: `${(i * columns + j) * 50}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Page Loading Component
 * Full page loading state with branding
 */
export function PageLoading({ message = 'Loading...' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background">
      <div className="relative">
        <div className="h-20 w-20 rounded-full border-4 border-primary/20" />
        <div className="absolute inset-0 h-20 w-20 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Zackathon</h2>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export default LoadingSpinner;
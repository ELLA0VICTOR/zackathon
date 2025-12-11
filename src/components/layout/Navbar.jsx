import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWalletContext } from '@/context/WalletContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Menu, 
  X, 
  Wallet, 
  Trophy, 
  Plus, 
  LayoutDashboard,
  Gavel,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatAddress } from '@/utils/helpers';

/**
 * Navbar Component
 * Main navigation bar with wallet connection and routing
 */
export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { 
    account, 
    isConnected, 
    isCorrectNetwork,
    connectWallet, 
    disconnectWallet,
    isConnecting 
  } = useWalletContext();

  const navLinks = [
    { path: '/', label: 'Home', icon: LayoutDashboard },
    { path: '/create', label: 'Create', icon: Plus },
    { path: '/judge', label: 'Judge', icon: Gavel },
    { path: '/results', label: 'Results', icon: Trophy },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            
            <span className="text-xl font-bold">Zackathon</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-6">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    'flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary',
                    isActive(link.path) 
                      ? 'text-primary' 
                      : 'text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Wallet Connection */}
          <div className="hidden md:flex md:items-center md:gap-4">
            {isConnected ? (
              <>
                {!isCorrectNetwork && (
                  <Badge variant="destructive">Wrong Network</Badge>
                )}
                <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="font-medium">{formatAddress(account)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={disconnectWallet}
                  title="Disconnect Wallet"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button 
                onClick={connectWallet}
                disabled={isConnecting}
              >
                <Wallet className="mr-2 h-4 w-4" />
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-4">
            <Separator />
            
            {/* Mobile Navigation Links */}
            <div className="space-y-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive(link.path)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <Separator />

            {/* Mobile Wallet Connection */}
            {isConnected ? (
              <div className="space-y-2">
                {!isCorrectNetwork && (
                  <Badge variant="destructive" className="w-full justify-center">
                    Wrong Network - Switch to Sepolia
                  </Badge>
                )}
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">
                      {formatAddress(account)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={disconnectWallet}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                onClick={connectWallet}
                disabled={isConnecting}
                className="w-full"
              >
                <Wallet className="mr-2 h-4 w-4" />
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
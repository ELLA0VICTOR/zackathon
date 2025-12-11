import React, { createContext, useContext } from 'react';
import { useWallet } from '../hooks/useWallet';

const WalletContext = createContext(null);

/**
 * Wallet Context Provider
 * Wraps the app with wallet state management
 */
export function WalletProvider({ children }) {
  const wallet = useWallet();
  
  return (
    <WalletContext.Provider value={wallet}>
      {children}
    </WalletContext.Provider>
  );
}

/**
 * Hook to access wallet context
 * Must be used within WalletProvider
 */
export function useWalletContext() {
  const context = useContext(WalletContext);
  
  if (!context) {
    throw new Error('useWalletContext must be used within WalletProvider');
  }
  
  return context;
}
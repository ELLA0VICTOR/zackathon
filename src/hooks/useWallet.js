import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

/**
 * Wallet connection hook with Sepolia network support
 * Manages MetaMask connection state and network switching
 */
export function useWallet() {
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Connect wallet and request account access
   */
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      const errorMsg = 'MetaMask not detected. Please install MetaMask browser extension.';
      setError(errorMsg);
      alert(errorMsg);
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      console.log('🔌 Connecting wallet...');
      
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      console.log('  ✓ Account connected:', accounts[0]);
      
      const signerInstance = await browserProvider.getSigner();
      const network = await browserProvider.getNetwork();
      
      setAccount(accounts[0]);
      setSigner(signerInstance);
      setProvider(browserProvider);
      setChainId(Number(network.chainId));

      console.log('✅ Wallet connected successfully');
      console.log('  → Address:', accounts[0]);
      console.log('  → Network:', network.name);
      console.log('  → Chain ID:', Number(network.chainId));

      if (Number(network.chainId) !== 11155111) {
        console.warn('⚠️ Not on Sepolia testnet');
        const shouldSwitch = confirm('Please switch to Sepolia testnet to continue.');
        if (shouldSwitch) {
          await switchToSepolia();
        }
      }
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      const errorMsg = error.message || 'Failed to connect wallet';
      setError(errorMsg);
      
      if (error.code === 4001) {
        alert('Connection request rejected. Please approve the connection to continue.');
      } else {
        alert(`Failed to connect wallet: ${errorMsg}`);
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  /**
   * Disconnect wallet
   */
  const disconnectWallet = useCallback(() => {
    console.log('🔌 Disconnecting wallet...');
    setAccount(null);
    setSigner(null);
    setProvider(null);
    setChainId(null);
    setError(null);
    console.log('✓ Wallet disconnected');
  }, []);

  /**
   * Switch to Sepolia testnet
   */
  const switchToSepolia = useCallback(async () => {
    if (!window.ethereum) {
      alert('MetaMask not detected');
      return;
    }

    try {
      console.log('🔄 Switching to Sepolia testnet...');
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }],
      });
      
      console.log('✓ Switched to Sepolia');
    } catch (error) {
      console.error('❌ Failed to switch network:', error);
      
      if (error.code === 4902) {
        try {
          console.log('  → Adding Sepolia network...');
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0xaa36a7',
                chainName: 'Sepolia Testnet',
                nativeCurrency: {
                  name: 'Sepolia ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
          console.log('✓ Sepolia network added');
        } catch (addError) {
          console.error('❌ Failed to add Sepolia network:', addError);
          alert('Failed to add Sepolia network. Please add it manually in MetaMask.');
        }
      } else {
        alert('Failed to switch network. Please switch to Sepolia manually.');
      }
    }
  }, []);

  /**
   * Get current balance
   */
  const getBalance = useCallback(async () => {
    if (!provider || !account) {
      return '0';
    }

    try {
      const balance = await provider.getBalance(account);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('❌ Failed to get balance:', error);
      return '0';
    }
  }, [provider, account]);

  /**
   * Auto-connect on mount if previously connected
   */
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
          if (accounts.length > 0) {
            console.log('🔄 Auto-connecting wallet...');
            connectWallet();
          }
        })
        .catch(error => {
          console.error('❌ Auto-connect failed:', error);
        });
    }
  }, [connectWallet]);

  /**
   * Listen for account changes
   */
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      console.log('🔄 Account changed');
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        connectWallet();
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, [connectWallet, disconnectWallet]);

  /**
   * Listen for network changes
   */
  useEffect(() => {
    if (!window.ethereum) return;

    const handleChainChanged = (newChainId) => {
      console.log('🔄 Network changed:', newChainId);
      window.location.reload();
    };

    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  return {
    account,
    signer,
    provider,
    chainId,
    error,
    connectWallet,
    disconnectWallet,
    switchToSepolia,
    getBalance,
    isConnecting,
    isConnected: !!account,
    isCorrectNetwork: chainId === 11155111,
  };
}
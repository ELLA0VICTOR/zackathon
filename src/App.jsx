import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { WalletProvider } from './context/WalletContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Home } from './pages/Home';
import { CreateHackathon } from './pages/CreateHackathon';
import { HackathonDetail } from './pages/HackathonDetail';
import { JudgeDashboard } from './pages/JudgeDashboard';
import { Results } from './pages/Results';
import { initFhevm } from './utils/fhevm';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { Shield, AlertCircle } from 'lucide-react';

/**
 * Main App Component with FHEVM Initialization
 * 
 * CRITICAL WORKFLOW:
 * 1. App mounts → Begin FHEVM initialization
 * 2. Show loading screen while SDK initializes
 * 3. Once ready → Render full application with routing
 * 4. All child components can safely use encryption/decryption
 * 
 * This prevents race conditions where components try to encrypt
 * before FHEVM SDK is ready.
 */
function App() {
  const [fhevmReady, setFhevmReady] = useState(false);
  const [initError, setInitError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const initializingRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (initializingRef.current) {
      return;
    }
    initializingRef.current = true;

    const initialize = async () => {
      try {
        console.log('🚀 Initializing Zackathon with FHEVM v0.9...');
        
        // Initialize FHEVM SDK (loads WASM, creates instance)
        await initFhevm();
        
        setFhevmReady(true);
        setInitError(null);
        
        console.log('✅ Zackathon ready - FHEVM SDK initialized successfully');
      } catch (error) {
        console.error('❌ FHEVM initialization failed:', error);
        
        // Handle transient WASM errors with automatic retry
        if (error.message && error.message.includes('WASM')) {
          console.log('⚠️ Transient WASM error detected, retrying...');
          
          if (retryCount < 3) {
            const delay = 1000 * (retryCount + 1); // 1s, 2s, 3s
            console.log(`  → Retry ${retryCount + 1}/3 in ${delay}ms...`);
            
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              initializingRef.current = false;
              initialize();
            }, delay);
            return;
          }
        }
        
        // If retries exhausted or non-WASM error, show error state
        setInitError(error.message || 'Unknown initialization error');
        setFhevmReady(false);
      }
    };

    initialize();
  }, [retryCount]);

  // Show loading screen while FHEVM initializes
  // This prevents child components from trying to use FHEVM before it's ready
  if (!fhevmReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background px-4">
        <div className="text-center space-y-4">
          {/* Logo/Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <Shield className="h-20 w-20 text-primary animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <LoadingSpinner size="lg" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold mb-2">Initializing Zackathon</h1>
            <p className="text-muted-foreground">
              Loading FHEVM SDK for encrypted hackathon submissions
            </p>
          </div>

          {/* Progress Indicator */}
          {!initError && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="flex gap-1">
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-75" />
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-150" />
              </div>
              <span>Please wait...</span>
            </div>
          )}

          {/* Error State */}
          {initError && (
            <div className="mt-6 p-6 bg-destructive/10 border border-destructive rounded-lg max-w-md mx-auto">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1 text-left">
                  <p className="text-destructive font-semibold mb-2">
                    Initialization Failed
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {initError}
                  </p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                  >
                    Retry Initialization
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Technical Details */}
          <div className="mt-8 text-xs text-muted-foreground space-y-1">
            <p>Using FHEVM v0.9 with Relayer SDK v0.3.0-5</p>
            <p>Zama's Fully Homomorphic Encryption</p>
          </div>
        </div>
      </div>
    );
  }

  // Once FHEVM is ready, render the full application
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <WalletProvider>
          <div className="flex flex-col min-h-screen">
            {/* Navigation */}
            <Navbar />
            
            {/* Main Content */}
            <main className="flex-1">
              <Routes>
                {/* Home Page */}
                <Route path="/" element={<Home />} />
                
                {/* Create Hackathon */}
                <Route path="/create" element={<CreateHackathon />} />
                
                {/* Hackathon Detail */}
                <Route path="/hackathon/:id" element={<HackathonDetail />} />
                
                {/* Judge Dashboard */}
                <Route path="/judge" element={<JudgeDashboard />} />
                
                {/* Results Page */}
                <Route path="/results" element={<Results />} />
                
                {/* 404 - Redirect to Home */}
                <Route path="*" element={<Home />} />
              </Routes>
            </main>
            
            {/* Footer */}
            <Footer />
          </div>
          
          {/* Toast Notifications */}
          <Toaster 
            position="top-right" 
            expand={false}
            richColors
            closeButton
          />
        </WalletProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
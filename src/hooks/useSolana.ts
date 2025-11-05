import { useMemo, useCallback, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PublicKey, Transaction, SendOptions, Connection } from '@solana/web3.js';
import type { SolanaCluster } from '../provider/SolanaWalletProvider';

/**
 * useSolana Hook
 * 
 * Custom hook wrapping @solana/wallet-adapter-react hooks to provide
 * a clean, consistent API for Solana wallet interactions.
 * 
 * This mirrors the useMetaMask API pattern from useEVM.ts for consistency
 * across EVM and Solana wallet integrations.
 * 
 * Features:
 * - Wallet connection state management
 * - Public key access
 * - Transaction signing and sending
 * - Wallet modal control
 * - Network/cluster information
 * 
 * Usage:
 * ```tsx
 * const { 
 *   publicKey, 
 *   connected, 
 *   connecting,
 *   wallet,
 *   connect, 
 *   disconnect,
 *   signTransaction,
 *   sendTransaction,
 *   connection 
 * } = useSolana();
 * 
 * // Connect wallet
 * await connect();
 * 
 * // Get user's public key
 * if (publicKey) {
 *   console.log('Address:', publicKey.toBase58());
 * }
 * ```
 * 
 * @returns Solana wallet connection state and methods
 */
export function useSolana() {
  // Core wallet adapter hooks
  const {
    publicKey,
    connected,
    connecting,
    disconnecting,
    wallet,
    wallets,
    select,
    connect: adapterConnect,
    disconnect: adapterDisconnect,
    signTransaction: adapterSignTransaction,
    signAllTransactions: adapterSignAllTransactions,
    signMessage: adapterSignMessage,
    sendTransaction: adapterSendTransaction,
  } = useWallet();

  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  /**
   * Create a wallet-aware connection that uses the wallet's RPC endpoint
   * This ensures we use the wallet's provider (e.g., Backpack's mainnet RPC)
   * instead of the default public endpoint which has rate limits
   */
  const walletConnection = useMemo(() => {
    // Try to get RPC from wallet adapter's provider
    let walletRpc: string | null = null;
    
    // Try Backpack-specific detection
    if (wallet?.adapter.name === 'Backpack' && typeof window !== 'undefined') {
      const backpack = (window as any).backpack;
      walletRpc = backpack?.connection?.rpcEndpoint || backpack?._rpcEndpoint;
    }
    
    // Try standard window.solana (Phantom, etc.)
    if (!walletRpc && typeof window !== 'undefined' && (window as any).solana) {
      const solana = (window as any).solana;
      walletRpc = solana.connection?.rpcEndpoint || solana._rpcEndpoint;
    }
    
    // Try wallet adapter provider
    if (!walletRpc && wallet && (wallet.adapter as any)?.provider) {
      const provider = (wallet.adapter as any).provider;
      walletRpc = provider.connection?.rpcEndpoint || provider._rpcEndpoint;
    }
    
    // If we found a wallet-specific RPC, create a new connection with it
    if (walletRpc && walletRpc !== connection.rpcEndpoint) {
      console.log(`[useSolana] Creating wallet-aware connection with RPC: ${walletRpc}`);
      return new Connection(walletRpc, 'confirmed');
    }
    
    // Fall back to the provider's connection
    return connection;
  }, [wallet, connection]);

  /**
   * Connect to wallet
   * Opens wallet selection modal if no wallet is selected
   */
  const connect = useCallback(async () => {
    if (!wallet) {
      // No wallet selected, show modal
      setVisible(true);
      return;
    }

    try {
      await adapterConnect();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }, [wallet, adapterConnect, setVisible]);

  /**
   * Disconnect from wallet
   */
  const disconnect = useCallback(async () => {
    try {
      await adapterDisconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw error;
    }
  }, [adapterDisconnect]);

  /**
   * Sign a transaction
   * @param transaction - Transaction to sign
   * @returns Signed transaction
   */
  const signTransaction = useCallback(
    async (transaction: Transaction) => {
      if (!adapterSignTransaction) {
        throw new Error('Wallet does not support transaction signing');
      }
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      try {
        return await adapterSignTransaction(transaction);
      } catch (error) {
        console.error('Failed to sign transaction:', error);
        throw error;
      }
    },
    [adapterSignTransaction, publicKey]
  );

  /**
   * Sign multiple transactions
   * @param transactions - Array of transactions to sign
   * @returns Array of signed transactions
   */
  const signAllTransactions = useCallback(
    async (transactions: Transaction[]) => {
      if (!adapterSignAllTransactions) {
        throw new Error('Wallet does not support batch transaction signing');
      }
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      try {
        return await adapterSignAllTransactions(transactions);
      } catch (error) {
        console.error('Failed to sign transactions:', error);
        throw error;
      }
    },
    [adapterSignAllTransactions, publicKey]
  );

  /**
   * Sign a message
   * @param message - Message bytes to sign
   * @returns Signature bytes
   */
  const signMessage = useCallback(
    async (message: Uint8Array) => {
      if (!adapterSignMessage) {
        throw new Error('Wallet does not support message signing');
      }
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      try {
        return await adapterSignMessage(message);
      } catch (error) {
        console.error('Failed to sign message:', error);
        throw error;
      }
    },
    [adapterSignMessage, publicKey]
  );

  /**
   * Send a transaction
   * @param transaction - Transaction to send
   * @param options - Send options (commitment level, etc.)
   * @returns Transaction signature
   */
  const sendTransaction = useCallback(
    async (transaction: Transaction, options?: SendOptions) => {
      if (!adapterSendTransaction) {
        throw new Error('Wallet does not support transaction sending');
      }
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      try {
        const signature = await adapterSendTransaction(transaction, walletConnection, options);
        return signature;
      } catch (error) {
        console.error('Failed to send transaction:', error);
        throw error;
      }
    },
    [adapterSendTransaction, walletConnection, publicKey]
  );

  /**
   * Try to get the actual RPC endpoint from the wallet's provider
   * Some wallets (like Backpack) use their own connection internally
   */
  const actualRpcEndpoint = useMemo(() => {
    // Use the wallet connection's endpoint if available
    return walletConnection.rpcEndpoint;
  }, [walletConnection.rpcEndpoint]);

  /**
   * Get cluster name from connection endpoint
   * Enhanced to detect well-known mainnet RPC providers
   * Defaults to mainnet for safety unless explicitly devnet/testnet/localhost
   */
  const cluster = useMemo((): SolanaCluster => {
    const endpoint = actualRpcEndpoint;
    
    // Explicit devnet detection (must have 'devnet' in URL)
    if (endpoint.includes('devnet')) {
      return 'devnet';
    }
    
    // Explicit testnet detection (must have 'testnet' in URL)
    if (endpoint.includes('testnet')) {
      return 'testnet';
    }
    
    // Localhost/local validators - assume devnet for development
    if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1') || endpoint.includes('0.0.0.0')) {
      console.log('[useSolana] Detected localhost RPC - assuming devnet cluster');
      return 'devnet';
    }
    
    // Explicit mainnet detection
    if (endpoint.includes('mainnet-beta') || endpoint.includes('mainnet')) {
      return 'mainnet-beta';
    }
    
    // Well-known mainnet RPC providers (these are production by default)
    const mainnetProviders = [
      'xnftdata.com',      // Backpack's mainnet RPC
      'helius-rpc.com',    // Helius
      'rpcpool.com',       // RPCPool
      'quicknode.pro',     // QuickNode
      'genesysgo.net',     // GenesysGo
      'triton.one',        // Triton
      'hellomoon.io',      // HelloMoon
      'syndica.io',        // Syndica
      'blockdaemon.com',   // Blockdaemon
      'alchemy.com',       // Alchemy
    ];
    
    // Check if endpoint contains any known mainnet provider
    if (mainnetProviders.some(provider => endpoint.includes(provider))) {
      return 'mainnet-beta';
    }
    
    // Unknown custom RPC - DEFAULT TO MAINNET for safety
    // This is the safest assumption for production wallets
    console.log('[useSolana] Unknown RPC endpoint detected:', endpoint, '- defaulting to mainnet-beta for safety');
    return 'mainnet-beta';
  }, [actualRpcEndpoint]);

  /**
   * Debug effect to log wallet provider properties
   * This helps diagnose RPC endpoint detection issues
   */
  useEffect(() => {
    if (connected && wallet) {
      console.log('[useSolana] Debug - Wallet connected:', {
        walletName: wallet.adapter.name,
        hasWindowBackpack: typeof (window as any).backpack !== 'undefined',
        hasWindowSolana: typeof (window as any).solana !== 'undefined',
        adapterProvider: wallet.adapter ? Object.keys((wallet.adapter as any).provider || {}) : [],
        detectedRpcEndpoint: actualRpcEndpoint,
        connectionProviderEndpoint: connection.rpcEndpoint,
      });
      
      // Log window.backpack if available
      if ((window as any).backpack) {
        console.log('[useSolana] window.backpack properties:', Object.keys((window as any).backpack));
      }
      
      // Log window.solana if available
      if ((window as any).solana) {
        console.log('[useSolana] window.solana properties:', Object.keys((window as any).solana));
      }
    }
  }, [connected, wallet, actualRpcEndpoint, connection.rpcEndpoint]);

  /**
   * Get wallet address as base58 string
   */
  const address = useMemo(() => {
    return publicKey?.toBase58() ?? null;
  }, [publicKey]);

  /**
   * Check if wallet is detected (any wallet available)
   */
  const isDetected = useMemo(() => {
    return wallets.length > 0;
  }, [wallets]);

  return {
    // Wallet state
    publicKey,
    address,
    connected,
    connecting,
    disconnecting,
    wallet,
    wallets,
    isDetected,

    // Connection - use wallet-aware connection that respects wallet's RPC
    connection: walletConnection,
    cluster,
    actualRpcEndpoint, // Expose the actual RPC endpoint from wallet

    // Actions
    connect,
    disconnect,
    select,
    openWalletModal: () => setVisible(true),
    closeWalletModal: () => setVisible(false),

    // Signing
    signTransaction,
    signAllTransactions,
    signMessage,

    // Sending
    sendTransaction,
  };
}

/**
 * Helper function to validate Solana public key
 * @param address - Address string to validate
 * @returns true if valid Solana public key
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper function to shorten Solana address for display
 * @param address - Full address string or PublicKey
 * @param chars - Number of characters to show on each end (default: 4)
 * @returns Shortened address (e.g., "7WkR...F4z")
 */
export function shortenAddress(address: string | PublicKey, chars: number = 4): string {
  const addressStr = typeof address === 'string' ? address : address.toBase58();
  if (addressStr.length <= chars * 2) return addressStr;
  return `${addressStr.slice(0, chars)}...${addressStr.slice(-chars)}`;
}

/**
 * Helper function to get explorer URL for transaction
 * @param signature - Transaction signature
 * @param cluster - Solana cluster
 * @returns Solscan explorer URL
 */
export function getExplorerUrl(
  signature: string,
  cluster: SolanaCluster = 'mainnet-beta'
): string {
  const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
  return `https://solscan.io/tx/${signature}${clusterParam}`;
}

/**
 * Helper function to get explorer URL for account
 * @param address - Account address
 * @param cluster - Solana cluster
 * @returns Solscan explorer URL
 */
export function getAccountExplorerUrl(
  address: string | PublicKey,
  cluster: SolanaCluster = 'mainnet-beta'
): string {
  const addressStr = typeof address === 'string' ? address : address.toBase58();
  const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
  return `https://solscan.io/account/${addressStr}${clusterParam}`;
}

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useEthersProvider } from './useEVM';
import '../types/global.d.ts';

// L2 rollup chains for gas calculations
export const L2_CHAINS = {
  OPTIMISM: 10,
  BASE: 8453,
  ARBITRUM: 42161,
  POLYGON: 137,
} as const;

export type L2Chain = typeof L2_CHAINS[keyof typeof L2_CHAINS];

// Hook for advanced gas and fee calculations including L2 rollups
export function useAdvancedGasFees(chainId: number) {
  const { provider } = useEthersProvider();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isL2Chain = useCallback((chainId: number): boolean => {
    return Object.values(L2_CHAINS).includes(chainId as L2Chain);
  }, []);

  const estimateL1DataFee = useCallback(async (
    transaction: ethers.TransactionRequest
  ): Promise<bigint> => {
    if (!provider || !isL2Chain(chainId)) return BigInt(0);

    try {
      // For Optimism/Base L2 rollups, estimate L1 data fee
      const serializedTx = ethers.Transaction.from(transaction).serialized;
      const l1DataBytes = ethers.getBytes(serializedTx).length;
      
      // Approximate L1 data fee calculation (simplified)
      // In production, use the specific L2's fee calculation contract
      const baseL1Fee = await provider.getFeeData();
      const l1DataFee = BigInt(l1DataBytes) * (baseL1Fee.gasPrice || BigInt(0)) / BigInt(16);
      
      return l1DataFee;
    } catch (error) {
      console.warn('Failed to estimate L1 data fee:', error);
      return BigInt(0);
    }
  }, [provider, chainId, isL2Chain]);

  const estimateCompleteFee = useCallback(async (
    transaction: ethers.TransactionRequest
  ): Promise<{
    gasLimit: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
    l1DataFee: bigint;
    totalEstimate: bigint;
  }> => {
    if (!provider) {
      throw new Error('Provider not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get base fee data
      const feeData = await provider.getFeeData();
      
      // Estimate gas limit
      const gasLimit = await provider.estimateGas(transaction);
      
      // Calculate fees
      const maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice || BigInt(0);
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || BigInt(0);
      
      // L2 specific calculations
      const l1DataFee = await estimateL1DataFee(transaction);
      
      // Calculate total
      const l2Fee = BigInt(gasLimit) * BigInt(maxFeePerGas);
      const totalEstimate = l2Fee + l1DataFee;

      return {
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
        l1DataFee,
        totalEstimate,
      };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [provider, estimateL1DataFee]);

  const formatFeeEstimate = useCallback((wei: bigint, decimals = 4): string => {
    return parseFloat(ethers.formatEther(wei)).toFixed(decimals);
  }, []);

  return {
    isLoading,
    error,
    isL2Chain: isL2Chain(chainId),
    estimateCompleteFee,
    estimateL1DataFee,
    formatFeeEstimate,
  };
}

// Hook for managing EVM network switching and configuration
export function useNetworkManager() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supportedNetworks = {
    1: {
      chainId: 1,
      name: 'Ethereum Mainnet',
      rpc: 'https://eth.llamarpc.com',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      blockExplorerUrls: ['https://etherscan.io'],
    },
    137: {
      chainId: 137,
      name: 'Polygon',
      rpc: 'https://polygon-rpc.com',
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      blockExplorerUrls: ['https://polygonscan.com'],
    },
    56: {
      chainId: 56,
      name: 'BSC',
      rpc: 'https://bsc-dataseed.binance.org',
      nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
      blockExplorerUrls: ['https://bscscan.com'],
    },
    10: {
      chainId: 10,
      name: 'Optimism',
      rpc: 'https://mainnet.optimism.io',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      blockExplorerUrls: ['https://optimistic.etherscan.io'],
    },
    8453: {
      chainId: 8453,
      name: 'Base',
      rpc: 'https://mainnet.base.org',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      blockExplorerUrls: ['https://basescan.org'],
    },
    42161: {
      chainId: 42161,
      name: 'Arbitrum One',
      rpc: 'https://arb1.arbitrum.io/rpc',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      blockExplorerUrls: ['https://arbiscan.io'],
    },
    31337: {
      chainId: 31337,
      name: 'Hardhat Local',
      rpc: 'http://localhost:8545',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      blockExplorerUrls: ['http://localhost:8545'],
    },
  };

  const addNetwork = useCallback(async (chainId: number) => {
    if (!window.ethereum) {
      throw new Error('MetaMask not available');
    }

    const network = supportedNetworks[chainId as keyof typeof supportedNetworks];
    if (!network) {
      throw new Error(`Unsupported network: ${chainId}`);
    }

    setIsLoading(true);
    setError(null);

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0x' + network.chainId.toString(16),
            chainName: network.name,
            rpcUrls: [network.rpc],
            nativeCurrency: network.nativeCurrency,
            blockExplorerUrls: network.blockExplorerUrls,
          },
        ],
      });
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchNetwork = useCallback(async (chainId: number) => {
    if (!window.ethereum) {
      throw new Error('MetaMask not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x' + chainId.toString(16) }],
      });
    } catch (err: any) {
      // If chain is not added, try to add it
      if (err.code === 4902) {
        await addNetwork(chainId);
      } else {
        setError(err.message);
        throw err;
      }
    } finally {
      setIsLoading(false);
    }
  }, [addNetwork]);

  return {
    isLoading,
    error,
    supportedNetworks,
    addNetwork,
    switchNetwork,
  };
}

// Hook for handling funding operations and balance monitoring
export function useFundingManager() {
  const { provider } = useEthersProvider();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getFundingRequirement = useCallback(async (
    targetAddress: string,
    estimatedGasCost: bigint,
    bufferPercentage = 20
  ): Promise<{
    currentBalance: bigint;
    requiredAmount: bigint;
    needsFunding: boolean;
    fundingAmount: bigint;
  }> => {
    if (!provider) {
      throw new Error('Provider not available');
    }

    setIsLoading(true);
    setError(null);

    try {
      const currentBalance = await provider.getBalance(targetAddress);
      const buffer = (estimatedGasCost * BigInt(bufferPercentage)) / BigInt(100);
      const requiredAmount = estimatedGasCost + buffer;
      const needsFunding = currentBalance < requiredAmount;
      const fundingAmount = needsFunding ? requiredAmount - currentBalance : BigInt(0);

      return {
        currentBalance,
        requiredAmount,
        needsFunding,
        fundingAmount,
      };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [provider]);

  const monitorBalance = useCallback(async (
    address: string,
    minThreshold: bigint,
    onLowBalance?: (balance: bigint) => void
  ): Promise<bigint> => {
    if (!provider) {
      throw new Error('Provider not available');
    }

    try {
      const balance = await provider.getBalance(address);
      
      if (balance < minThreshold && onLowBalance) {
        onLowBalance(balance);
      }

      return balance;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [provider]);

  const formatBalance = useCallback((balance: bigint, decimals = 4): string => {
    return parseFloat(ethers.formatEther(balance)).toFixed(decimals);
  }, []);

  return {
    isLoading,
    error,
    getFundingRequirement,
    monitorBalance,
    formatBalance,
  };
}

// Hook for batch operations and transaction management
export function useBatchOperations() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingTxs, setPendingTxs] = useState<Map<string, {
    hash: string;
    status: 'pending' | 'confirmed' | 'failed';
    timestamp: number;
  }>>(new Map());

  const executeBatch = useCallback(async (
    operations: Array<() => Promise<string>>,
    batchSize = 3,
    delayMs = 1000
  ): Promise<string[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const results: string[] = [];
      
      // Process in batches to avoid overwhelming the network
      for (let i = 0; i < operations.length; i += batchSize) {
        const batch = operations.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(operation => operation())
        );
        
        results.push(...batchResults);
        
        // Add delay between batches
        if (i + batchSize < operations.length) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      return results;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const trackTransaction = useCallback((hash: string) => {
    setPendingTxs(prev => new Map(prev.set(hash, {
      hash,
      status: 'pending',
      timestamp: Date.now(),
    })));
  }, []);

  const updateTransactionStatus = useCallback((
    hash: string, 
    status: 'confirmed' | 'failed'
  ) => {
    setPendingTxs(prev => {
      const tx = prev.get(hash);
      if (tx) {
        return new Map(prev.set(hash, { ...tx, status }));
      }
      return prev;
    });
  }, []);

  const clearOldTransactions = useCallback((maxAgeMs = 24 * 60 * 60 * 1000) => {
    const now = Date.now();
    setPendingTxs(prev => {
      const filtered = new Map();
      for (const [hash, tx] of prev.entries()) {
        if (now - tx.timestamp < maxAgeMs) {
          filtered.set(hash, tx);
        }
      }
      return filtered;
    });
  }, []);

  return {
    isLoading,
    error,
    pendingTxs,
    executeBatch,
    trackTransaction,
    updateTransactionStatus,
    clearOldTransactions,
  };
}

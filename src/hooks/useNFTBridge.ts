import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useERC721Contract } from './useEVM';
import { useAdvancedGasFees, useFundingManager } from './useAdvancedEVM';
import '../types/global.d.ts';

// Types for NFT metadata
export interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface NFTDetails {
  tokenId: string;
  contractAddress: string;
  owner: string;
  tokenURI: string;
  metadata?: NFTMetadata;
  approved?: string;
  isApproved: boolean;
}

// Chain configuration for bridging
export interface BridgeConfig {
  sourceChain: {
    chainId: number;
    name: string;
    contractAddress: string;
  };
  targetChain: {
    chainId: number;
    name: string;
    bridgeAddress: string;
  };
}

// Hook for NFT-specific operations needed for bridging
export function useNFTBridge(config: BridgeConfig) {
  const sourceContract = useERC721Contract(
    config.sourceChain.contractAddress,
    { 
      chainId: config.sourceChain.chainId, 
      name: config.sourceChain.name,
      rpc: '', // Will be populated by network config
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      blockExplorerUrls: ['']
    },
    true // Require signer for transfers
  );
  
  const { estimateCompleteFee } = useAdvancedGasFees(config.sourceChain.chainId);
  const { getFundingRequirement } = useFundingManager();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch complete NFT details including metadata
  const getNFTDetails = useCallback(async (tokenId: string): Promise<NFTDetails> => {
    setIsLoading(true);
    setError(null);

    try {
      const [owner, tokenURI, approved] = await Promise.all([
        sourceContract.getOwner(tokenId),
        sourceContract.getTokenURI(tokenId),
        sourceContract.getApproved(tokenId),
      ]);

      let metadata: NFTMetadata | undefined;
      
      // Fetch metadata if tokenURI is available
      if (tokenURI) {
        try {
          const response = await fetch(tokenURI);
          if (response.ok) {
            metadata = await response.json();
          }
        } catch (metadataError) {
          console.warn('Failed to fetch NFT metadata:', metadataError);
        }
      }

      const isApproved = approved.toLowerCase() === config.targetChain.bridgeAddress.toLowerCase();

      return {
        tokenId,
        contractAddress: config.sourceChain.contractAddress,
        owner,
        tokenURI,
        metadata,
        approved,
        isApproved,
      };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [sourceContract, config]);

  // Check if NFT can be bridged
  const checkBridgeEligibility = useCallback(async (tokenId: string, userAddress: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const nftDetails = await getNFTDetails(tokenId);
      
      const checks = {
        isOwner: nftDetails.owner.toLowerCase() === userAddress.toLowerCase(),
        isApproved: nftDetails.isApproved,
        hasMetadata: !!nftDetails.metadata,
        canBridge: false,
      };

      checks.canBridge = checks.isOwner && checks.isApproved;

      return {
        ...checks,
        nftDetails,
        issues: [
          !checks.isOwner && 'You are not the owner of this NFT',
          !checks.isApproved && `NFT is not approved for bridge contract ${config.targetChain.bridgeAddress}`,
          !checks.hasMetadata && 'NFT metadata could not be fetched',
        ].filter(Boolean),
      };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getNFTDetails, config]);

  // Approve NFT for bridging
  const approveForBridge = useCallback(async (tokenId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Estimate gas costs for approval
      const approvalTx = {
        to: config.sourceChain.contractAddress,
        data: sourceContract.contract?.interface?.encodeFunctionData('approve', [
          config.targetChain.bridgeAddress,
          tokenId
        ]),
      };

      const feeEstimate = await estimateCompleteFee(approvalTx);
      
      // Execute approval
      const txHash = await sourceContract.approve(config.targetChain.bridgeAddress, tokenId);
      
      return {
        txHash,
        gasUsed: feeEstimate.gasLimit,
        totalCost: feeEstimate.totalEstimate,
      };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [sourceContract, config, estimateCompleteFee]);

  // Get bridge transaction estimate
  const estimateBridgeCost = useCallback(async (tokenId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Mock bridge transaction for estimation
      const bridgeTx = {
        to: config.targetChain.bridgeAddress,
        data: '0x', // Would be actual bridge function call
        value: ethers.parseEther('0'), // Some bridges might require ETH
      };

      const feeEstimate = await estimateCompleteFee(bridgeTx);
      
      return {
        gasLimit: feeEstimate.gasLimit,
        maxFeePerGas: feeEstimate.maxFeePerGas,
        l1DataFee: feeEstimate.l1DataFee,
        totalEstimate: feeEstimate.totalEstimate,
        formatted: {
          gasLimit: feeEstimate.gasLimit.toString(),
          totalCostETH: ethers.formatEther(feeEstimate.totalEstimate),
        },
      };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [config, estimateCompleteFee]);

  // Prepare bridge transaction data
  const prepareBridgeTransaction = useCallback(async (
    tokenId: string,
    targetAddress: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get NFT details and verify eligibility
      const eligibility = await checkBridgeEligibility(tokenId, targetAddress);
      
      if (!eligibility.canBridge) {
        throw new Error(`Cannot bridge NFT: ${eligibility.issues.join(', ')}`);
      }

      // Get cost estimates
      const costEstimate = await estimateBridgeCost(tokenId);
      
      // Check funding requirements
      const fundingInfo = await getFundingRequirement(
        targetAddress,
        costEstimate.totalEstimate
      );

      return {
        nftDetails: eligibility.nftDetails,
        costEstimate,
        fundingInfo,
        readyToBridge: !fundingInfo.needsFunding,
        transaction: {
          to: config.targetChain.bridgeAddress,
          data: '0x', // Would be actual bridge function call
          value: ethers.parseEther('0'),
          gasLimit: costEstimate.gasLimit,
          maxFeePerGas: costEstimate.maxFeePerGas,
        },
      };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [checkBridgeEligibility, estimateBridgeCost, getFundingRequirement, config]);

  return {
    isLoading,
    error,
    getNFTDetails,
    checkBridgeEligibility,
    approveForBridge,
    estimateBridgeCost,
    prepareBridgeTransaction,
    // Expose underlying contracts for advanced usage
    sourceContract,
  };
}

// Hook for batch NFT operations
export function useBatchNFTOperations() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const batchApprove = useCallback(async (
    tokenIds: string[],
    spender: string,
    contract: ReturnType<typeof useERC721Contract>
  ) => {
    setIsLoading(true);
    setError(null);
    setProgress({ current: 0, total: tokenIds.length });

    try {
      const results: Array<{
        tokenId: string;
        txHash?: string;
        error?: string;
        status: 'success' | 'failed';
      }> = [];
      
      for (let i = 0; i < tokenIds.length; i++) {
        const tokenId = tokenIds[i];
        
        try {
          const txHash = await contract.approve(spender, tokenId);
          results.push({ tokenId, txHash, status: 'success' });
        } catch (err: any) {
          results.push({ tokenId, error: err.message, status: 'failed' });
        }
        
        setProgress({ current: i + 1, total: tokenIds.length });
        
        // Small delay to avoid overwhelming the network
        if (i < tokenIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      return results;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  }, []);

  const batchCheckOwnership = useCallback(async (
    tokenIds: string[],
    expectedOwner: string,
    contract: ReturnType<typeof useERC721Contract>
  ) => {
    setIsLoading(true);
    setError(null);
    setProgress({ current: 0, total: tokenIds.length });

    try {
      const results: Array<{
        tokenId: string;
        owner?: string;
        isOwner?: boolean;
        error?: string;
        status: 'success' | 'failed';
      }> = [];
      
      for (let i = 0; i < tokenIds.length; i++) {
        const tokenId = tokenIds[i];
        
        try {
          const owner = await contract.getOwner(tokenId);
          const isOwner = owner.toLowerCase() === expectedOwner.toLowerCase();
          results.push({ tokenId, owner, isOwner, status: 'success' });
        } catch (err: any) {
          results.push({ tokenId, error: err.message, status: 'failed' });
        }
        
        setProgress({ current: i + 1, total: tokenIds.length });
      }

      return {
        results,
        summary: {
          total: tokenIds.length,
          owned: results.filter(r => r.status === 'success' && r.isOwner).length,
          notOwned: results.filter(r => r.status === 'success' && !r.isOwner).length,
          failed: results.filter(r => r.status === 'failed').length,
        },
      };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  }, []);

  return {
    isLoading,
    error,
    progress,
    batchApprove,
    batchCheckOwnership,
  };
}

// Hook for NFT metadata caching and optimization
export function useNFTMetadataCache() {
  const [cache, setCache] = useState<Map<string, {
    metadata: NFTMetadata;
    timestamp: number;
    tokenURI: string;
  }>>(new Map());

  const getCachedMetadata = useCallback(async (
    tokenURI: string,
    maxAgeMs = 5 * 60 * 1000 // 5 minutes
  ): Promise<NFTMetadata | null> => {
    const cached = cache.get(tokenURI);
    
    if (cached && Date.now() - cached.timestamp < maxAgeMs) {
      return cached.metadata;
    }

    try {
      const response = await fetch(tokenURI);
      if (!response.ok) return null;
      
      const metadata = await response.json();
      
      setCache(prev => new Map(prev.set(tokenURI, {
        metadata,
        timestamp: Date.now(),
        tokenURI,
      })));
      
      return metadata;
    } catch (error) {
      console.warn('Failed to fetch metadata:', error);
      return null;
    }
  }, [cache]);

  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  const clearExpiredCache = useCallback((maxAgeMs = 5 * 60 * 1000) => {
    const now = Date.now();
    setCache(prev => {
      const filtered = new Map();
      for (const [uri, data] of prev.entries()) {
        if (now - data.timestamp < maxAgeMs) {
          filtered.set(uri, data);
        }
      }
      return filtered;
    });
  }, []);

  return {
    cache,
    getCachedMetadata,
    clearCache,
    clearExpiredCache,
  };
}

import { useState, useEffect } from 'react';

import { Principal } from '@dfinity/principal';
import type { ContractPointer, SolanaCluster } from '../declarations/orchestrator/orchestrator.did';

export interface ICRC99SupportResult {
  isSupported: boolean;
  nativeChain?: ContractPointer;
  error?: string;
  isLoading: boolean;
}

/**
 * Hook to check if a canister supports ICRC-99 by calling icrc99_native_chain
 */
export function useICRC99Support(canisterId: string | null): ICRC99SupportResult {
  const [result, setResult] = useState<ICRC99SupportResult>({
    isSupported: false,
    isLoading: false,
  });

  useEffect(() => {
    console.log('🎯 useICRC99Support effect triggered with canisterId:', canisterId);
    
    if (!canisterId) {
      console.log('❌ No canisterId provided, returning unsupported');
      setResult({
        isSupported: false,
        isLoading: false,
      });
      return;
    }

    let cancelled = false;

    const checkICRC99Support = async () => {
      console.log('🚀 Starting ICRC-99 support check for:', canisterId);
      setResult(prev => ({ ...prev, isLoading: true }));
      
      try {
        console.log('🔍 Checking ICRC-99 support for NFT canister:', canisterId);
        
        // Create an actor to call the canister directly
        const canisterIdPrincipal = Principal.fromText(canisterId);
        const { HttpAgent, Actor } = await import('@dfinity/agent');
        
        const agent = new HttpAgent({
          host: process.env.DFX_NETWORK === 'local' ? 'http://localhost:8080' : 'https://icp0.io'
        });
        
        // Fetch root key for local development
        if (process.env.DFX_NETWORK === 'local') {
          await agent.fetchRootKey();
        }
        
        const canisterActor = Actor.createActor(
          ({ IDL }) => {
            // Define ICRC16Map for the Other variant
            const ICRC16Map = IDL.Vec(IDL.Tuple(IDL.Text, IDL.Reserved));
            
            // Define Network variant exactly as in the candid
            const Network = IDL.Variant({
              'IC': IDL.Opt(IDL.Text),
              'Ethereum': IDL.Opt(IDL.Nat),
              'Solana': IDL.Opt(IDL.Nat),
              'Bitcoin': IDL.Opt(IDL.Text),
              'Other': ICRC16Map,
            });
            
            // Define RemoteContractPointer__1 as used by icrc99_native_chain
            const RemoteContractPointer__1 = IDL.Record({
              'contract': IDL.Text,
              'network': Network,
            });
            
            return IDL.Service({
              icrc99_native_chain: IDL.Func([], [RemoteContractPointer__1], ['query']),
            });
          },
          {
            agent,
            canisterId: canisterIdPrincipal,
          }
        );
        
        // Call icrc99_native_chain to get the source network and contract
        const nativeChainResult = await (canisterActor as any).icrc99_native_chain();
        console.log('✅ ICRC-99 support detected. Native chain result:', nativeChainResult);
        
        // Transform the result to match our ContractPointer type
        const networkVariant = (nativeChainResult as any).network;
        let transformedNetwork;
        
        if ('IC' in networkVariant) {
          // IC network can have optional text ([] or [string])
          transformedNetwork = { IC: networkVariant.IC };
        } else if ('Ethereum' in networkVariant) {
          // Ethereum network with optional chain ID (comes as [] or [nat])
          if (networkVariant.Ethereum.length > 0) {
            const chainId = BigInt(networkVariant.Ethereum[0]);
            transformedNetwork = { Ethereum: [chainId] as [bigint] };
          } else {
            transformedNetwork = { Ethereum: [] as [] };
          }
        } else if ('Solana' in networkVariant) {
          // Solana network with optional cluster (comes as [] or [SolanaCluster])
          if (networkVariant.Solana.length > 0) {
            const cluster = networkVariant.Solana[0] as SolanaCluster;
            transformedNetwork = { Solana: [cluster] as [SolanaCluster] };
          } else {
            transformedNetwork = { Solana: [] as [] };
          }
        } else if ('Bitcoin' in networkVariant) {
          // Bitcoin network with optional text ([] or [string])
          transformedNetwork = { Bitcoin: networkVariant.Bitcoin };
        } else {
          // Fallback to IC
          transformedNetwork = { IC: [] as [] };
        }
        
        console.log('🔄 Transformed network for ContractPointer:', transformedNetwork);
        
        if (!cancelled) {
          setResult({
            isSupported: true,
            nativeChain: {
              network: transformedNetwork,
              contract: (nativeChainResult as any).contract,
            },
            isLoading: false,
          });
        }
        
      } catch (icrc99Error) {
        console.log('⚠️ ICRC-99 not supported or call failed:', icrc99Error);
        
        if (!cancelled) {
          // Use the actual ckNFT canister ID as the contract identifier
          setResult({
            isSupported: false,
            nativeChain: {
              network: { IC: [] },
              contract: canisterId, // Use the ckNFT canister ID
            },
            isLoading: false,
          });
        }
      }
    };

    checkICRC99Support();

    return () => {
      cancelled = true;
    };
  }, [canisterId]);

  return result;
}

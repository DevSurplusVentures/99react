import { useState, useEffect } from 'react';
import { Actor } from '@dfinity/agent';
import { useAnonAgent } from '../provider/AgentProvider';
import { idlFactory as ckNFTIdl } from '../declarations/ckNFT/index';
import type { _SERVICE as CkNFTService } from '../declarations/ckNFT/ckNFT.did';
import type { RemoteContractPointer } from '../declarations/ckNFT/ckNFT.did';

/**
 * Hook to fetch the native chain information for a ckNFT
 * @param canisterId - The ckNFT canister ID
 * @param tokenId - The token ID (optional, if not provided, gets the collection's native chain)
 */
export function useNativeChain(
  canisterId: string,
  tokenId?: bigint
): { 
  nativeChain: RemoteContractPointer | null; 
  loading: boolean; 
  error: any 
} {
  const [nativeChain, setNativeChain] = useState<RemoteContractPointer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const anonAgent = useAnonAgent();

  useEffect(() => {
    let cancelled = false;

    async function fetchNativeChain() {
      if (!canisterId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Create actor for the ckNFT canister
        const actor = Actor.createActor<CkNFTService>(ckNFTIdl, {
          agent: anonAgent,
          canisterId,
        });

        // Call icrc99_native_chain method
        console.log('🔍 Fetching native chain for canister:', canisterId);
        const result = await actor.icrc99_native_chain();
        
        if (!cancelled) {
          console.log('✅ Native chain result:', result);
          setNativeChain(result);
        }
      } catch (err) {
        console.error('❌ Error fetching native chain:', err);
        if (!cancelled) {
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchNativeChain();
    return () => { cancelled = true; };
  }, [canisterId, tokenId, anonAgent]);

  return { nativeChain, loading, error };
}

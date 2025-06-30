import { useState, useEffect } from 'react';
import { Actor } from '@dfinity/agent';
import { useAnonAgent } from '../provider/AgentProvider';
import { nft, idlFactory as nftIdl } from '../declarations/nft/index';
import { CollectionMetadata, parseCollectionMetadata } from '../core/CollectionMetadata';

/**
 * Fetch collection-level metadata, with optional override.
 * @param canisterId 
 * @param options: { override?: (canisterId, queryArgs) => Promise<CollectionMetadata>, queryArgs?: any }
 */
export function useNFTCollection(
  canisterId: string,
  options?: {
    override?: (canisterId: string, queryArgs?: any) => Promise<CollectionMetadata>,
    queryArgs?: any,
  }
): { collection: CollectionMetadata | null; tokenIds: bigint[]; loading: boolean; error: any } {
  console.debug('useNFTCollection', canisterId, options);
  const [collection, setCollection] = useState<CollectionMetadata|null>(null);
  const [tokenIds, setTokenIds] = useState<bigint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const anonAgent = useAnonAgent();
  
  useEffect(() => {
    let cancelled = false;
    
    // Create actor inside effect
    const actor = Actor.createActor<typeof nft>(nftIdl as any, {
      agent: anonAgent,
      canisterId,
    });
    
    async function fetchMetadata() {
      setLoading(true);
      setError(null);
      if (options?.override) {
        try {
          const res = await options.override(canisterId, options.queryArgs);
          if (!cancelled) setCollection(res);
        } catch (e) {
          if (!cancelled) setError(e);
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }
      try {
        const raw: any = await actor.icrc7_collection_metadata();
        const parsed = parseCollectionMetadata(raw as any);
        if (!cancelled) setCollection(parsed);
        // Fetch all tokenIds in the collection
        let prev: bigint|undefined = undefined;
        let batch: bigint[] = [];
        let pageSize: number = 50;
        let allIds: bigint[] = [];
        while (true) {
          const res: any[] = await actor.icrc7_tokens(
            prev !== undefined ? [prev] : [],
            [BigInt(pageSize)]
          );
          batch = (res || []).map((id: any) => BigInt(id));
          if (batch.length === 0) break;
          allIds.push(...batch);
          if (batch.length < pageSize) break; // last page reached
          prev = batch[batch.length-1];
        }
        if (!cancelled) setTokenIds(allIds);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchMetadata();
    return () => { cancelled = true; };
  }, [canisterId, options?.override, options?.queryArgs, anonAgent]);

  return { collection, tokenIds, loading, error };
}
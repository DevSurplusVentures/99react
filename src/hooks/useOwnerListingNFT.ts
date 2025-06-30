import { useState, useEffect, useCallback } from 'react';
import { Actor } from '@dfinity/agent';
import { useAnonAgent } from '../provider/AgentProvider';
import ownerListingNFTBatcher from '../core/OwnerListingNFTBatchProvider';
// You may need to adjust the import below to your actual market canister idl
import { idlFactory as marketIdl } from '../declarations/market';

/**
 * Fetch all NFT market listings for a participant principal, with batching and optional status filter.
 * If options.override is specified, it is called as (canisterId, principalId, status, queryArgs) and must return a Promise<any|null>.
 */
export function useOwnerListingNFT(
  canisterId: string,
  principalId: string,
  options?: {
    status?: string, // e.g. 'open'
    override?: (canisterId: string, principalId: string, status?: string, queryArgs?: any) => Promise<any | null>,
    queryArgs?: any,
  }
): { listings: any | null; loading: boolean; error: any } {
  const [listings, setListings] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const anonAgent = useAnonAgent();

  // Memoize fetcher
  const fetcher = useCallback((principalIds: string[], status?: string) => {
    // Create actor inside callback to use anonymous agent
    const actor = Actor.createActor<any>(marketIdl as any, {
      agent: anonAgent,
      canisterId,
    });
    
    // Build the IntentFilter for #participant_principals and optional #statuses
    const filter: any[] = [
      {
        '#participant_principals': principalIds,
      }
    ];
    if (status) {
      filter[0]['#statuses'] = [{ [`#${status}`]: null }];
    }
    // prev: null, take: principalIds.length
    return actor.icrc8_market_info(filter, null, null);
  }, [anonAgent, canisterId]);

  useEffect(() => {
    if (!canisterId || !principalId) return;
    setLoading(true);
    if (options && typeof options.override === 'function') {
      options.override(canisterId, principalId, options.status, options.queryArgs)
        .then((data) => {
          setListings(data);
          setError(null);
        })
        .catch((e) => setError(e))
        .finally(() => setLoading(false));
      return;
    }
    ownerListingNFTBatcher.request<any>(canisterId, fetcher, principalId, options?.status)
      .then((data) => {
        setListings(data);
        setError(null);
      })
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  }, [canisterId, principalId, options?.override, options?.queryArgs, options?.status, fetcher]);

  return { listings, loading, error };
}

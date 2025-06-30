import { useState, useEffect, useCallback } from 'react';
import { Actor } from '@dfinity/agent';
import { useAnonAgent } from '../provider/AgentProvider';
import marketListingBatcher from '../core/MarketListingBatcher.ts';
import { idlFactory as marketIdl } from '../declarations/market';
import { Principal } from '@dfinity/principal';

/**
 * Fetch a single NFT's market listing with automatic batching and optional override.
 * If options.override is specified, it is called as (canisterId, tokenId, queryArgs) and must return a Promise<any|null>.
 */
export function useMarketListingNFT(
  canisterId: string,
  tokenCanisterId: string,
  tokenId: bigint,
  options?: {
    override?: (canisterId: string, tokenCanisterId: string,tokenId: bigint, queryArgs?: any) => Promise<any | null>,
    queryArgs?: any,
  }
): { listing: any | null; loading: boolean; error: any } {
  const [listing, setListing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const anonAgent = useAnonAgent();

  // Memoize fetcher
  const fetcher = useCallback((tokenIds: bigint[]) => {
    // Create actor inside callback to use anonymous agent
    const actor = Actor.createActor<any>(marketIdl as any, {
      agent: anonAgent,
      canisterId,
    });
    // Use [] for absent optionals (Candid opt type)
    const filter = [
      
        {'listed_tokens': [{
          canister : Principal.fromText(tokenCanisterId),
          token_pointer: [],
          meta: [],
          inventory:[{tokenIds: tokenIds}],
          
        }]},
        {'statuses': [{ open: null }]}
      ];
    console.log("filter is ", filter);
    console.log("Querying market with tokenIds:", tokenIds);
    return actor.icrc8_market_info([filter], [], []).then((results: any) => {
      console.log("Market query results:", results);
      return results;
    });
  }, [anonAgent, canisterId, tokenCanisterId]);

  useEffect(() => {
    if (!canisterId || tokenId == null) return;
    setLoading(true);
    if (options && typeof options.override === 'function') {
      options.override(canisterId, tokenCanisterId, tokenId, options.queryArgs)
        .then((data) => {
          setListing(data);
          setError(null);
        })
        .catch((e) => setError(e))
        .finally(() => setLoading(false));
      return;
    }
    marketListingBatcher.request<any>(canisterId, fetcher, tokenId)
      .then((data) => {
        console.log("Fetched market listing:", data);
        setListing(data);
        setError(null);
      })
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  }, [canisterId, tokenId, options?.override, options?.queryArgs, fetcher]);

  return { listing, loading, error };
}

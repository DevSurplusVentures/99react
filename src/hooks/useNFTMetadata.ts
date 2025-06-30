import { NFTMetadata, parseNFTMetadata } from '../lib';
import { useState, useEffect, useCallback } from 'react';
import { Actor } from '@dfinity/agent';
import { useAnonAgent } from '../provider/AgentProvider';
import { nft, idlFactory as nftIdl } from '../declarations/nft/index';
import nftBatcher from '../core/NFTMetadataBatcher';

/**
 * Fetch a single NFT's metadata with automatic batching and optional override.
 * If options.override is specified, it is called as (canisterId, tokenId, queryArgs) and must return a Promise<NFTMetadata|null>.
 */
export function useNFTMetadata(
  canisterId: string,
  tokenId: bigint,
  options?: {
    override?: (canisterId: string, tokenId: bigint, queryArgs?: any) => Promise<NFTMetadata|null>,
    queryArgs?: any,
  }
): { metadata: NFTMetadata | null; loading: boolean; error: any } {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const anonAgent = useAnonAgent();

  // Memoize fetcher so it doesn't change on every render
  const fetcher = useCallback((tokenIds: bigint[]) => {
    // Create actor inside callback to use anonymous agent
    const actor = Actor.createActor<typeof nft>(nftIdl as any, {
      agent: anonAgent,
      canisterId,
    });
    return actor.icrc7_token_metadata(tokenIds);
  }, [anonAgent, canisterId]);

  useEffect(() => {
    if (!canisterId || tokenId == null) return;
    setLoading(true);
    // If an override function is provided
    if (options && typeof options.override === 'function') {
      options.override(canisterId, tokenId, options.queryArgs)
        .then(async (data) => {
          console.log("Fetched NFT metadata with override:", data);
          // Ensure data is an array of [string, Value__1][]
          let metadataArray = Array.isArray(data) ? data : [];
          let result = await parseNFTMetadata(tokenId, metadataArray) || null;

          console.log("Fetched NFT metadata with override:", result);
          setMetadata(result);
          setError(null);
        })
        .catch((e) => setError(e))
        .finally(() => setLoading(false));
      return;
    }
    nftBatcher.request<[string, any][]>(canisterId, fetcher, tokenId)
      .then(async (data) => {
        console.log("Fetched NFT metadata:", data);
        // Parse the raw metadata array into NFTMetadata
        let result = await parseNFTMetadata(tokenId, data) || null;
        console.log("Fetched NFT metadata after parsing:", result);
        setMetadata(result);
        setError(null);
      })
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  }, [canisterId, tokenId, options?.override, options?.queryArgs, fetcher]);

  return { metadata, loading, error };
}

import { useState, useEffect } from 'react';
import { useNFTOwnerBatcher } from '../core/NFTOwnerBatcher';
import { Account } from '../core/Account';

/**
 * Fetch a single NFT's owner with batching and override support.
 * @param canisterId 
 * @param tokenId 
 * @param options: { override?: (canisterId, tokenId, queryArgs) => Promise<Account|null>, queryArgs?: any }
 */
export function useNFTOwner(
  canisterId: string,
  tokenId: bigint,
  options?: {
    override?: (canisterId: string, tokenId: bigint, queryArgs?: any) => Promise<Account | null>,
    queryArgs?: any,
  }
): { owner: Account | null; loading: boolean; error: any } {
  const [owner, setOwner] = useState<Account|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const { request } = useNFTOwnerBatcher(canisterId);
  
  useEffect(() => {
    console.log("useNFTOwner called with canisterId:", canisterId, "tokenId:", tokenId);
    if (!canisterId || tokenId == null) return;
    const fetchPromise = options?.override
      ? options.override(canisterId, tokenId, options?.queryArgs)
      : request<Account | null>(tokenId);
    fetchPromise
      .then((acct) => {
        console.log("Fetched NFT owner:", acct);
        setOwner(acct);
        setError(null);
      })
      .catch(e => setError(e))
      .finally(() => setLoading(false));
  }, [canisterId, tokenId, options?.override, options?.queryArgs, request]);

  return { owner, loading, error };
}
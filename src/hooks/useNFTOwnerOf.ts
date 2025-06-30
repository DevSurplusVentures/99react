import { useState, useEffect } from 'react';
import { Actor } from '@dfinity/agent';
import { useAnonAgent } from '../provider/AgentProvider';
import { nft, idlFactory as nftIdl } from '../declarations/nft/index';
import { Account } from '../core/Account';
import { Principal } from '@dfinity/principal';

/**
 * Fetch all tokenIds (bigint[]) a user owns in a collection. Handles pagination internally.
 * @param canisterId 
 * @param account: {owner, subaccount?}
 * @param options: { override?: (canisterId, account, queryArgs) => Promise<bigint[]>, queryArgs?: any }
 */
export function useNFTOwnerOf(
  canisterId: string,
  account: Account,
  options?: {
    override?: (canisterId: string, account: Account, queryArgs?: any) => Promise<bigint[]>,
    queryArgs?: any,
  }
): { tokenIds: bigint[]; loading: boolean; error: any } {
  const [tokenIds, setTokenIds] = useState<bigint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const anonAgent = useAnonAgent();

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      setLoading(true);
      setError(null);
      // Handle override
      if (options?.override) {
        try {
          const res = await options.override(canisterId, account, options.queryArgs);
          if (!cancelled) setTokenIds(res);
        } catch (e) {
          if (!cancelled) setError(e);
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      // Fallback to actor (fetch all pages)
      try {
        // Create actor inside effect to use anonymous agent
        const actor = Actor.createActor<typeof nft>(nftIdl as any, {
          agent: anonAgent,
          canisterId,
        });
        
        let prev: bigint|undefined = undefined;
        let batch: bigint[] = [];
        let pageSize: number = 50;
        let allIds: bigint[] = [];
        while (true) {
          const res: any[] = await actor.icrc7_tokens_of(
            { owner: Principal.fromText(account.owner), subaccount: account.subaccount ? [account.subaccount] : [] },
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
    fetchAll();
    return () => { cancelled = true; };
  }, [canisterId, account?.owner, account?.subaccount, options?.override, options?.queryArgs, anonAgent]);

  return { tokenIds, loading, error };
}
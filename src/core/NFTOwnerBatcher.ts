import { useCallback } from 'react';
import { Actor } from '@dfinity/agent';
import { useAnonAgent } from '../provider/AgentProvider';
import { nft, idlFactory as nftIdl } from '../declarations/nft/index';
import { Account } from './Account';

// Utility to split an array into chunks of a given size
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

interface Resolver<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

/**
 * Batches up multiple single-token owner requests into bulk calls, debounced.
 * Now decoupled from React hooks: requires a fetcher function to be provided.
 */
class NFTOwnerBatcher {
  private static _instance: NFTOwnerBatcher;
  private queues = new Map<
    string,
    { fetcher: (tokenIds: bigint[]) => Promise<any[]>; tokenMap: Map<bigint, Resolver<any>> }
  >();
  private timer: ReturnType<typeof setTimeout> | null = null;

  private constructor() {}

  static get instance() {
    if (!this._instance) this._instance = new NFTOwnerBatcher();
    return this._instance;
  }

  /**
   * Request owner for a single token; returns a promise that resolves when the batch goes out.
   * @param queueKey - unique key for the batch (e.g. canisterId)
   * @param fetcher - function to fetch owners for a batch of tokenIds
   * @param tokenId - the tokenId to fetch
   */
  request<T>(
    queueKey: string,
    fetcher: (tokenIds: bigint[]) => Promise<any[]>,
    tokenId: bigint
  ): Promise<T> {
    let entry = this.queues.get(queueKey);
    if (!entry) {
      entry = { fetcher, tokenMap: new Map() };
      this.queues.set(queueKey, entry);
    }
    let resolver = entry.tokenMap.get(tokenId) as Resolver<T> | undefined;
    if (!resolver) {
      let resolveFn!: (value: T) => void;
      let rejectFn!: (reason?: any) => void;
      const promise = new Promise<T>((res, rej) => {
        resolveFn = res;
        rejectFn = rej;
      });
      resolver = { promise, resolve: resolveFn, reject: rejectFn };
      entry.tokenMap.set(tokenId, resolver);
    }
    this.scheduleFlush();
    return resolver.promise;
  }

  private scheduleFlush() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.flush();
      this.timer = null;
    }, 10);
  }

  private async flush() {
    for (const [queueKey, { fetcher, tokenMap }] of this.queues.entries()) {
      console.debug(`Flushing NFTOwnerBatcher for queue: ${queueKey}`);
      const tokenIds = Array.from(tokenMap.keys());
      const batches = chunkArray(tokenIds, 25);
      console.debug(`Processing ${batches.length} batches for queue: ${queueKey}`);
      try {
        for (const batch of batches) {
          const results = await fetcher(batch);
          console.debug(`Fetched results for batch: ${batch.join(', ')}`, results);
          results.forEach((res: any, i: number) => {
            const id = batch[i];
            const resolver = tokenMap.get(id)!;
            console.log(`Resolving owner for tokenId ${id}:`, res);
            if (res && res[0] && res[0].owner) {
              resolver.resolve({
                owner: typeof res[0].owner === 'string' ? res[0].owner : res[0].owner.toString(),
                subaccount: Array.isArray(res[0].subaccount) && res[0].subaccount.length > 0 ?
                  new Uint8Array(res[0].subaccount[0]) : undefined
              } as Account);
            } else {
              resolver.resolve(null);
            }
          });
        }
      } catch (err) {
        console.error(`Error flushing NFTOwnerBatcher for queue ${queueKey}:`, err);
        tokenMap.forEach((resolver) => resolver.reject(err));
      }
      this.queues.delete(queueKey);
    }
  }
}

const nftOwnerBatcher = NFTOwnerBatcher.instance;
export default nftOwnerBatcher;

/**
 * Custom hook to provide a batched NFT owner fetcher using the batcher.
 * This hook wires up the actor and passes a fetcher function to the batcher.
 */
export function useNFTOwnerBatcher(canisterId: string) {
  const anonAgent = useAnonAgent();

  // Memoize fetcher so it doesn't change on every render
  const fetcher = useCallback((tokenIds: bigint[]) => {
    // Create actor inside callback to use anonymous agent
    const actor = Actor.createActor<typeof nft>(nftIdl as any, {
      agent: anonAgent,
      canisterId,
    });
    return actor.icrc7_owner_of(tokenIds);
  }, [anonAgent, canisterId]);

  // Memoize request so it doesn't change on every render
  const request = useCallback(<T,>(tokenId: bigint): Promise<T> => {
    return nftOwnerBatcher.request<T>(canisterId, fetcher, tokenId);
  }, [canisterId, fetcher]);

  return { request };
}

// packages/hooks/src/NFTBatcher.ts
import { useActor } from '../hooks/useActor';
import { nft, idlFactory as nftIdl } from '../declarations/nft/index';
import { useCallback } from 'react';

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
 * Batches up multiple single-token requests into bulk calls, debounced.
 * Now decoupled from React hooks: requires a fetcher function to be provided.
 */
class NFTBatcher {
  private static _instance: NFTBatcher;
  private queues = new Map<
    string,
    { fetcher: (tokenIds: bigint[]) => Promise<any[]>; tokenMap: Map<bigint, Resolver<any>> }
  >();
  private timer: ReturnType<typeof setTimeout> | null = null;

  private constructor() {}

  static get instance() {
    if (!this._instance) this._instance = new NFTBatcher();
    return this._instance;
  }

  /**
   * Request metadata for a single token; returns a promise that resolves when the batch goes out.
   * @param queueKey - unique key for the batch (e.g. canisterId)
   * @param fetcher - function to fetch metadata for a batch of tokenIds
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
      const tokenIds = Array.from(tokenMap.keys());
      const batches = chunkArray(tokenIds, 25);
      try {
        for (const batch of batches) {
          const results = await fetcher(batch);
          results.forEach((res: any, i: number) => {
            const id = batch[i];
            const resolver = tokenMap.get(id)!;
            resolver.resolve(res);
          });
        }
      } catch (err) {
        tokenMap.forEach((resolver) => resolver.reject(err));
      }
      this.queues.delete(queueKey);
    }
  }
}

const nftBatcher = NFTBatcher.instance;
export default nftBatcher;

/**
 * Custom hook to provide a batched NFT metadata fetcher using the batcher.
 * This hook wires up the actor and passes a fetcher function to the batcher.
 */
export function useNFTBatcher(canisterId: string) {
  const actor = useActor<typeof nft>(canisterId, nftIdl);

  // Memoize fetcher so it doesn't change on every render
  const fetcher = useCallback((tokenIds: bigint[]) => {
    return actor.icrc7_token_metadata(tokenIds);
  }, [actor]);

  // Memoize request so it doesn't change on every render
  const request = useCallback(<T,>(tokenId: bigint): Promise<T> => {
    return nftBatcher.request<T>(canisterId, fetcher, tokenId);
  }, [canisterId, fetcher]);

  return { request };
}
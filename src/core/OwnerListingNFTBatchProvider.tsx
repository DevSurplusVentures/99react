// OwnerListingNFTBatchProvider.tsx
// Batches NFT owner listing requests using icrc8_market_info and #participant_principals filter
import { useActor } from '../hooks/useActor';
// You may need to adjust the import below to your actual market canister idl
import { idlFactory as marketIdl } from '../declarations/market';

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

class OwnerListingNFTBatchProvider {
  private static _instance: OwnerListingNFTBatchProvider;
  private queues = new Map<
    string,
    { fetcher: (principalIds: string[], status?: string) => Promise<any[]>; principalMap: Map<string, Resolver<any>> }
  >();
  private timer: ReturnType<typeof setTimeout> | null = null;

  private constructor() {}

  static get instance() {
    if (!this._instance) this._instance = new OwnerListingNFTBatchProvider();
    return this._instance;
  }

  request<T>(
    canisterId: string,
    fetcher: (principalIds: string[], status?: string) => Promise<any[]>,
    principalId: string,
    status?: string
  ): Promise<T> {
    let entry = this.queues.get(canisterId);
    if (!entry) {
      entry = { fetcher, principalMap: new Map() };
      this.queues.set(canisterId, entry);
    }
    let resolver = entry.principalMap.get(principalId) as Resolver<T> | undefined;
    if (!resolver) {
      let resolveFn!: (value: T) => void;
      let rejectFn!: (reason?: any) => void;
      const promise = new Promise<T>((res, rej) => {
        resolveFn = res;
        rejectFn = rej;
      });
      resolver = { promise, resolve: resolveFn, reject: rejectFn };
      entry.principalMap.set(principalId, resolver);
    }
    this.scheduleFlush(status);
    return resolver.promise;
  }

  private scheduleFlush(status?: string) {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.flush(status);
      this.timer = null;
    }, 10);
  }

  private async flush(status?: string) {
    for (const [canisterId, { fetcher, principalMap }] of this.queues.entries()) {
      const principalIds = Array.from(principalMap.keys());
      const batches = chunkArray(principalIds, 25);
      try {
        for (const batch of batches) {
          const results = await fetcher(batch, status);
          results.forEach((res: any, i: number) => {
            const id = batch[i];
            const resolver = principalMap.get(id)!;
            resolver.resolve(res);
          });
        }
      } catch (err) {
        principalMap.forEach((resolver) => resolver.reject(err));
      }
      this.queues.delete(canisterId);
    }
  }
}

const ownerListingNFTBatcher = OwnerListingNFTBatchProvider.instance;
export default ownerListingNFTBatcher;

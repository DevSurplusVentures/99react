// MarketListingBatcher.ts
// Pure batching class for NFT market listings (no React hooks)

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

class MarketListingBatcher {
  private static _instance: MarketListingBatcher;
  private queues = new Map<
    string,
    { fetcher: (tokenIds: bigint[]) => Promise<any[]>; tokenMap: Map<bigint, Resolver<any>> }
  >();
  private timer: ReturnType<typeof setTimeout> | null = null;

  private constructor() {}

  static get instance() {
    if (!this._instance) this._instance = new MarketListingBatcher();
    return this._instance;
  }

  request<T>(
    canisterId: string,
    fetcher: (tokenIds: bigint[]) => Promise<any[]>,
    tokenId: bigint
  ): Promise<T> {
    console.log(`[MarketListingBatcher] Request for canisterId:`, canisterId, 'tokenId:', tokenId);
    let entry = this.queues.get(canisterId);
    if (!entry) {
      entry = { fetcher, tokenMap: new Map() };
      this.queues.set(canisterId, entry);
      console.log(`[MarketListingBatcher] Created new queue for canisterId:`, canisterId);
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
      console.log(`[MarketListingBatcher] Added tokenId to queue:`, tokenId);
    }
    this.scheduleFlush();
    return resolver.promise;
  }

  private scheduleFlush() {
    if (this.timer) return;
    console.log(`[MarketListingBatcher] Scheduling flush in 10ms`);
    this.timer = setTimeout(() => {
      this.flush();
      this.timer = null;
    }, 10);
  }

  private async flush() {
    console.log(`[MarketListingBatcher] Flushing all queues...`);
    for (const [canisterId, { fetcher, tokenMap }] of this.queues.entries()) {
      const tokenIds = Array.from(tokenMap.keys());
      const batches = chunkArray(tokenIds, 25);
      console.log(`[MarketListingBatcher] Flushing canisterId:`, canisterId, 'tokenIds:', tokenIds);
      try {
        for (const batch of batches) {
          console.log(`[MarketListingBatcher] Fetching batch:`, batch);
          const results = await fetcher(batch);
          console.log(`[MarketListingBatcher] Received results for batch:`, results);
          // Map results to tokenIds. If a result is missing, resolve with null.
          // Assume each result has a tokenId property, or results are in order. Try to match by id if possible.
          // Fallback: if results.length !== batch.length, fill missing with null.
          // Try to detect if results are objects with tokenId or similar.
          const resultMap = new Map<bigint, any>();
          if (Array.isArray(results)) {
            // Try to extract tokenId from IntentStatus.original_config.intent_tokens
            results.forEach((res: any) => {
              if (res && typeof res === 'object' && 'original_config' in res) {
                // Extract tokenIds from intent_tokens in original_config
                const originalConfig = res.original_config;
                if (Array.isArray(originalConfig)) {
                  for (const optFeature of originalConfig) {
                    if (optFeature && optFeature[0] && 'intent_tokens' in optFeature[0]) {
                      const intentTokens = optFeature[0].intent_tokens;
                      if (Array.isArray(intentTokens)) {
                        for (const escrow of intentTokens) {
                          if (escrow && escrow.kind && 'intent' in escrow.kind) {
                            const intentSpecs = escrow.kind.intent;
                            for (const optSpec of intentSpecs) {
                              if (optSpec && optSpec[0] && optSpec[0].inventory) {
                                const inventory = optSpec[0].inventory;
                                if (inventory && inventory[0] && 'tokenIds' in inventory[0]) {
                                  const tokenIds = inventory[0].tokenIds;
                                  // Map this result to all tokenIds it contains
                                  for (const tokenId of tokenIds) {
                                    resultMap.set(BigInt(tokenId), res);
                                    console.log(`[MarketListingBatcher] Mapped tokenId ${tokenId} to result:`, res);
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            });
          }
          batch.forEach((id) => {
            const resolver = tokenMap.get(id)!;
            const result = resultMap.has(id) ? resultMap.get(id) : null;
            console.log(`[MarketListingBatcher] Resolving tokenId:`, id, 'result:', result);
            resolver.resolve(result);
          });
        }
      } catch (err) {
        console.error(`[MarketListingBatcher] Error during flush:`, err);
        tokenMap.forEach((resolver) => resolver.reject(err));
      }
      this.queues.delete(canisterId);
      console.log(`[MarketListingBatcher] Cleared queue for canisterId:`, canisterId);
    }
  }
}

const marketListingBatcher = MarketListingBatcher.instance;
export default marketListingBatcher;

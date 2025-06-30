// Parsed collection metadata for ICRC-7
import { Value__1 } from '../declarations/nft/nft.did.d';

export interface CollectionMetadata {
  name?: string;
  symbol?: string;
  description?: string;
  logo?: string;
  totalSupply?: bigint;
  supplyCap?: bigint;
  maxQueryBatchSize?: bigint;
  maxUpdateBatchSize?: bigint;
  maxTakeValue?: bigint;
  maxMemoSize?: bigint;
  defaultTakeValue?: bigint;
  atomicBatchTransfers?: boolean;
  txWindow?: bigint;
  permittedDrift?: bigint;
  // All raw pairs as fallback
  raw: [string, Value__1][];
}

// Helper to parse ICRC-7 style metadata vec
export function parseCollectionMetadata(metadata: [string, Value__1][]): CollectionMetadata {
  const fromValue = (v?: Value__1) : any => {
    if (!v) return undefined;
    if ('Text' in v) return v.Text;
    if ('Nat' in v) return BigInt(v.Nat);
    if ('Bool' in v) return v.Bool;
    // Return as fallback
    return v;
  };
  const obj: CollectionMetadata = {
    raw: metadata,
  };
  for (const [k, v] of metadata) {
    if (k === 'icrc7:symbol') obj.symbol = fromValue(v);
    if (k === 'icrc7:name') obj.name = fromValue(v);
    if (k === 'icrc7:description') obj.description = fromValue(v);
    if (k === 'icrc7:logo') obj.logo = fromValue(v);
    if (k === 'icrc7:total_supply') obj.totalSupply = fromValue(v);
    if (k === 'icrc7:supply_cap') obj.supplyCap = fromValue(v);
    if (k === 'icrc7:max_query_batch_size') obj.maxQueryBatchSize = fromValue(v);
    if (k === 'icrc7:max_update_batch_size') obj.maxUpdateBatchSize = fromValue(v);
    if (k === 'icrc7:max_memo_size') obj.maxMemoSize = fromValue(v);
    if (k === 'icrc7:max_take_value') obj.maxTakeValue = fromValue(v);
    if (k === 'icrc7:default_take_value') obj.defaultTakeValue = fromValue(v);
    if (k === 'icrc7:atomic_batch_transfers') obj.atomicBatchTransfers = fromValue(v);
    if (k === 'icrc7:tx_window') obj.txWindow = fromValue(v);
    if (k === 'icrc7:permitted_drift') obj.permittedDrift = fromValue(v);
  }
  return obj;
}
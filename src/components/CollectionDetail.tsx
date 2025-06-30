import React from 'react';
import { useNFTCollection } from '../hooks/useNFTCollection';
import { CollectionMetadata } from '../core/CollectionMetadata';

export interface CollectionDetailProps {
  /** Canister ID for the ICRC-7 NFT collection */
  canisterId: string;
  /** Optionally provide a CollectionMetadata directly (to skip fetch) */
  collection?: CollectionMetadata | null;
  /** Optional loading indicator override */
  loadingComponent?: React.ReactNode;
  /** Optional error override */
  errorComponent?: React.ReactNode;
}

export const CollectionDetail: React.FC<CollectionDetailProps> = ({
  canisterId,
  collection: injectedCollection,
  loadingComponent,
  errorComponent
}) => {
  // If collection is injected, don't refetch
  const { collection, loading, error } = useNFTCollection(canisterId);
  const col = injectedCollection !== undefined ? injectedCollection : collection;

  if (loading) {
    return loadingComponent || (
      <div className="py-8 text-center text-gray-500 animate-pulse">Loading collection...</div>
    );
  }
  if (error) {
    return errorComponent || (
      <div className="py-8 text-center text-red-500">Failed to load collection metadata.</div>
    );
  }
  if (!col) {
    return <div className="py-8 text-center text-gray-400">Collection not found</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 bg-white rounded-2xl shadow-md border space-y-8">
      <div className="flex items-center space-x-5">
        {col.logo ? (
          <img
            src={col.logo}
            alt={col.name || ''}
            className="w-16 h-16 rounded-full border bg-gray-100 object-contain"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-3xl font-bold border">
            {(col.name ? col.name[0] : '?')}
          </div>
        )}
        <div className="space-y-1">
          <div className="text-2xl font-semibold text-gray-900">{col.name || canisterId.substring(0, 6) + '...'}</div>
          <div className="flex items-center space-x-3">
            {col.symbol && <div className="text-lg text-gray-500">{col.symbol}</div>}
          </div>
        </div>
      </div>
      {col.description && (
        <div className="text-gray-700 text-base whitespace-pre-line">{col.description}</div>
      )}
      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
        {col.totalSupply !== undefined && (
          <div>
            <span className="font-medium text-gray-700">Total Supply:</span> {col.totalSupply.toString()}
          </div>
        )}
        {col.supplyCap !== undefined && (
          <div>
            <span className="font-medium text-gray-700">Supply Cap:</span> {col.supplyCap.toString()}
          </div>
        )}
        {col.maxQueryBatchSize !== undefined && (
          <div>
            <span className="font-medium text-gray-700">Max Query Batch:</span> {col.maxQueryBatchSize.toString()}
          </div>
        )}
        {col.atomicBatchTransfers !== undefined && (
          <div>
            <span className="font-medium text-gray-700">Atomic Batching:</span> {col.atomicBatchTransfers ? 'Yes' : 'No'}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionDetail;
import React from 'react';
import { useNFTCollection } from '../hooks/useNFTCollection';
import { CollectionMetadata } from '../core/CollectionMetadata';

export interface CollectionExplorerProps {
  /**
   * List of collection canisterIds to browse. Each must be a valid ICRC-7 canister.
   */
  canisterIds: string[];
  /** Optional callback for when a collection is selected/clicked */
  onSelectCollection?: (canisterId: string, collection: CollectionMetadata | null) => void;
  /**
   * Optionally provide custom label for empty state
   */
  emptyLabel?: string;
}

export const CollectionExplorer: React.FC<CollectionExplorerProps> = ({
  canisterIds,
  onSelectCollection,
  emptyLabel = 'No collections available.',
}) => {
  console.log('CollectionExplorer render', canisterIds);
  // Fetch each collection
  const results = canisterIds.map((id) => ({
    canisterId: id,
    ...useNFTCollection(id)
  }));

  const anyLoading = results.some((r) => r.loading);
  const anyError = results.some((r) => !!r.error);
  const collections = results.map((r) => ({ canisterId: r.canisterId, collection: r.collection })).filter((c) => c.collection);

  console.log('CollectionExplorer results:', results, anyLoading, anyError, collections);

  // Empty state
  if (!canisterIds.length) {
    return (
      <div className="py-8 text-center text-gray-400 italic">{emptyLabel}</div>
    );
  }

  // Loading state
  if (anyLoading && !collections.length) {
    return (
      <div className="py-8 text-center text-gray-500 animate-pulse">Loading collections...</div>
    );
  }

  // Error state
  if (anyError && !collections.length) {
    return (
      <div className="py-8 text-center text-red-500">Failed to load collections. Please try again.</div>
    );
  }

  // Success/Partial state
  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
      {results.map(({ canisterId, collection, loading, error }) => (
        <div
          key={canisterId}
          className={
            'rounded-lg border shadow-sm bg-white hover:shadow-md transition cursor-pointer relative min-h-[6rem]' +
            (loading ? ' opacity-60 pointer-events-none' : '')
          }
          onClick={() => collection && onSelectCollection?.(canisterId, collection)}
        >
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm">
              <div className="loader border-t-2 border-b-2 border-blue-500 rounded-full w-7 h-7 animate-spin mb-2"></div>
              <span className="text-xs text-gray-400">Loading...</span>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-50/90">
              <span className="text-xs text-red-500">Failed to load</span>
            </div>
          )}
          {collection && (
            <div className="px-4 py-6 flex flex-col items-center space-y-2">
              {collection.logo ? (
                <img src={collection.logo} alt={collection.name || ''} className="w-12 h-12 object-contain rounded-full border bg-gray-50" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xl font-bold border">
                  {(collection.name ? collection.name[0] : '?')}
                </div>
              )}
              <div className="font-semibold text-gray-700 text-center">
                {collection.name || canisterId.substring(0,6) + '...'}
              </div>
              <div className="text-xs text-gray-400 text-center">{collection.symbol}</div>
              {collection.description && (
                <div className="text-xs text-gray-500 text-center mt-1 line-clamp-2">{collection.description}</div>
              )}
            </div>
          )}
          {!collection && !loading && !error && (
            <div className="p-6 text-center text-gray-400">Not found</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CollectionExplorer;

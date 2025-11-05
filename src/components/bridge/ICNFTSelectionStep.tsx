import { useState, useEffect, useMemo, useCallback } from 'react';
import { Principal } from '@dfinity/principal';
import { clsx } from 'clsx';
import { Image, AlertCircle, Loader2 } from 'lucide-react';
import type { SelectedICNFT } from './EVMExportWizard';
import { useNFTOwnerOf } from '../../hooks/useNFTOwnerOf';
import { useNFTMetadata } from '../../hooks/useNFTMetadata';
import type { Account } from '../../core/Account';
import { NFTMetadata } from '../../lib';
import { solanaMintFromTokenId } from '../../utils/solanaTokenId';

export interface ICNFTSelectionStepProps {
  /** Source canister ID to fetch NFTs from */
  sourceCanisterId?: string;
  /** Currently selected NFTs */
  selectedNFTs: SelectedICNFT[];
  /** Callback when selection changes */
  onSelectionChange: (nfts: SelectedICNFT[]) => void;
  /** User's principal for fetching owned NFTs */
  userPrincipal?: Principal;
  /** Callback when the canister ID changes */
  onCanisterChange?: (canisterId: string) => void;
  /** Target chain type for context-aware messaging */
  targetChain?: 'evm' | 'solana' | 'ic';
}

interface OwnedNFT {
  tokenId: string;
  canisterId: string;
  metadata: NFTMetadata | null;
  image?: string;
  name?: string;
  description?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
}

/**
 * Helper function to convert token ID to Solana mint address
 * Returns the base58 address if conversion succeeds, otherwise null
 */
function tryConvertToSolanaMint(tokenId: string): string | null {
  try {
    const tokenIdBigInt = BigInt(tokenId);
    return solanaMintFromTokenId(tokenIdBigInt);
  } catch (error) {
    // Not a valid Solana token ID, return null
    return null;
  }
}

// NFT metadata fetcher component for a single NFT
function NFTDataFetcher({
  canisterId,
  tokenId,
  onMetadataLoaded,
}: {
  canisterId: string;
  tokenId: bigint;
  onMetadataLoaded: (nft: OwnedNFT) => void;
}) {
  const { metadata, loading, error } = useNFTMetadata(canisterId, tokenId);

  useEffect(() => {
    if (metadata && !loading && !error) {
      console.log('🔍 Processing metadata for token', tokenId, 'metadata:', metadata);
      
      // Convert NFTMetadata to OwnedNFT format
      const nft: OwnedNFT = {
        tokenId: tokenId.toString(),
        canisterId,
        metadata,
        name: metadata.parsedMetadata.icrc97.name || `NFT #${tokenId}`,
        description: metadata.parsedMetadata.icrc97.description || undefined,
        image: metadata.parsedMetadata.icrc97.image || undefined,
        attributes: metadata.parsedMetadata.icrc97.attributes || [],
      };
      
      console.log('🎯 Converted NFT object:', nft);
      onMetadataLoaded(nft);
    }
  }, [metadata, loading, error, tokenId, canisterId, onMetadataLoaded]);

  return null; // This component doesn't render anything
}

export function ICNFTSelectionStep({
  sourceCanisterId,
  selectedNFTs,
  onSelectionChange,
  userPrincipal,
  onCanisterChange,
  targetChain = 'evm', // Default to EVM for backward compatibility
}: ICNFTSelectionStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownedNFTs, setOwnedNFTs] = useState<OwnedNFT[]>([]);
  const [fetchedNFTCount, setFetchedNFTCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Canister ID input state
  const [inputCanisterId, setInputCanisterId] = useState(sourceCanisterId || '');
  const [activeCanisterId, setActiveCanisterId] = useState(sourceCanisterId || '');
  const [canisterIdError, setCanisterIdError] = useState<string | null>(null);

  // Helper function to get context-aware messaging
  const getTargetChainLabel = useCallback(() => {
    switch (targetChain) {
      case 'solana':
        return 'Solana';
      case 'ic':
        return 'IC';
      case 'evm':
      default:
        return 'EVM';
    }
  }, [targetChain]);

  const getOperationLabel = useCallback(() => {
    switch (targetChain) {
      case 'solana':
        return 'return';
      case 'ic':
        return 'return';
      case 'evm':
      default:
        return 'export';
    }
  }, [targetChain]);

  // Validate and set canister ID
  const validateAndSetCanisterId = useCallback((canisterId: string) => {
    if (!canisterId.trim()) {
      setCanisterIdError('Canister ID is required');
      return false;
    }

    try {
      // Try to parse as Principal to validate format
      Principal.fromText(canisterId.trim());
      setCanisterIdError(null);
      setActiveCanisterId(canisterId.trim());
      setError(null); // Clear any previous errors
      
      // Notify parent component of canister change
      onCanisterChange?.(canisterId.trim());
      
      return true;
    } catch (err) {
      setCanisterIdError('Invalid canister ID format');
      return false;
    }
  }, [onCanisterChange]);

  // Handle canister ID input change
  const handleCanisterIdChange = useCallback((value: string) => {
    setInputCanisterId(value);
    setCanisterIdError(null);
  }, []);

  // Handle load NFTs button click
  const handleLoadNFTs = useCallback(() => {
    if (validateAndSetCanisterId(inputCanisterId)) {
      // Clear previous results
      setOwnedNFTs([]);
      setFetchedNFTCount(0);
      // The useNFTOwnerOf hook will re-run automatically when activeCanisterId changes
    }
  }, [inputCanisterId, validateAndSetCanisterId]);

  // Create account object for the user
  const userAccount: Account | null = useMemo(() => {
    if (!userPrincipal) return null;
    return {
      owner: userPrincipal.toString(),
      subaccount: undefined, // No subaccount for now
    };
  }, [userPrincipal]);

  // Get owned token IDs using the existing hook - only when we have a valid canister ID
  const shouldFetchTokens = activeCanisterId && 
    activeCanisterId !== '' && 
    activeCanisterId !== 'aaaaa-aa' && 
    userAccount;

  // Memoize the empty function to prevent re-creation on every render
  const emptyOverride = useCallback(async () => [], []);
  
  // Memoize the options object to prevent infinite re-renders
  const nftOptions = useMemo(() => ({
    override: shouldFetchTokens ? undefined : emptyOverride
  }), [shouldFetchTokens, emptyOverride]);
    
  const { tokenIds, loading: tokenIdsLoading, error: tokenIdsError } = useNFTOwnerOf(
    shouldFetchTokens ? activeCanisterId : 'aaaaa-aa', // Safe fallback since we won't use it
    shouldFetchTokens ? userAccount : { owner: 'aaaaa-aa', subaccount: undefined }, // Safe fallback since we won't use it
    nftOptions
  );

  // Track metadata fetching for each token
  useEffect(() => {
    if (tokenIdsError) {
      setError(tokenIdsError.message || 'Failed to fetch owned tokens');
      setLoading(false);
      return;
    }

    if (!tokenIdsLoading && tokenIds.length === 0) {
      // No tokens owned
      setOwnedNFTs([]);
      setLoading(false);
      setFetchedNFTCount(0);
      return;
    }

    if (!tokenIdsLoading && tokenIds.length > 0) {
      // Start metadata fetching
      setLoading(true);
      setError(null);
      setOwnedNFTs([]);
      setFetchedNFTCount(0);
    }
  }, [tokenIds, tokenIdsLoading, tokenIdsError]);

  // Handle when an individual NFT's metadata is loaded
  const handleMetadataLoaded = useCallback((nft: OwnedNFT) => {
    console.log('📥 handleMetadataLoaded called with:', nft);
    
    setOwnedNFTs(prev => {
      // Check if this NFT is already in the list
      const exists = prev.some(existing => 
        existing.tokenId === nft.tokenId && existing.canisterId === nft.canisterId
      );
      if (exists) {
        console.log('⚠️ NFT already exists in list, skipping');
        return prev;
      }
      
      // Add the new NFT and sort by tokenId
      const updated = [...prev, nft].sort((a, b) => 
        parseInt(a.tokenId) - parseInt(b.tokenId)
      );
      console.log('✅ Updated ownedNFTs array:', updated);
      return updated;
    });

    setFetchedNFTCount(prev => {
      const newCount = prev + 1;
      console.log(`📊 Fetched count: ${newCount}/${tokenIds.length}`);
      // If we've fetched all metadata, stop loading
      if (newCount >= tokenIds.length) {
        console.log('🏁 All metadata fetched, stopping loading');
        setLoading(false);
      }
      return newCount;
    });
  }, [tokenIds.length]);

  // Show loading state
  useEffect(() => {
    setLoading(tokenIdsLoading || (tokenIds.length > 0 && fetchedNFTCount < tokenIds.length));
  }, [tokenIdsLoading, tokenIds.length, fetchedNFTCount]);

  // Filter NFTs based on search term
  const filteredNFTs = useMemo(() => {
    if (!searchTerm) return ownedNFTs;
    
    const search = searchTerm.toLowerCase();
    return ownedNFTs.filter(nft => 
      nft.name?.toLowerCase().includes(search) ||
      nft.description?.toLowerCase().includes(search) ||
      nft.tokenId.includes(search) ||
      nft.attributes?.some(attr => 
        attr.trait_type.toLowerCase().includes(search) ||
        attr.value.toLowerCase().includes(search)
      )
    );
  }, [ownedNFTs, searchTerm]);

  // Check if an NFT is selected
  const isSelected = (nft: OwnedNFT) => {
    return selectedNFTs.some(selected => 
      selected.tokenId === nft.tokenId && selected.canisterId === nft.canisterId
    );
  };

  // Toggle NFT selection
  const toggleSelection = (nft: OwnedNFT) => {
    const selectedNFT: SelectedICNFT = {
      tokenId: nft.tokenId,
      canisterId: nft.canisterId,
      metadata: nft.metadata || undefined, // Handle null case
      owner: userPrincipal!,
      image: nft.image,
      name: nft.name,
      description: nft.description,
    };

    if (isSelected(nft)) {
      // Remove from selection
      onSelectionChange(
        selectedNFTs.filter(selected => 
          !(selected.tokenId === nft.tokenId && selected.canisterId === nft.canisterId)
        )
      );
    } else {
      // Add to selection
      onSelectionChange([...selectedNFTs, selectedNFT]);
    }
  };

  // Select all filtered NFTs
  const selectAll = () => {
    const newSelections = filteredNFTs
      .filter(nft => !isSelected(nft))
      .map(nft => ({
        tokenId: nft.tokenId,
        canisterId: nft.canisterId,
        metadata: nft.metadata || undefined, // Handle null case
        owner: userPrincipal!,
        image: nft.image,
        name: nft.name,
        description: nft.description,
      }));
    
    onSelectionChange([...selectedNFTs, ...newSelections]);
  };

  // Clear all selections
  const clearAll = () => {
    onSelectionChange([]);
  };

  if (!userPrincipal) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Identity</h3>
        <p className="text-gray-600">
          Please connect your Internet Identity to view and select your ckNFTs for export.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Render NFTDataFetcher components for each owned token */}
      {!tokenIdsLoading && tokenIds.length > 0 && activeCanisterId && (
        <>
          {tokenIds.map((tokenId) => (
            <NFTDataFetcher
              key={`${activeCanisterId}-${tokenId}`}
              canisterId={activeCanisterId}
              tokenId={tokenId}
              onMetadataLoaded={handleMetadataLoaded}
            />
          ))}
        </>
      )}

      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Select NFTs to Export</h3>
        <p className="text-gray-600">
          Choose the ckNFTs you want to export back to EVM blockchain. 
          Enter the canister ID of the NFT collection you want to check.
        </p>
      </div>

      {/* Canister ID Input */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="space-y-4">
          <div>
            <label htmlFor="canister-id" className="block text-sm font-medium text-gray-700 mb-2">
              NFT Collection Canister ID
            </label>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  id="canister-id"
                  type="text"
                  value={inputCanisterId}
                  onChange={(e) => handleCanisterIdChange(e.target.value)}
                  placeholder="e.g., umunu-kh777-77774-qaaca-cai"
                  className={clsx(
                    'w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                    canisterIdError
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300'
                  )}
                />
                {canisterIdError && (
                  <p className="mt-1 text-sm text-red-600">{canisterIdError}</p>
                )}
              </div>
              <button
                onClick={handleLoadNFTs}
                disabled={!inputCanisterId.trim() || loading}
                className={clsx(
                  'px-6 py-2 text-sm font-medium rounded-md transition-colors',
                  !inputCanisterId.trim() || loading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                )}
              >
                {loading ? 'Loading...' : 'Load NFTs'}
              </button>
            </div>
          </div>
          
          {activeCanisterId && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Currently viewing:</span>
              <code className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
                {activeCanisterId}
              </code>
              <button
                onClick={() => {
                  setActiveCanisterId('');
                  setOwnedNFTs([]);
                  setError(null);
                }}
                className="text-blue-600 hover:text-blue-700 ml-2"
              >
                Change Collection
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Show loading state */}
      {tokenIdsLoading && activeCanisterId && (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Your NFTs</h3>
          <p className="text-gray-600">Fetching your ckNFTs from {activeCanisterId}...</p>
        </div>
      )}

      {/* Show error state */}
      {error && activeCanisterId && (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading NFTs</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-2">
            <button
              onClick={handleLoadNFTs}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => {
                setActiveCanisterId('');
                setError(null);
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Try Different Collection
            </button>
          </div>
        </div>
      )}

      {/* Show no NFTs found */}
      {!loading && !tokenIdsLoading && activeCanisterId && tokenIds.length === 0 && !error && (
        <div className="text-center py-8">
          <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No NFTs Found</h3>
          <p className="text-gray-600">
            No ckNFTs found in canister {activeCanisterId}
          </p>
          <button
            onClick={() => {
              setActiveCanisterId('');
              setInputCanisterId('');
            }}
            className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
          >
            Try Different Collection
          </button>
        </div>
      )}

      {/* Show results section when we have token IDs (even if metadata is still loading) */}
      {!tokenIdsLoading && activeCanisterId && tokenIds.length > 0 && !error && (
        <>
          {/* Loading progress indicator for metadata */}
          {(loading || fetchedNFTCount < tokenIds.length) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin mr-3" />
                  <div>
                    <p className="font-medium text-blue-800">Loading NFT metadata...</p>
                    <p className="text-sm text-blue-600">
                      {fetchedNFTCount} of {tokenIds.length} NFTs loaded
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-32 bg-blue-200 rounded-full h-2">
                    <div 
                      className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${(fetchedNFTCount / tokenIds.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search and Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search NFTs by name, description, or attributes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Bulk Actions */}
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                disabled={filteredNFTs.every(nft => isSelected(nft))}
                className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Select All
              </button>
              <button
                onClick={clearAll}
                disabled={selectedNFTs.length === 0}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Selection Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-800">
                  {selectedNFTs.length} NFT{selectedNFTs.length !== 1 ? 's' : ''} selected
                </p>
                <p className="text-sm text-blue-600">
                  {filteredNFTs.length} NFT{filteredNFTs.length !== 1 ? 's' : ''} available
                </p>
              </div>
              {selectedNFTs.length > 0 && (
                <div className="text-right">
                  <p className="text-sm text-blue-600">
                    Ready for {getOperationLabel()} to {getTargetChainLabel()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* NFT Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredNFTs.map((nft) => (
              <NFTCard
                key={`${nft.canisterId}-${nft.tokenId}`}
                nft={nft}
                selected={isSelected(nft)}
                onToggle={() => toggleSelection(nft)}
                operationLabel={getOperationLabel()}
              />
            ))}
          </div>

          {/* No results */}
          {filteredNFTs.length === 0 && searchTerm && (
            <div className="text-center py-8">
              <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No NFTs match your search criteria</p>
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
              >
                Clear search
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// NFT Card Component
function NFTCard({
  nft,
  selected,
  onToggle,
  operationLabel,
}: {
  nft: OwnedNFT;
  selected: boolean;
  onToggle: () => void;
  operationLabel: string;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={clsx(
          'w-full p-3 border rounded-lg text-left transition-all cursor-pointer',
          selected 
            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
            : 'border-gray-200 hover:border-gray-300'
        )}
      >
        {/* Image */}
        {nft.image && !imageError ? (
          <img 
            src={nft.image} 
            alt={nft.name || `NFT #${nft.tokenId}`}
            className="w-full h-32 object-cover rounded-md mb-2"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-32 bg-gray-100 rounded-md mb-2 flex items-center justify-center">
            <Image className="w-8 h-8 text-gray-400" />
          </div>
        )}
        
        <p className="font-medium text-sm truncate">{nft.name || `NFT #${nft.tokenId}`}</p>
        
        {/* Try to display as Solana mint address, fallback to token ID */}
        {(() => {
          const mintAddress = tryConvertToSolanaMint(nft.tokenId);
          if (mintAddress) {
            return (
              <p className="text-xs text-gray-600 font-mono truncate" title={mintAddress}>
                {mintAddress.slice(0, 4)}...{mintAddress.slice(-4)}
              </p>
            );
          } else {
            return <p className="text-xs text-gray-600">#{nft.tokenId}</p>;
          }
        })()}
        
        {nft.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{nft.description}</p>
        )}

        {/* Attributes */}
        {nft.attributes && nft.attributes.length > 0 && (
          <div className="mt-2 space-y-1">
            {nft.attributes.slice(0, 2).map((attr, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="text-gray-500 truncate">{attr.trait_type}</span>
                <span className="text-gray-700 font-medium truncate ml-1">{attr.value}</span>
              </div>
            ))}
            {nft.attributes.length > 2 && (
              <p className="text-xs text-gray-500">
                +{nft.attributes.length - 2} more
              </p>
            )}
          </div>
        )}
        
        {selected && (
          <div className="mt-2 text-xs font-medium text-blue-600">✓ Selected for {operationLabel}</div>
        )}
      </button>
    </div>
  );
}

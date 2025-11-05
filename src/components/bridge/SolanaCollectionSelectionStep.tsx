import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Search, Loader2, AlertCircle, CheckCircle2, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { Connection } from '@solana/web3.js';
import { useSolana } from '../../hooks/useSolana';
import { useAuth } from '../../hooks/useAuth';
import { useAnonymousActor } from '../../hooks/useActor';
import {
  fetchCollectionsWithNFTs,
  discoverNFTsAtApprovalAddress,
  type SolanaNFTCollection,
  type SolanaNFT,
} from '../../services/solanaNFTDiscoveryDirect';
import { idlFactory as orchestratorIdlFactory } from '../../declarations/orchestrator/orchestrator.did.js';
import type { _SERVICE as OrchestratorService } from '../../declarations/orchestrator/orchestrator.did';

/**
 * SelectedSolanaCollection Interface
 * 
 * Represents a Solana NFT collection selected for bridging.
 * One ckNFT canister = one Solana collection (1:1 relationship).
 * 
 * Wraps the full SolanaNFTCollection object to pass to subsequent steps.
 */
export interface SelectedSolanaCollection {
  /** The full collection object with metadata and NFTs */
  collection: SolanaNFTCollection;
}

export interface SolanaCollectionSelectionStepProps {
  /** Currently selected collection (only one allowed) */
  selectedCollection: SelectedSolanaCollection | null;
  /** Callback when collection selection changes */
  onCollectionChange: (collection: SelectedSolanaCollection | null) => void;
  /** Optional: Trigger for external refresh (increment to force refresh) */
  refreshTrigger?: number;
}

/**
 * SolanaCollectionSelectionStep Component
 * 
 * Step 2 of the Solana import wizard.
 * Allows users to select ONE collection to bridge.
 * 
 * Architecture:
 * - One ckNFT canister per collection (1:1 relationship)
 * - User selects collection first, then NFTs from that collection in later step
 * - Shows all collections user owns with NFT counts
 * - Displays collection metadata (name, symbol, image, verification)
 * 
 * Features:
 * - Collection discovery from user's wallet
 * - Search/filter by collection name
 * - Visual collection cards with preview
 * - Shows NFT count per collection
 * - Verified badge for verified collections
 * - Loading and error states
 */
export function SolanaCollectionSelectionStep({
  selectedCollection,
  onCollectionChange,
  refreshTrigger,
}: SolanaCollectionSelectionStepProps) {
  const {
    publicKey,
    connected,
    cluster,
    actualRpcEndpoint,
  } = useSolana();

  // Discovery state
  const [collections, setCollections] = useState<SolanaNFTCollection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Recovery state
  const [stuckNFTs, setStuckNFTs] = useState<Array<SolanaNFT & { approvalAddress: string; mintRequestId?: bigint }>>([]);
  const [isLoadingStuckNFTs, setIsLoadingStuckNFTs] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  
  // Manual collection entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCollectionAddress, setManualCollectionAddress] = useState('');
  
  // Hooks for recovery
  const { user } = useAuth();
  const orchestratorCanisterId = import.meta.env.VITE_ICRC99_ORCHESTRATOR_CANISTER_ID || '';
  const orchestratorActor = useAnonymousActor<OrchestratorService>(
    orchestratorCanisterId,
    orchestratorIdlFactory
  );

  // Function to fetch collections (can be called manually to refresh)
  const fetchCollections = async () => {
    if (!connected || !publicKey) {
      setCollections([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchCollectionsWithNFTs(
        publicKey,
        actualRpcEndpoint || cluster,
        {
          includeOffChainMetadata: true,
          maxNFTs: 1000,
        }
      );

      console.log('[SolanaCollectionSelection] Discovered collections:', result.collections);
      setCollections(result.collections);

      if (result.collections.length === 0) {
        setError('No NFT collections found in your wallet');
      }
    } catch (err) {
      console.error('[SolanaCollectionSelection] Error fetching collections:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch collections');
      setCollections([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch collections when wallet connects
  useEffect(() => {
    fetchCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey, cluster, actualRpcEndpoint]);

  // Refresh when external trigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      console.log('[SolanaCollectionSelection] External refresh triggered');
      fetchCollections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Filter collections by search query
  const filteredCollections = collections.filter((collection) =>
    collection.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle collection selection
  const handleSelectCollection = (collection: SolanaNFTCollection) => {
    const selected: SelectedSolanaCollection = {
      collection: collection,
    };

    onCollectionChange(selected);
  };
  
  // Handle manual collection entry
  const handleManualCollectionSubmit = async () => {
    if (!manualCollectionAddress.trim()) {
      return;
    }
    
    const mintAddress = manualCollectionAddress.trim();
    
    // Validate it looks like a Solana address
    if (mintAddress.length < 32 || mintAddress.length > 44) {
      setError('Invalid Solana mint address format');
      return;
    }
    
    setIsLoadingStuckNFTs(true);
    
    try {
      const rpcEndpoint = actualRpcEndpoint || cluster;
      const connection = new Connection(rpcEndpoint, 'confirmed');
      
      console.log('[Manual Entry] Checking stuck NFT:', mintAddress);
      
      // Import the NFT discovery functions
      const { fetchNFTByMint } = await import('../../services/solanaNFTDiscoveryDirect');
      
      // Fetch the NFT metadata to get collection address
      const nftMetadata = await fetchNFTByMint(mintAddress, rpcEndpoint);
      
      if (!nftMetadata) {
        setError('Could not find NFT metadata for this mint address');
        setIsLoadingStuckNFTs(false);
        return;
      }
      
      const collectionAddress = nftMetadata.collectionAddress;
      if (!collectionAddress) {
        setError('NFT does not have a collection address');
        setIsLoadingStuckNFTs(false);
        return;
      }
      
      console.log('[Manual Entry] NFT collection:', collectionAddress);
      
      // Now check if this specific NFT is at its approval address
      if (!publicKey || !orchestratorActor || !user?.principal) {
        setError('Wallet or authentication not ready');
        setIsLoadingStuckNFTs(false);
        return;
      }
      
      // Import the recovery function
      const { checkNFTAtApprovalAddress } = await import('../../services/solanaNFTDiscoveryDirect');
      
      console.log('[Manual Entry] Checking with cluster:', cluster);
      
      // Check if THIS specific NFT is stuck
      const stuckNFT = await checkNFTAtApprovalAddress(
        mintAddress,
        connection,
        orchestratorActor,
        user.principal,
        collectionAddress,
        cluster // Pass the actual cluster from wallet
      );
      
      if (!stuckNFT) {
        setError(`NFT ${mintAddress.slice(0, 8)}... is not at the approval address. It may be in your wallet or already minted.`);
        setIsLoadingStuckNFTs(false);
        return;
      }
      
      console.log(`[Manual Entry] ✓ Found stuck NFT:`, stuckNFT);
      
      // Create a synthetic collection with this NFT
      const syntheticCollection: SolanaNFTCollection = {
        address: collectionAddress,
        name: nftMetadata.collectionName || 'Recovered Collection',
        symbol: '',
        verified: false,
        nftCount: 1,
        nfts: [stuckNFT], // Just this one NFT for now
      };
      
      handleSelectCollection(syntheticCollection);
      setShowManualEntry(false);
      setManualCollectionAddress('');
    } catch (err) {
      console.error('[Manual Entry] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to check stuck NFT');
    } finally {
      setIsLoadingStuckNFTs(false);
    }
  };
  
  // Detect stuck NFTs for recovery
  const detectStuckNFTsForRecovery = async () => {
    if (!publicKey || !orchestratorActor || !user?.principal) {
      console.log('[Recovery] Cannot detect - missing requirements');
      return;
    }
    
    setIsLoadingStuckNFTs(true);
    setShowRecovery(true);
    
    try {
      const rpcEndpoint = actualRpcEndpoint || cluster;
      const connection = new Connection(rpcEndpoint, 'confirmed');
      
      console.log('[Recovery] Discovering NFTs at approval address...');
      console.log('[Recovery] Using cluster:', cluster);
      
      // Use the new discovery function that queries the approval address directly
      // instead of relying on cache
      const stuck = await discoverNFTsAtApprovalAddress(
        publicKey,
        connection,
        orchestratorActor,
        user.principal,
        undefined, // Don't filter by collection - get all stuck NFTs
        cluster // Pass the actual cluster from wallet
      );
      
      console.log(`[Recovery] Found ${stuck.length} stuck NFTs at approval address`, stuck);
      setStuckNFTs(stuck);
      
      if (stuck.length === 0) {
        setError('No stuck NFTs found at approval address. All your NFTs are either in your wallet or already minted.');
      }
    } catch (err) {
      console.error('[Recovery] Error detecting stuck NFTs:', err);
      setError(err instanceof Error ? err.message : 'Failed to detect stuck NFTs');
    } finally {
      setIsLoadingStuckNFTs(false);
    }
  };

  // Render states
  if (!connected) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
          <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Wallet Not Connected</h3>
        <p className="text-gray-600">Please connect your Solana wallet in Step 1 to view your collections</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Discovering Collections</h3>
        <p className="text-gray-600">Scanning your wallet for NFT collections...</p>
      </div>
    );
  }

  // Don't block on "No NFT collections found" error - still show recovery/manual entry options
  const isBlockingError = error && error !== 'No NFT collections found in your wallet';
  
  // If there's a blocking error (not just "no collections"), show error screen
  if (isBlockingError) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Collections</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Select NFT Collection</h3>
          <p className="text-gray-600 mt-1">
            Choose which collection to bridge. Each collection gets its own ckNFT canister on Internet Computer.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={detectStuckNFTsForRecovery}
            disabled={isLoadingStuckNFTs || !user?.principal}
            className="flex items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-amber-200"
            title="Check for NFTs stuck in previous transfer attempts"
          >
            <AlertTriangle className={clsx("w-4 h-4", isLoadingStuckNFTs && "animate-pulse")} />
            {isLoadingStuckNFTs ? 'Checking...' : 'Check for Stuck NFTs'}
          </button>
          <button
            onClick={fetchCollections}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh NFT list"
          >
            <svg
              className={clsx("w-4 h-4", isLoading && "animate-spin")}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {collections.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search collections..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      )}
      
      {/* Manual NFT Mint Entry for Recovery */}
      {!showManualEntry && (
        <button
          onClick={() => setShowManualEntry(true)}
          className="w-full py-3 px-4 border-2 border-dashed border-amber-300 rounded-lg text-amber-700 hover:border-amber-400 hover:text-amber-800 transition-colors flex items-center justify-center gap-2"
        >
          <AlertTriangle className="w-5 h-5" />
          Enter Stuck NFT Mint Address
        </button>
      )}
      
      {showManualEntry && (
        <div className="border-2 border-amber-200 rounded-lg p-4 bg-amber-50">
          <h4 className="font-medium text-amber-900 mb-2">Recover Stuck NFT</h4>
          <p className="text-sm text-amber-700 mb-3">
            Enter the mint address of an NFT that was transferred but not minted. We'll check if it's at your approval address and can be recovered.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NFT Mint Address (Required)
              </label>
              <input
                type="text"
                value={manualCollectionAddress}
                onChange={(e) => setManualCollectionAddress(e.target.value)}
                placeholder="e.g., AFKq1qdnmWevju6k6n9QdgWvy5K1ELuXy2bQagm1Sjbu"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                This is the unique address of the specific NFT, not the collection
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleManualCollectionSubmit}
                disabled={!manualCollectionAddress.trim() || isLoadingStuckNFTs}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoadingStuckNFTs ? 'Checking...' : 'Check if Stuck & Recover'}
              </button>
              <button
                onClick={() => {
                  setShowManualEntry(false);
                  setManualCollectionAddress('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Stuck NFTs Recovery Section */}
      {showRecovery && stuckNFTs.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-amber-900 text-lg mb-2">
                🔧 Recovery Mode: Stuck NFTs Found ({stuckNFTs.length})
              </h4>
              <p className="text-sm text-amber-700 mb-4">
                These NFTs were previously transferred to the bridge but minting wasn't completed. 
                Select a collection below to resume the minting process.
              </p>
              
              {/* Group stuck NFTs by collection */}
              {Object.entries(
                stuckNFTs.reduce((acc, nft) => {
                  const collection = nft.collectionAddress || 'Unknown Collection';
                  if (!acc[collection]) acc[collection] = [];
                  acc[collection].push(nft);
                  return acc;
                }, {} as Record<string, typeof stuckNFTs>)
              ).map(([collectionAddr, nfts]) => (
                <div key={collectionAddr} className="bg-white rounded-lg p-4 mb-3 last:mb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {nfts[0]?.collectionName || 'Unknown Collection'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {nfts.length} stuck NFT{nfts.length !== 1 ? 's' : ''} ready to mint
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-1">
                        {collectionAddr.slice(0, 8)}...{collectionAddr.slice(-8)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        // Create a synthetic collection for these stuck NFTs
                        const syntheticCollection: SolanaNFTCollection = {
                          address: collectionAddr,
                          name: nfts[0]?.collectionName || 'Unknown Collection',
                          symbol: nfts[0]?.symbol || '',
                          image: nfts[0]?.image,
                          verified: nfts[0]?.verified || false,
                          nftCount: nfts.length,
                          nfts: nfts,
                        };
                        handleSelectCollection(syntheticCollection);
                      }}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Resume {nfts.length} NFT{nfts.length !== 1 ? 's' : ''}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Collections Grid */}
      {filteredCollections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCollections.map((collection) => {
                  const isSelected = selectedCollection?.collection.address === collection.address;            return (
              <button
                key={collection.address}
                onClick={() => handleSelectCollection(collection)}
                className={clsx(
                  'relative p-4 rounded-lg border-2 text-left transition-all hover:shadow-md',
                  isSelected
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                )}
              >
                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="w-6 h-6 text-purple-600" />
                  </div>
                )}

                {/* Collection Image */}
                <div className="w-full aspect-square rounded-lg bg-gray-100 mb-3 overflow-hidden">
                  {collection.image ? (
                    <img
                      src={collection.image}
                      alt={collection.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.classList.add('flex', 'items-center', 'justify-center');
                        target.parentElement!.innerHTML = '<div class="text-gray-400"><svg class="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/></svg></div>';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ImageIcon className="w-12 h-12" />
                    </div>
                  )}
                </div>

                {/* Collection Info */}
                <div>
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-medium text-gray-900 truncate pr-2">{collection.name}</h4>
                    {collection.verified && (
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {collection.symbol && (
                    <p className="text-sm text-gray-600 mb-2">{collection.symbol}</p>
                  )}

                  {/* Collection Address */}
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 font-mono truncate" title={collection.address}>
                      {collection.address}
                    </p>
                  </div>

                  <div className="flex items-center text-sm text-gray-500">
                    <span>{collection.nfts.length} NFT{collection.nfts.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : collections.length > 0 ? (
        // No results from search
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Collections Found</h3>
          <p className="text-gray-600">No collections match "{searchQuery}"</p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
          >
            Clear Search
          </button>
        </div>
      ) : (
        // No collections at all
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <ImageIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Collections Found</h3>
          <p className="text-gray-600 mb-4">
            Your wallet doesn't contain any NFT collections on {cluster}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto text-left">
            <p className="text-sm font-medium text-blue-900 mb-2">💡 What you can do:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Click <strong>"Check for Stuck NFTs"</strong> above to find NFTs from incomplete transfers</li>
              <li>• Click <strong>"Enter Collection Address Manually"</strong> to add a collection by its mint address</li>
              <li>• Verify you're on the correct network ({cluster})</li>
            </ul>
          </div>
        </div>
      )}

      {/* Selected Collection Summary */}
      {selectedCollection && (
        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h4 className="font-medium text-purple-900 mb-2">Selected Collection</h4>
          <div className="flex items-center space-x-3">
            {selectedCollection.collection.image && (
              <img
                src={selectedCollection.collection.image}
                alt={selectedCollection.collection.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
            <div>
              <p className="font-medium text-gray-900">{selectedCollection.collection.name}</p>
              <p className="text-xs text-gray-500 font-mono mb-1" title={selectedCollection.collection.address}>
                {selectedCollection.collection.address}
              </p>
              <p className="text-sm text-gray-600">
                {selectedCollection.collection.nfts.length} NFT{selectedCollection.collection.nfts.length !== 1 ? 's' : ''}
                {selectedCollection.collection.verified && ' • Verified'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

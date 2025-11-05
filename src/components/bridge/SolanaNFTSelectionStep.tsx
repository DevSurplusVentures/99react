import { useState, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import { Search, Plus, AlertCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Connection } from '@solana/web3.js';
import { useSolana } from '../../hooks/useSolana';
import { useAuth } from '../../hooks/useAuth';
import { useAnonymousActor } from '../../hooks/useActor';
import type { SolanaCluster } from '../../types/solana';
import type { SelectedSolanaCollection } from './SolanaCollectionSelectionStep';
import {
  fetchNFTByMint,
  isValidMintAddress,
  addToLocalStorageMintCache,
  discoverCollectionNFTsComprehensive,
  type SolanaNFT,
} from '../../services/solanaNFTDiscoveryDirect';
import { idlFactory as orchestratorIdlFactory } from '../../declarations/orchestrator/orchestrator.did.js';
import type { _SERVICE as OrchestratorService } from '../../declarations/orchestrator/orchestrator.did';

/**
 * SelectedSolanaNFT Interface
 * 
 * Represents a Solana NFT that has been selected for bridging.
 * Mirrors the EVM SelectedNFT interface pattern.
 */
export interface SelectedSolanaNFT {
  /** The NFT's mint address (unique identifier) */
  mintAddress: string;
  /** NFT name from metadata */
  name: string;
  /** NFT symbol from metadata */
  symbol?: string;
  /** URI to NFT image */
  image?: string;
  /** Collection this NFT belongs to (if any) */
  collection?: {
    address: string;
    name: string;
    verified: boolean;
  };
  /** Full metadata object */
  metadata?: SolanaNFT;
  /** How this NFT was added to selection */
  source: 'discovered' | 'manual';
  /** Current ownership state */
  ownershipState: 'owned' | 'bridged' | 'ready-to-mint' | 'already-minted';
}

export interface SolanaNFTSelectionStepProps {
  /** The collection to show NFTs from (required - set in previous step) */
  selectedCollection: SelectedSolanaCollection;
  /** Selected NFTs state (from this collection only) */
  selectedNFTs: SelectedSolanaNFT[];
  /** Callback when selection changes */
  onSelectionChange: (nfts: SelectedSolanaNFT[]) => void;
  /** Wizard mode: 'import' (Solana→IC) or 'burn' (Solana burn→IC remint) */
  mode: 'import' | 'burn';
  /** Optional: Target IC canister for ownership checking */
  targetCanister?: string;
}

/**
 * SolanaNFTSelectionStep Component
 * 
 * Step 4 of the Solana import/burn wizard (after collection selection).
 * Allows users to select specific NFTs from the chosen collection for bridging.
 * 
 * Architecture:
 * - Collection is already selected in Step 2
 * - This step only shows NFTs from THAT collection
 * - No collection grouping UI (single collection context)
 * - Multi-select for NFTs within the collection
 * 
 * Features:
 * - Shows NFTs from selected collection only
 * - Multi-select with checkboxes
 * - Manual mint address entry for recovery/advanced use
 * - Search and filtering
 * - Ownership state tracking (owned/bridged/ready-to-mint/already-minted)
 * - Responsive grid layout (2/3/4 columns)
 * - Loading, error, and empty states
 */
export function SolanaNFTSelectionStep({
  selectedCollection,
  selectedNFTs,
  onSelectionChange,
  mode,
  targetCanister: _targetCanister, // TODO: Use for ownership checking
}: SolanaNFTSelectionStepProps) {
  const {
    publicKey,
    connected,
    cluster,
    actualRpcEndpoint,
  } = useSolana();

  // NFTs from the selected collection
  const collectionNFTs = useMemo(() => {
    const nfts = selectedCollection.collection.nfts;
    console.log('[SolanaNFTSelection] Collection NFTs:', {
      collectionAddress: selectedCollection.collection.address,
      collectionName: selectedCollection.collection.name,
      nftCount: nfts.length,
      nfts: nfts,
    });
    return nfts;
  }, [selectedCollection]);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Manual entry state
  const [manualMintAddress, setManualMintAddress] = useState('');
  const [isLoadingManual, setIsLoadingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Stuck NFT recovery state
  const [stuckNFTs, setStuckNFTs] = useState<Array<SolanaNFT & { approvalAddress: string; mintRequestId?: bigint }>>([]);
  const [isLoadingStuckNFTs, setIsLoadingStuckNFTs] = useState(false);

  // Hooks for recovery detection
  const { user } = useAuth();
  const orchestratorCanisterId = import.meta.env.VITE_ICRC99_ORCHESTRATOR_CANISTER_ID || '';
  const orchestratorActor = useAnonymousActor<OrchestratorService>(
    orchestratorCanisterId,
    orchestratorIdlFactory
  );

  // Detect stuck NFTs on mount (only once per collection)
  // Also handles comprehensive discovery for manual collections
  useEffect(() => {
    const discoverNFTs = async () => {
      if (!publicKey || !orchestratorActor || !user?.principal || (!actualRpcEndpoint && !cluster)) {
        return;
      }

      setIsLoadingStuckNFTs(true);
      try {
        const rpcEndpoint = actualRpcEndpoint || (cluster as SolanaCluster);
        const connection = new Connection(rpcEndpoint, 'confirmed');

        console.log('[SolanaNFTSelection] Running comprehensive discovery...', {
          userWallet: publicKey.toBase58(),
          collectionAddress: selectedCollection.collection.address,
        });

        // Use comprehensive discovery that:
        // 1. Checks ckNFT canister exists
        // 2. Queries user wallet
        // 3. Queries approval address
        // 4. Checks for already-minted NFTs
        const result = await discoverCollectionNFTsComprehensive(
          publicKey,
          connection,
          orchestratorActor,
          user.principal,
          selectedCollection.collection.address,
          { Solana: [{ Devnet: null }] } // TODO: Make dynamic based on cluster
        );

        console.log('[SolanaNFTSelection] Discovery result:', result);
        
        // Update stuck NFTs from approval address
        setStuckNFTs(result.nftsAtApproval);
        
        // If this is a manual collection (0 NFTs), populate it with discovered NFTs
        if (selectedCollection.collection.nfts.length === 0) {
          // Combine wallet + approval NFTs (avoiding duplicates)
          const allNFTs = [...result.nftsInWallet];
          
          // Add approval NFTs that aren't already in wallet
          for (const approvalNFT of result.nftsAtApproval) {
            if (!allNFTs.some(nft => nft.mintAddress === approvalNFT.mintAddress)) {
              allNFTs.push(approvalNFT);
            }
          }
          
          // Update the collection with discovered NFTs
          // This is a bit of a hack - we're mutating the collection object
          // A better approach would be to lift this state up or use a callback
          selectedCollection.collection.nfts = allNFTs;
          selectedCollection.collection.nftCount = allNFTs.length;
          
          console.log(`[SolanaNFTSelection] Populated manual collection with ${allNFTs.length} NFTs`);
        }
      } catch (error) {
        console.error('[SolanaNFTSelection] Error in comprehensive discovery:', error);
      } finally {
        setIsLoadingStuckNFTs(false);
      }
    };

    discoverNFTs();
    // Note: orchestratorActor intentionally excluded from deps to prevent infinite loop
    // It's a stable reference from useAnonymousActor hook
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, user?.principal, actualRpcEndpoint, cluster, selectedCollection.collection.address]);

  // Filter NFTs by search query
  const filteredNFTs = useMemo(() => {
    if (!searchQuery.trim()) {
      console.log('[SolanaNFTSelection] No search query, returning all collection NFTs:', collectionNFTs.length);
      return collectionNFTs;
    }

    const query = searchQuery.toLowerCase();
    const filtered = collectionNFTs.filter(nft =>
      nft.name?.toLowerCase().includes(query) ||
      nft.mintAddress.toLowerCase().includes(query) ||
      nft.symbol?.toLowerCase().includes(query)
    );
    console.log('[SolanaNFTSelection] Filtered NFTs:', {
      query,
      totalNFTs: collectionNFTs.length,
      filteredCount: filtered.length,
    });
    return filtered;
  }, [collectionNFTs, searchQuery]);

  // Debug rendering
  console.log('[SolanaNFTSelection] Component rendering:', {
    collectionNFTsLength: collectionNFTs.length,
    filteredNFTsLength: filteredNFTs.length,
    showingEmptyState: collectionNFTs.length === 0,
    showingGrid: filteredNFTs.length > 0,
  });

  /**
   * Toggle NFT selection
   */
  const handleToggleNFT = (nft: SolanaNFT) => {
    const mintAddress = nft.mintAddress;
    const isSelected = selectedNFTs.some(n => n.mintAddress === mintAddress);

    if (isSelected) {
      // Deselect
      onSelectionChange(selectedNFTs.filter(n => n.mintAddress !== mintAddress));
    } else {
      // Select - convert to SelectedSolanaNFT
      const selectedNFT: SelectedSolanaNFT = {
        mintAddress,
        name: nft.name || 'Unnamed NFT',
        symbol: nft.symbol,
        image: nft.image,
        collection: nft.collectionAddress ? {
          address: nft.collectionAddress,
          name: nft.collectionName || 'Unknown Collection',
          verified: nft.verified || false,
        } : undefined,
        metadata: nft,
        source: 'discovered',
        ownershipState: 'owned', // TODO: Check IC ownership state
      };
      
      // Cache mint address and collection for recovery detection
      addToLocalStorageMintCache(mintAddress, nft.collectionAddress || selectedCollection.collection.address);
      
      onSelectionChange([...selectedNFTs, selectedNFT]);
    }
  };

  /**
   * Toggle stuck NFT selection (for recovery)
   */
  const handleToggleStuckNFT = (nft: SolanaNFT & { approvalAddress: string; mintRequestId?: bigint }) => {
    const mintAddress = nft.mintAddress;
    const isSelected = selectedNFTs.some(n => n.mintAddress === mintAddress);

    if (isSelected) {
      // Deselect
      onSelectionChange(selectedNFTs.filter(n => n.mintAddress !== mintAddress));
    } else {
      // Select - convert to SelectedSolanaNFT with ready-to-mint state
      const selectedNFT: SelectedSolanaNFT = {
        mintAddress,
        name: nft.name || 'Unnamed NFT',
        symbol: nft.symbol,
        image: nft.image,
        collection: nft.collectionAddress ? {
          address: nft.collectionAddress,
          name: nft.collectionName || 'Unknown Collection',
          verified: nft.verified || false,
        } : undefined,
        metadata: {
          ...nft,
          // Add recovery-specific metadata
          approvalAddress: nft.approvalAddress,
          mintRequestId: nft.mintRequestId,
        } as any,
        source: 'discovered',
        ownershipState: 'ready-to-mint', // Mark as ready to resume
      };
      
      onSelectionChange([...selectedNFTs, selectedNFT]);
    }
  };

  /**
   * Handle manual mint address submission
   */
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualRpcEndpoint && !cluster || !manualMintAddress.trim()) return;

    // Check if already selected
    if (selectedNFTs.some(n => n.mintAddress === manualMintAddress.trim())) {
      setManualError('This NFT is already selected');
      return;
    }

    // Validate mint address
    if (!isValidMintAddress(manualMintAddress.trim())) {
      setManualError('Invalid Solana mint address');
      return;
    }

    setIsLoadingManual(true);
    setManualError(null);

    try {
      const rpcEndpoint = actualRpcEndpoint || (cluster as SolanaCluster);
      const nft = await fetchNFTByMint(manualMintAddress.trim(), rpcEndpoint);

      if (!nft) {
        setManualError('NFT not found or invalid metadata');
        return;
      }

      // Add to selection
      const selectedNFT: SelectedSolanaNFT = {
        mintAddress: nft.mintAddress,
        name: nft.name || 'Unnamed NFT',
        symbol: nft.symbol,
        image: nft.image,
        collection: nft.collectionAddress ? {
          address: nft.collectionAddress,
          name: nft.collectionName || 'Unknown Collection',
          verified: nft.verified || false,
        } : undefined,
        metadata: nft,
        source: 'manual',
        ownershipState: 'owned', // TODO: Verify ownership
      };

      // Cache mint address and collection for recovery detection
      addToLocalStorageMintCache(nft.mintAddress, nft.collectionAddress || selectedCollection.collection.address);
      
      onSelectionChange([...selectedNFTs, selectedNFT]);
      setManualMintAddress('');
      setShowManualEntry(false);

    } catch (error) {
      console.error('[SolanaNFTSelectionStep] Manual entry error:', error);
      setManualError(
        error instanceof Error 
          ? error.message 
          : 'Failed to fetch NFT metadata'
      );
    } finally {
      setIsLoadingManual(false);
    }
  };

  // Not connected state
  if (!connected || !publicKey) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">◎</div>
        <p className="text-gray-600 mb-4">Please connect your wallet first</p>
        <p className="text-sm text-gray-500">
          Go back to Step 1 to connect your Solana wallet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Select NFTs to {mode === 'import' ? 'Import' : 'Burn'}
        </h3>
        <p className="text-gray-600">
          {mode === 'import' 
            ? 'Choose which NFTs to bridge from Solana to Internet Computer'
            : 'Select NFTs to burn on Solana and remint on Internet Computer'
          }
        </p>
      </div>

      {/* Selection Summary */}
      {selectedNFTs.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span className="font-medium text-blue-900">
                {selectedNFTs.length} NFT{selectedNFTs.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <button
              onClick={() => onSelectionChange([])}
              className="text-sm text-blue-700 hover:text-blue-900 underline"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, symbol, or mint address..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Manual Entry Toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowManualEntry(!showManualEntry)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add by Mint Address
        </button>
      </div>

      {/* Manual Entry Form */}
      {showManualEntry && (
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-3">Add NFT Manually</h4>
          <p className="text-sm text-gray-600 mb-4">
            Enter a Solana NFT mint address to add it to your selection. Useful for recovering
            NFTs that aren't automatically discovered.
          </p>
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div>
              <input
                type="text"
                value={manualMintAddress}
                onChange={(e) => {
                  setManualMintAddress(e.target.value);
                  setManualError(null);
                }}
                placeholder="e.g., 6NS2gnVrBoV44sWGCeSnzHhuf7Fv4sMLh5uEVjTEVvV4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                disabled={isLoadingManual}
              />
              {manualError && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {manualError}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoadingManual || !manualMintAddress.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isLoadingManual && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoadingManual ? 'Loading...' : 'Add NFT'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowManualEntry(false);
                  setManualMintAddress('');
                  setManualError(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Collection Header */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-purple-900 mb-1">
          {selectedCollection.collection.name}
        </h3>
        <p className="text-sm text-purple-700">
          {collectionNFTs.length} NFT{collectionNFTs.length !== 1 ? 's' : ''} in this collection
        </p>
      </div>

      {/* Stuck NFTs Section - Recovery */}
      {isLoadingStuckNFTs && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
            <p className="text-sm text-amber-700">Checking for previously transferred NFTs...</p>
          </div>
        </div>
      )}
      
      {!isLoadingStuckNFTs && stuckNFTs.length > 0 && (
        <div className="mb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-amber-900 mb-1">
                  Resume Previous Transfers ({stuckNFTs.length})
                </h4>
                <p className="text-sm text-amber-700 mb-3">
                  These NFTs were previously transferred to the bridge but their mint wasn't completed. 
                  Select them to resume the minting process without needing to transfer again.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stuckNFTs.map((nft) => {
              const isSelected = selectedNFTs.some(n => n.mintAddress === nft.mintAddress);
              
              return (
                <div
                  key={nft.mintAddress}
                  onClick={() => handleToggleStuckNFT(nft)}
                  className={clsx(
                    "border rounded-lg overflow-hidden cursor-pointer transition-all relative",
                    isSelected
                      ? "ring-2 ring-amber-500 border-amber-500"
                      : "border-amber-200 hover:border-amber-300 hover:shadow-md"
                  )}
                >
                  {/* Recovery Badge */}
                  <div className="absolute top-2 left-2 z-10">
                    <div className="bg-amber-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Resume
                    </div>
                  </div>

                  {/* NFT Image */}
                  <div className="aspect-square bg-gray-100 relative">
                    {nft.image ? (
                      <img
                        src={nft.image}
                        alt={nft.name || 'NFT'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        🖼️
                      </div>
                    )}
                    {/* Selection Checkbox */}
                    <div className="absolute top-2 right-2">
                      <div className={clsx(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                        isSelected
                          ? "bg-amber-600 border-amber-600"
                          : "bg-white border-gray-300"
                      )}>
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* NFT Info */}
                  <div className="p-3">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {nft.name || 'Unnamed NFT'}
                    </p>
                    {nft.symbol && (
                      <p className="text-xs text-gray-500 truncate">{nft.symbol}</p>
                    )}
                    <p className="text-xs text-gray-400 truncate font-mono mt-1">
                      {nft.mintAddress.slice(0, 4)}...{nft.mintAddress.slice(-4)}
                    </p>
                    {nft.mintRequestId && (
                      <p className="text-xs text-amber-600 mt-1 font-medium">
                        Request ID: {nft.mintRequestId.toString().slice(0, 8)}...
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {collectionNFTs.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-4xl mb-4">🖼️</div>
          <p className="text-gray-900 font-medium mb-2">No NFTs Found</p>
          <p className="text-gray-600 text-sm mb-4">
            This collection doesn't have any NFTs in your wallet
          </p>
          <button
            onClick={() => setShowManualEntry(true)}
            className="text-blue-600 hover:text-blue-700 underline text-sm"
          >
            Add NFT manually by mint address
          </button>
        </div>
      )}

      {/* NFTs Grid */}
      {filteredNFTs.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {selectedNFTs.length} of {collectionNFTs.length} NFT{collectionNFTs.length !== 1 ? 's' : ''} selected
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredNFTs.map((nft) => {
              const isSelected = selectedNFTs.some(n => n.mintAddress === nft.mintAddress);
              
              return (
                <div
                  key={nft.mintAddress}
                  onClick={() => handleToggleNFT(nft)}
                  className={clsx(
                    "border rounded-lg overflow-hidden cursor-pointer transition-all",
                    isSelected
                      ? "ring-2 ring-blue-500 border-blue-500"
                      : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                  )}
                >
                  {/* NFT Image */}
                  <div className="aspect-square bg-gray-100 relative">
                    {nft.image ? (
                      <img
                        src={nft.image}
                        alt={nft.name || 'NFT'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        🖼️
                      </div>
                    )}
                    {/* Selection Checkbox */}
                    <div className="absolute top-2 right-2">
                      <div className={clsx(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                        isSelected
                          ? "bg-blue-600 border-blue-600"
                          : "bg-white border-gray-300"
                      )}>
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* NFT Info */}
                  <div className="p-3">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {nft.name || 'Unnamed NFT'}
                    </p>
                    {nft.symbol && (
                      <p className="text-xs text-gray-500 truncate">{nft.symbol}</p>
                    )}
                    <p className="text-xs text-gray-400 truncate font-mono mt-1">
                      {nft.mintAddress.slice(0, 4)}...{nft.mintAddress.slice(-4)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Results from Search */}
      {searchQuery && filteredNFTs.length === 0 && collectionNFTs.length > 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">No NFTs match your search</p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-blue-600 hover:text-blue-700 underline text-sm mt-2"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}

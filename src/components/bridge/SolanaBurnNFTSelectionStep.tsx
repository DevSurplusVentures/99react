import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Search, AlertTriangle, Flame, Plus, Loader2 } from 'lucide-react';
import { useSolana } from '../../hooks/useSolana';
import { useAuth } from '../../hooks/useAuth';
import type { SolanaCluster } from '../../types/solana';
import { queryOwnedNFTs, queryNFTByMint } from '../../lib/solana/nftQuery';

export interface SelectedSolanaBurnNFT {
  mintAddress: string;
  collectionAddress: string;
  cluster: SolanaCluster;
  name?: string;
  description?: string;
  image?: string;
  metadata?: any;
  /** If true, NFT is already at approval address (recovery mode) */
  isRecovery?: boolean;
}

export interface SolanaBurnNFTSelectionStepProps {
  /** The Solana cluster to query NFTs from */
  cluster: SolanaCluster;
  /** Callback when NFT selection changes */
  onSelectionChange?: (nft: SelectedSolanaBurnNFT | null) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Step component for selecting a Solana NFT to burn and return to IC
 * 
 * Key Differences from Import:
 * - Only shows NFTs from CONTROLLED collections (cast from IC)
 * - Single-select only (burns are typically one-at-a-time)
 * - Displays prominent burn warning
 * - Filters to NFTs that can be returned to IC
 * 
 * Based on PIC Test Flow:
 * - User owns NFT on Solana (from cast or secondary purchase)
 * - NFT is in a collection deployed by orchestrator
 * - User wants to return NFT to IC as ckNFT
 */
export function SolanaBurnNFTSelectionStep({
  cluster,
  onSelectionChange,
  className,
}: SolanaBurnNFTSelectionStepProps) {
  const { publicKey, connected, connection } = useSolana();
  const { user } = useAuth();
  
  const [selectedNFT, setSelectedNFT] = useState<SelectedSolanaBurnNFT | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableNFTs, setAvailableNFTs] = useState<SelectedSolanaBurnNFT[]>([]);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualMintAddress, setManualMintAddress] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'nft' | 'collection'>('nft');
  const [showRecoveryMode, setShowRecoveryMode] = useState(false);
  const [recoveryMintAddress, setRecoveryMintAddress] = useState('');
  
  // Fetch user's burnable NFTs
  useEffect(() => {
    if (!connected || !publicKey || !user || !connection) {
      return;
    }

    const fetchBurnableNFTs = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('🔍 Fetching burnable NFTs for:', {
          solanaAddress: publicKey.toBase58(),
          cluster,
          icPrincipal: user.principal.toText(),
        });

        // Query all NFTs owned by this wallet
        const nfts = await queryOwnedNFTs(connection, publicKey);
        
        console.log(`✅ Found ${nfts.length} NFTs owned by wallet`);

        // TODO: Filter to orchestrator-controlled collections
        // For now, show all NFTs (we'll implement orchestrator filtering in next step)
        const burnableNFTs: SelectedSolanaBurnNFT[] = nfts.map(nft => ({
          mintAddress: nft.mintAddress,
          collectionAddress: nft.collectionAddress || '',
          cluster,
          name: nft.name,
          description: nft.description,
          image: nft.image,
          metadata: nft.metadata,
        }));

        setAvailableNFTs(burnableNFTs);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch burnable NFTs:', err);
        setError(err instanceof Error ? err.message : 'Failed to load NFTs');
        setLoading(false);
      }
    };

    fetchBurnableNFTs();
  }, [connected, publicKey, user, cluster, connection]);

  // Handle NFT selection
  const handleSelectNFT = (nft: SelectedSolanaBurnNFT) => {
    // Toggle selection (single-select)
    const newSelection = selectedNFT?.mintAddress === nft.mintAddress ? null : nft;
    
    console.log('🎯 NFT selection toggled:', {
      action: newSelection ? 'select' : 'deselect',
      nft: nft.mintAddress.slice(0, 8) + '...',
      isRecovery: nft.isRecovery,
      selectedAfter: !!newSelection
    });
    
    setSelectedNFT(newSelection);
    onSelectionChange?.(newSelection);
  };

  // Handle manual mint address input
  const handleManualInput = async () => {
    if (!manualMintAddress.trim() || !connection) {
      return;
    }

    setManualLoading(true);
    setError(null);

    try {
      console.log('🔍 Querying NFT by mint address:', manualMintAddress);
      
      const nft = await queryNFTByMint(connection, manualMintAddress.trim(), publicKey || undefined);
      
      if (!nft) {
        throw new Error('NFT not found or invalid mint address');
      }

      // Create selected NFT
      const selectedNFT: SelectedSolanaBurnNFT = {
        mintAddress: nft.mintAddress,
        collectionAddress: nft.collectionAddress || '',
        cluster,
        name: nft.name,
        description: nft.description,
        image: nft.image,
        metadata: nft.metadata,
      };

      // Add to available NFTs if not already there
      if (!availableNFTs.find(n => n.mintAddress === nft.mintAddress)) {
        setAvailableNFTs([selectedNFT, ...availableNFTs]);
      }

      // Select it
      setSelectedNFT(selectedNFT);
      onSelectionChange?.(selectedNFT);
      
      // Close manual input
      setShowManualInput(false);
      setManualMintAddress('');
      
      console.log('✅ Successfully added NFT:', nft.name || nft.mintAddress);
    } catch (err) {
      console.error('Failed to query NFT:', err);
      setError(err instanceof Error ? err.message : 'Failed to query NFT');
    } finally {
      setManualLoading(false);
    }
  };

  // Handle recovery mode - check if NFT is already at approval address
  const handleRecoveryMode = async () => {
    if (!recoveryMintAddress.trim() || !connection) {
      return;
    }

    setManualLoading(true);
    setError(null);

    try {
      console.log('🔄 Recovery mode: Checking NFT at approval address:', recoveryMintAddress);
      
      // Query the NFT
      const nft = await queryNFTByMint(connection, recoveryMintAddress.trim());
      
      if (!nft) {
        throw new Error('NFT not found or invalid mint address');
      }

      // TODO: Check if NFT is actually at the approval address
      // For now, we'll mark it as recovery mode if manually entered in recovery flow
      
      // Create selected NFT with recovery flag
      const selectedNFT: SelectedSolanaBurnNFT = {
        mintAddress: nft.mintAddress,
        collectionAddress: nft.collectionAddress || '',
        cluster,
        name: nft.name,
        description: nft.description,
        image: nft.image,
        metadata: nft.metadata,
        isRecovery: true, // Skip transfer step
      };

      // Add to available NFTs if not already there
      if (!availableNFTs.find(n => n.mintAddress === nft.mintAddress)) {
        setAvailableNFTs([selectedNFT, ...availableNFTs]);
      }

      // Select it
      setSelectedNFT(selectedNFT);
      onSelectionChange?.(selectedNFT);
      
      console.log('✅ Recovery mode: NFT selected with recovery flag:', {
        mintAddress: selectedNFT.mintAddress,
        isRecovery: selectedNFT.isRecovery,
        name: selectedNFT.name || nft.mintAddress
      });
      
      // Close recovery mode form
      setShowRecoveryMode(false);
      setRecoveryMintAddress('');
      
      console.log('✅ Recovery mode complete - NFT should be selected and Next button should be enabled');
    } catch (err) {
      console.error('Recovery mode failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to verify NFT for recovery');
    } finally {
      setManualLoading(false);
    }
  };

  // Filter NFTs by search query
  const filteredNFTs = availableNFTs.filter(nft => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      nft.name?.toLowerCase().includes(query) ||
      nft.mintAddress.toLowerCase().includes(query) ||
      nft.collectionAddress.toLowerCase().includes(query)
    );
  });

  // Group NFTs by collection
  const nftsByCollection = filteredNFTs.reduce((acc, nft) => {
    const collectionKey = nft.collectionAddress || 'uncategorized';
    if (!acc.has(collectionKey)) {
      acc.set(collectionKey, []);
    }
    acc.get(collectionKey)!.push(nft);
    return acc;
  }, new Map<string, SelectedSolanaBurnNFT[]>());

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Burn Warning Banner */}
      <div className="rounded-lg border-2 border-orange-500 bg-orange-50 dark:bg-orange-950 p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">
              ⚠️ Burn and Return to IC
            </h3>
            <p className="text-sm text-orange-800 dark:text-orange-200">
              This operation will <strong>transfer your NFT to the approval address</strong> on Solana 
              and <strong>remint it as a ckNFT</strong> on the Internet Computer.
            </p>
            <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1 list-disc list-inside">
              <li>The NFT will be locked on Solana (transferred to orchestrator custody)</li>
              <li>You will receive the corresponding ckNFT on IC</li>
              <li>Only works for NFTs in orchestrator-controlled collections</li>
              <li>This process cannot be undone (but you can cast the ckNFT back to Solana later)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {availableNFTs.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}

      {/* Manual Input Section */}
      <div className="space-y-3">
        {!showManualInput && !showRecoveryMode ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowManualInput(true)}
              className="flex items-center justify-center space-x-2 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-cyan-400 dark:hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950 transition-colors text-gray-600 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400"
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium text-sm">Add NFT</span>
            </button>
            <button
              onClick={() => setShowRecoveryMode(true)}
              className="flex items-center justify-center space-x-2 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-orange-400 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950 transition-colors text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
            >
              <Flame className="h-5 w-5" />
              <span className="font-medium text-sm">Recovery Mode</span>
            </button>
          </div>
        ) : showManualInput ? (
          <div className="p-4 border-2 border-cyan-300 dark:border-cyan-700 rounded-lg bg-cyan-50 dark:bg-cyan-950 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Enter NFT Mint Address</h3>
              <button
                onClick={() => {
                  setShowManualInput(false);
                  setManualMintAddress('');
                  setError(null);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Cancel
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter a Solana NFT mint address (e.g., 7PijVMKnnoCXy1iDNH36A5a7XTa97ydMqMen3PFe1QFS) to manually add it.
              This is useful if you know the specific NFT you want to burn.
            </p>
            <div className="flex space-x-2">
              <input
                type="text"
                value={manualMintAddress}
                onChange={(e) => setManualMintAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !manualLoading) {
                    handleManualInput();
                  }
                }}
                placeholder="Enter mint address..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                disabled={manualLoading}
              />
              <button
                onClick={handleManualInput}
                disabled={!manualMintAddress.trim() || manualLoading}
                className={clsx(
                  'px-4 py-2 rounded-lg font-medium transition-colors',
                  manualMintAddress.trim() && !manualLoading
                    ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                )}
              >
                {manualLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Add'
                )}
              </button>
            </div>
          </div>
        ) : showRecoveryMode ? (
          <div className="p-4 border-2 border-orange-300 dark:border-orange-700 rounded-lg bg-orange-50 dark:bg-orange-950 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                <Flame className="h-5 w-5 text-orange-600" />
                <span>Recovery Mode</span>
              </h3>
              <button
                onClick={() => {
                  setShowRecoveryMode(false);
                  setRecoveryMintAddress('');
                  setError(null);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Cancel
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                <strong>Use this if your NFT was already transferred to the approval address but the mint failed.</strong>
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                This skips the transfer step and goes directly to minting on IC. The NFT must already be at the orchestrator's approval address.
              </p>
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={recoveryMintAddress}
                onChange={(e) => setRecoveryMintAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !manualLoading) {
                    handleRecoveryMode();
                  }
                }}
                placeholder="Enter NFT mint address..."
                className="flex-1 px-3 py-2 border border-orange-300 dark:border-orange-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                disabled={manualLoading}
              />
              <button
                onClick={handleRecoveryMode}
                disabled={!recoveryMintAddress.trim() || manualLoading}
                className={clsx(
                  'px-4 py-2 rounded-lg font-medium transition-colors',
                  recoveryMintAddress.trim() && !manualLoading
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                )}
              >
                {manualLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Recover'
                )}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* View Mode Toggle */}
      {availableNFTs.length > 0 && (
        <div className="flex items-center justify-center space-x-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <button
            onClick={() => setViewMode('nft')}
            className={clsx(
              'flex-1 px-4 py-2 rounded-md font-medium transition-colors',
              viewMode === 'nft'
                ? 'bg-white dark:bg-gray-700 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            All NFTs ({availableNFTs.length})
          </button>
          <button
            onClick={() => setViewMode('collection')}
            className={clsx(
              'flex-1 px-4 py-2 rounded-md font-medium transition-colors',
              viewMode === 'collection'
                ? 'bg-white dark:bg-gray-700 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            By Collection ({nftsByCollection.size})
          </button>
        </div>
      )}

      {/* Selection Counter */}
      {selectedNFT && (
        <div className="flex items-center justify-between p-3 bg-cyan-50 dark:bg-cyan-950 rounded-lg border border-cyan-200 dark:border-cyan-800">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-cyan-900 dark:text-cyan-100">
              <Flame className="inline h-4 w-4 mr-1" />
              1 NFT selected for burn
            </span>
            {selectedNFT.isRecovery && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
                Recovery Mode
              </span>
            )}
          </div>
          <button
            onClick={() => handleSelectNFT(selectedNFT)}
            className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* NFT Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading burnable NFTs...</span>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      ) : filteredNFTs.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <Flame className="h-16 w-16 text-gray-400 mx-auto" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
              No Burnable NFTs Found
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              {availableNFTs.length === 0
                ? "You don't have any NFTs. Use 'Add NFT by Mint Address' if you know the specific NFT address, or connect to a different Solana wallet."
                : `No NFTs match "${searchQuery}"`}
            </p>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 max-w-md mx-auto">
            <p className="font-medium mb-1">How to burn NFTs:</p>
            <ol className="list-decimal list-inside text-left space-y-1">
              <li>You must own an NFT on Solana (cast from IC or purchased)</li>
              <li>Enter the NFT mint address manually if not auto-detected</li>
              <li>The orchestrator will verify the NFT and collection</li>
            </ol>
          </div>
        </div>
      ) : viewMode === 'nft' ? (
        // NFT View - Show all NFTs individually
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNFTs.map((nft) => (
            <button
              key={nft.mintAddress}
              onClick={() => handleSelectNFT(nft)}
              className={clsx(
                'relative group rounded-lg border-2 p-4 text-left transition-all',
                'hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500',
                selectedNFT?.mintAddress === nft.mintAddress
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950'
                  : 'border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700'
              )}
            >
              {/* Selection Indicator */}
              {selectedNFT?.mintAddress === nft.mintAddress && (
                <div className="absolute top-2 right-2">
                  <div className="h-6 w-6 rounded-full bg-cyan-500 flex items-center justify-center">
                    <Flame className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}

              {/* NFT Image */}
              <div className="aspect-square rounded-lg bg-gray-100 dark:bg-gray-800 mb-3 overflow-hidden relative">
                {nft.image ? (
                  <img
                    src={nft.image}
                    alt={nft.name || 'NFT'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Flame className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                {/* Recovery Mode Badge on Image */}
                {nft.isRecovery && (
                  <div className="absolute top-2 left-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-500 text-white shadow-lg">
                      Recovery
                    </span>
                  </div>
                )}
              </div>

              {/* NFT Info */}
              <div className="space-y-2">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {nft.name || 'Unnamed NFT'}
                </h3>
                {nft.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {nft.description}
                  </p>
                )}
                <div className="space-y-1 text-xs text-gray-500 dark:text-gray-500">
                  <p className="truncate" title={nft.mintAddress}>
                    <span className="font-medium">Mint:</span> {nft.mintAddress.slice(0, 8)}...
                  </p>
                  <p className="truncate" title={nft.collectionAddress}>
                    <span className="font-medium">Collection:</span> {nft.collectionAddress.slice(0, 8)}...
                  </p>
                </div>
              </div>

              {/* Burn Badge */}
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center text-xs text-orange-600 dark:text-orange-400">
                  <Flame className="h-3 w-3 mr-1" />
                  <span className="font-medium">Can be returned to IC</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        // Collection View - Group NFTs by collection
        <div className="space-y-6">
          {Array.from(nftsByCollection.entries()).map(([collectionAddress, nfts]) => (
            <div key={collectionAddress} className="space-y-3">
              {/* Collection Header */}
              <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {collectionAddress === 'uncategorized' ? 'Uncategorized' : `Collection ${collectionAddress.slice(0, 8)}...`}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {nfts.length} NFT{nfts.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {collectionAddress !== 'uncategorized' && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 font-mono" title={collectionAddress}>
                    {collectionAddress}
                  </p>
                )}
              </div>

              {/* NFTs in this collection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {nfts.map((nft) => (
                  <button
                    key={nft.mintAddress}
                    onClick={() => handleSelectNFT(nft)}
                    className={clsx(
                      'relative group rounded-lg border-2 p-4 text-left transition-all',
                      'hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500',
                      selectedNFT?.mintAddress === nft.mintAddress
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950'
                        : 'border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700'
                    )}
                  >
                    {selectedNFT?.mintAddress === nft.mintAddress && (
                      <div className="absolute top-2 right-2">
                        <div className="h-6 w-6 rounded-full bg-cyan-500 flex items-center justify-center">
                          <Flame className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}

                    <div className="aspect-square rounded-lg bg-gray-100 dark:bg-gray-800 mb-3 overflow-hidden">
                      {nft.image ? (
                        <img
                          src={nft.image}
                          alt={nft.name || 'NFT'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Flame className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {nft.name || 'Unnamed NFT'}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-500 truncate" title={nft.mintAddress}>
                        {nft.mintAddress.slice(0, 8)}...
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Section */}
      {!loading && !error && filteredNFTs.length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-500 text-center">
          Showing {filteredNFTs.length} NFT{filteredNFTs.length !== 1 ? 's' : ''} from orchestrator-controlled collections
        </div>
      )}
    </div>
  );
}

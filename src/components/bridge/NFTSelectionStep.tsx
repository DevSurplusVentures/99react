import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import clsx from 'clsx';
import { useMetaMask } from '../../hooks/useEVM';
import { useAuth } from '../../hooks/useAuth';
import { use99Mutations } from '../../hooks/use99Mutations';

// Types
export interface SelectedNFT {
  contractAddress: string;
  tokenId: string;
  name: string;
  image?: string;
  description?: string;
  ownershipStatus?: 'owned' | 'bridged' | 'ready-to-mint' | 'already-minted';
  currentOwner?: string;
  bridgeTransferHash?: string;
  icrcTokenId?: string; // The ICRC-7 token ID if already minted
}

export interface NFTCollection {
  contractAddress: string;
  name: string;
  symbol: string;
  imageUrl?: string;
  totalSupply?: number;
  verified?: boolean;
}

export interface NFTDiscoveryService {
  getCollections(network: string, account: string): Promise<NFTCollection[]>;
  getNFTsInCollection(contractAddress: string, account: string, network: string): Promise<SelectedNFT[]>;
}

export interface NFTSelectionStepProps {
  account: string;
  network: string | null;
  selectedNFTs: SelectedNFT[];
  onSelectionChange: (nfts: SelectedNFT[]) => void;
  nftDiscoveryService?: NFTDiscoveryService;
  /** Mode determines which NFTs can be selected. 'import' = not-yet-minted, 'burn' = already-minted */
  mode?: 'import' | 'burn';
}

export function NFTSelectionStep({
  account,
  network,
  selectedNFTs,
  onSelectionChange,
  nftDiscoveryService,
  mode = 'import', // Default to import mode for backward compatibility
}: NFTSelectionStepProps) {
  const [collections, setCollections] = useState<NFTCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<NFTCollection | null>(null);
  const [availableNFTs, setAvailableNFTs] = useState<SelectedNFT[]>([]);
  const [manualContract, setManualContract] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Access to blockchain context and mutations
  const { chainId } = useMetaMask();
  const { user } = useAuth();
  const mutations = use99Mutations(process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai');

  // Cache for ICRC-7 canister IDs (network -> canister ID)
  const [icrc7CanisterCache, setIcrc7CanisterCache] = useState<Map<string, string>>(new Map());
  
  // Cache for bridge approval addresses (contract -> address[])
  const [bridgeAddressCache, setBridgeAddressCache] = useState<Map<string, string[]>>(new Map());

  // Load collections when component mounts or account/network changes
  useEffect(() => {
    if (nftDiscoveryService && account && network) {
      setLoading(true);
      setError(null);
      nftDiscoveryService.getCollections(network, account)
        .then(setCollections)
        .catch(err => {
          console.error('Failed to load NFT collections:', err);
          setError('Failed to load your NFT collections. You can still enter contract addresses manually.');
        })
        .finally(() => setLoading(false));
    }
  }, [nftDiscoveryService, account, network]);

  // Load NFTs from selected collection
  useEffect(() => {
    if (selectedCollection && nftDiscoveryService && account && network) {
      setLoading(true);
      nftDiscoveryService.getNFTsInCollection(selectedCollection.contractAddress, account, network)
        .then(setAvailableNFTs)
        .catch(err => {
          console.error('Failed to load NFTs from collection:', err);
          setError('Failed to load NFTs from this collection.');
        })
        .finally(() => setLoading(false));
    }
  }, [selectedCollection, nftDiscoveryService, account, network]);

  const handleManualContractSubmit = async () => {
    if (!manualContract.trim()) return;
    
    // Basic validation for Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(manualContract.trim())) {
      setError('Please enter a valid contract address (0x...)');
      return;
    }

    const contractAddress = manualContract.trim();
    setLoading(true);
    setError(null);
    
    try {
      let nfts: SelectedNFT[] = [];
      
      if (nftDiscoveryService && account && network) {
        // Use the discovery service if available
        nfts = await nftDiscoveryService.getNFTsInCollection(contractAddress, account, network);
      } else if (account && window.ethereum) {
        // Fallback: scan blockchain directly using MetaMask
        nfts = await scanNFTsFromContract(contractAddress, account, chainId || 1);
      } else {
        throw new Error('No wallet connected or NFT discovery service available');
      }
      
      setAvailableNFTs(nfts);
      setSelectedCollection({
        contractAddress,
        name: `Contract ${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`,
        symbol: 'UNKNOWN'
      });
      setShowManualEntry(false);
      setManualContract('');
    } catch (err) {
      console.error('Failed to load NFTs from manual contract:', err);
      setError(`Failed to load NFTs from this contract: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Manual token recovery function
  const handleManualTokenRecovery = async (contractAddress: string, tokenId: string) => {
    if (!window.ethereum || !account) {
      setError('Wallet not connected');
      return;
    }

    setLoading(true);
    console.log(`🔍 Manual recovery: checking token ${tokenId} in contract ${contractAddress}`);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const erc721ABI = [
        'function name() view returns (string)',
        'function ownerOf(uint256 tokenId) view returns (address)',
        'function tokenURI(uint256 tokenId) view returns (string)',
      ];
      
      const contract = new ethers.Contract(contractAddress, erc721ABI, provider);
      const contractName = await contract.name().catch(() => 'Unknown Collection');
      
      // Check current owner
      const currentOwner = await contract.ownerOf(tokenId);
      console.log(`🔍 Token ${tokenId} current owner: ${currentOwner}`);
      
      if (currentOwner.toLowerCase() === account.toLowerCase()) {
        console.log(`✅ Token ${tokenId} is owned by user - already should be found`);
        setError(`Token ${tokenId} is owned by you and should already appear in the list`);
        return;
      }
      
      // Create the NFT object for this specific token
      const nft = await fetchNFTMetadataWithOwnershipCheck(
        contract,
        contractAddress,
        contractName,
        tokenId,
        currentOwner,
        'ready-to-mint', // Assume it's ready to mint if manually recovered
        undefined, // No specific tx hash available
        chainId ?? 1
      );
      
      if (nft) {
        // Add to available NFTs if not already present
        const exists = availableNFTs.some(existing => 
          existing.contractAddress === nft.contractAddress && existing.tokenId === nft.tokenId
        );
        
        if (!exists) {
          setAvailableNFTs(prev => [...prev, nft]);
          console.log(`✅ Added recovered token ${tokenId} to available NFTs`);
          
          // Update collection if not set
          if (!selectedCollection) {
            setSelectedCollection({
              contractAddress,
              name: contractName || `Contract ${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`,
              symbol: 'UNKNOWN'
            });
          }
        } else {
          setError(`Token ${tokenId} is already in the list`);
        }
      } else {
        setError(`Could not retrieve metadata for token ${tokenId}`);
      }
      
    } catch (err) {
      console.error('Manual recovery failed:', err);
      if (err instanceof Error && err.message.includes('owner query for nonexistent token')) {
        setError(`Token ${tokenId} does not exist in this contract`);
      } else {
        setError(`Failed to recover token ${tokenId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if NFT has already been minted on ICRC-7 canister
  const checkICRC7Ownership = async (contractAddress: string, tokenId: string, chainId: number): Promise<string | null> => {
    try {
      // Use contract + network as cache key to avoid repeated canister lookups
      const cacheKey = `${contractAddress}-${chainId}`;
      
      // Check ownership cache first
      const ownershipCacheKey = `${cacheKey}-${tokenId}`;
      const cachedOwnership = icrc7CanisterCache.get(ownershipCacheKey);
      if (cachedOwnership !== undefined) {
        return cachedOwnership === 'not-minted' ? null : cachedOwnership;
      }
      
      // Check canister ID cache
      let canisterId = icrc7CanisterCache.get(cacheKey);
      
      if (!canisterId) {
        console.log(`🔍 Looking up ICRC-7 canister for contract ${contractAddress} on network ${chainId}...`);
        
        // Get ICRC-7 canister ID using anonymous call
        const network = { Ethereum: [BigInt(chainId)] as [bigint] };

        const contractPointer = {
          contract: contractAddress,
          network,
        };

        // Use anonymous call for getCkNFTCanister to avoid unnecessary authentication
        try {
          const canisterIds = await mutations.getCkNFTCanister.mutateAsync([contractPointer]);
          const canisterResult = canisterIds[0];
          canisterId = canisterResult ? canisterResult.toString() : undefined;
          
          if (canisterId) {
            // Cache the result to avoid repeated calls
            setIcrc7CanisterCache(prev => new Map(prev).set(cacheKey, canisterId!));
            console.log(`✅ Cached ICRC-7 canister ID: ${canisterId} for contract ${contractAddress}`);
          } else {
            console.log(`❌ No ICRC-7 canister found for contract ${contractAddress}`);
            // Cache negative result to avoid repeated lookups
            setIcrc7CanisterCache(prev => new Map(prev).set(cacheKey, 'none'));
            return null;
          }
        } catch (error) {
          console.warn(`Failed to get ICRC-7 canister for contract ${contractAddress}:`, error);
          return null;
        }
      } else if (canisterId === 'none') {
        // Previously determined no canister exists
        return null;
      }
      
      if (!canisterId || canisterId === 'none') {
        // No canister exists yet, so NFT hasn't been minted
        return null;
      }

      // Make actual icrc7_owner_of call to the canister
      console.log(`🔍 Checking ICRC-7 ownership for token ${tokenId} in canister ${canisterId}`);
      
      try {
        // Create anonymous actor for ICRC-7 canister
        const { Actor, HttpAgent } = await import('@dfinity/agent');
        const { Principal } = await import('@dfinity/principal');
        
        // Create anonymous agent
        const agent = new HttpAgent({
          host: process.env.DFX_NETWORK === 'local' ? 'http://localhost:8080' : 'https://icp0.io',
        });
        
        // Only fetch root key in local development
        if (process.env.DFX_NETWORK === 'local') {
          await agent.fetchRootKey().catch(err => console.warn('Failed to fetch root key:', err));
        }
        
        // ICRC-7 IDL for owner_of call
        const icrc7IdlFactory = ({ IDL }: { IDL: any }) => {
          const Account = IDL.Record({
            owner: IDL.Principal,
            subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
          });
          
          return IDL.Service({
            icrc7_owner_of: IDL.Func(
              [IDL.Vec(IDL.Nat)],
              [IDL.Vec(IDL.Opt(Account))],
              ['query']
            ),
          });
        };
        
        // Create anonymous actor for the ICRC-7 canister
        const icrc7Actor = Actor.createActor(icrc7IdlFactory, {
          agent,
          canisterId: Principal.fromText(canisterId),
        }) as any;
        
        // Convert token ID to BigInt - this handles both string and number inputs
        const tokenIdBigInt = BigInt(tokenId);
        
        // Call icrc7_owner_of with the token ID
        const ownerResult = await icrc7Actor.icrc7_owner_of([tokenIdBigInt]);
        
        if (ownerResult && ownerResult.length > 0 && ownerResult[0] && ownerResult[0].length > 0) {
          // Token is minted, extract owner principal
          const owner = ownerResult[0][0];
          const ownerPrincipal = owner.owner.toString();
          console.log(`✅ Token ${tokenId} is minted on ICRC-7, owned by ${ownerPrincipal}`);
          
          // Cache the positive result
          setIcrc7CanisterCache(prev => new Map(prev).set(ownershipCacheKey, ownerPrincipal));
          return ownerPrincipal;
        } else {
          // Token is not minted yet
          console.log(`📋 Token ${tokenId} not minted on ICRC-7 yet`);
          
          // Cache the negative result
          setIcrc7CanisterCache(prev => new Map(prev).set(ownershipCacheKey, 'not-minted'));
          return null;
        }
        
      } catch (canisterError) {
        console.warn(`Failed to check ICRC-7 ownership for token ${tokenId}:`, canisterError);
        
        // If it's a "token not found" or similar error, cache as not minted
        const errorMessage = String(canisterError).toLowerCase();
        if (errorMessage.includes('not found') || errorMessage.includes('does not exist') || errorMessage.includes('unknown')) {
          setIcrc7CanisterCache(prev => new Map(prev).set(ownershipCacheKey, 'not-minted'));
        }
        
        return null;
      }
      
    } catch (error) {
      console.error('Error checking ICRC-7 ownership:', error);
      return null;
    }
  };

  // Enhanced function to scan NFTs from both user address and bridge addresses
  const scanNFTsFromContract = async (contractAddress: string, userAddress: string, currentChainId: number): Promise<SelectedNFT[]> => {
    if (!window.ethereum) {
      throw new Error('MetaMask not available');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // ERC-721 ABI for the functions we need
    const erc721ABI = [
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function ownerOf(uint256 tokenId) view returns (address)',
      'function tokenURI(uint256 tokenId) view returns (string)',
      'function balanceOf(address owner) view returns (uint256)',
      // Optional Enumerable functions
      'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
      'function totalSupply() view returns (uint256)',
      // Transfer event
      'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
    ];

    const contract = new ethers.Contract(contractAddress, erc721ABI, provider);
    
    try {
      const nfts: SelectedNFT[] = [];
      
      // First, verify this is a valid ERC-721 contract by checking basic functions
      console.log(`🔍 Verifying contract interface for: ${contractAddress}`);
      let contractName: string;
      try {
        contractName = await contract.name();
        console.log(`✅ Contract name: ${contractName}`);
      } catch (nameError) {
        console.warn('❌ Contract does not support name() function, using fallback');
        contractName = 'Unknown Collection';
      }
      
      // Test if balanceOf works (essential ERC-721 function)
      try {
        await contract.balanceOf(userAddress);
      } catch (balanceError) {
        console.error('❌ Contract does not support balanceOf - not a valid ERC-721:', balanceError);
        throw new Error('Contract does not appear to be a valid ERC-721 NFT contract');
      }
      
      console.log(`🔍 Starting comprehensive NFT scan for contract: ${contractAddress}`);
      console.log(`🔍 User address: ${userAddress}`);
      
      // Step 1: Find NFTs currently owned by the user
      console.log('🔍 Step 1: Finding owned NFTs...');
      try {
        const ownedNFTs = await findUserOwnedNFTs(contract, userAddress, contractAddress, contractName, currentChainId);
        console.log(`✅ Found ${ownedNFTs.length} owned NFTs`);
        nfts.push(...ownedNFTs);
      } catch (ownedError) {
        console.error('❌ Error finding owned NFTs:', ownedError);
        // Continue with other steps even if this fails
      }
      
      // Step 2: Find NFTs previously owned by user but now in bridge addresses
      console.log('🔍 Step 2: Finding bridged NFTs...');
      try {
        const bridgedNFTs = await findBridgedNFTs(contract, userAddress, contractAddress, contractName, currentChainId);
        console.log(`✅ Found ${bridgedNFTs.length} bridged NFTs`);
        nfts.push(...bridgedNFTs);
      } catch (bridgedError) {
        console.error('❌ Error finding bridged NFTs:', bridgedError);
        // Continue with other steps even if this fails
      }
      
      // Step 3: FALLBACK - Find any NFTs that were transferred from user recently
      console.log('🔍 Step 3: Finding recently transferred NFTs (fallback)...');
      try {
        const recentlyTransferredNFTs = await findRecentlyTransferredNFTs(contract, userAddress, contractAddress, contractName, currentChainId);
        console.log(`✅ Found ${recentlyTransferredNFTs.length} recently transferred NFTs`);
        
        // Add recently transferred NFTs that aren't already in the list
        for (const recentNFT of recentlyTransferredNFTs) {
          const exists = nfts.some(nft => nft.contractAddress === recentNFT.contractAddress && nft.tokenId === recentNFT.tokenId);
          if (!exists) {
            nfts.push(recentNFT);
          }
        }
      } catch (recentError) {
        console.error('❌ Error finding recently transferred NFTs:', recentError);
        // This is a fallback, so it's okay if it fails
      }
      
      console.log(`🎯 Total NFTs found: ${nfts.length}`);
      return nfts;
      
    } catch (contractError) {
      console.error('Contract interaction error:', contractError);
      throw new Error('Failed to interact with contract. Please verify it\'s a valid ERC-721 contract.');
    }
  };

  // NEW: Fallback function to find any NFTs recently transferred from user
  const findRecentlyTransferredNFTs = async (
    contract: ethers.Contract, 
    userAddress: string, 
    contractAddress: string, 
    contractName: string,
    currentChainId: number
  ): Promise<SelectedNFT[]> => {
    const provider = contract.runner?.provider;
    if (!provider) return [];

    const nfts: SelectedNFT[] = [];
    
    try {
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 100000); // Look even further back
      console.log(`🔍 Fallback scan: blocks ${fromBlock} to ${currentBlock}`);
      
      // Find ALL transfers FROM user (regardless of destination)
      const transferFromUserFilter = contract.filters.Transfer(userAddress, null, null);
      const allTransferEvents = await contract.queryFilter(transferFromUserFilter, fromBlock, 'latest');
      console.log(`🔍 Found ${allTransferEvents.length} total transfers from user`);
      
      // Group by token ID and find the most recent transfer for each
      const latestTransfers = new Map<string, any>();
      
      for (const event of allTransferEvents) {
        if ('args' in event && event.args) {
          const tokenId = event.args.tokenId?.toString();
          const toAddress = event.args.to?.toString().toLowerCase();
          const blockNumber = event.blockNumber;
          
          if (tokenId && toAddress) {
            const existing = latestTransfers.get(tokenId);
            if (!existing || blockNumber > existing.blockNumber) {
              latestTransfers.set(tokenId, {
                tokenId,
                toAddress,
                blockNumber,
                txHash: event.transactionHash
              });
            }
          }
        }
      }
      
      console.log(`🔍 Processing ${latestTransfers.size} unique tokens transferred from user`);
      
      // Check current ownership for each transferred token
      for (const [tokenId, transferInfo] of latestTransfers) {
        try {
          const currentOwner = await contract.ownerOf(tokenId);
          const currentOwnerLower = currentOwner.toLowerCase();
          
          // If token is not owned by user anymore, it might be stranded
          if (currentOwnerLower !== userAddress.toLowerCase()) {
            console.log(`🔍 Token ${tokenId}: transferred to ${transferInfo.toAddress}, now owned by ${currentOwner}`);
            
            // FIRST: Check if this NFT has already been minted on ICRC-7 (before any bridge address calls!)
            const icrcOwner = await checkICRC7Ownership(contractAddress, tokenId, currentChainId);
            
            let ownershipStatus: 'bridged' | 'ready-to-mint' | 'already-minted' = 'bridged';
            let icrcTokenId: string | undefined;
            
            if (icrcOwner) {
              // NFT has already been minted on ICRC-7 - no need to check bridge addresses!
              ownershipStatus = 'already-minted';
              icrcTokenId = tokenId; // Store the ICRC token ID mapping
              console.log(`🎯 Token ${tokenId} has already been minted on ICRC-7, owned by ${icrcOwner} - skipping bridge checks`);
            } else {
              // Only check bridge addresses if NOT already minted on ICRC-7
              console.log(`📋 Token ${tokenId} not minted on ICRC-7 yet, checking bridge status...`);
              
              if (currentOwnerLower === transferInfo.toAddress) {
                // This suggests the token is still where it was transferred and hasn't moved
                ownershipStatus = 'ready-to-mint';
                console.log(`✅ Token ${tokenId} appears to be ready for minting`);
              }
            }
            
            const nft = await fetchNFTMetadata(
              contract,
              contractAddress,
              contractName,
              tokenId,
              currentOwner,
              ownershipStatus,
              transferInfo.txHash,
              icrcTokenId
            );
            
            if (nft) {
              nfts.push(nft);
            }
          }
        } catch (ownerError) {
          console.log(`❌ Token ${tokenId} no longer exists or error checking owner:`, ownerError);
        }
      }
      
    } catch (error) {
      console.error('❌ Error in fallback scan:', error);
    }
    
    return nfts;
  };

  // Helper function to find NFTs currently owned by the user
  const findUserOwnedNFTs = async (
    contract: ethers.Contract, 
    userAddress: string, 
    contractAddress: string, 
    contractName: string,
    currentChainId: number
  ): Promise<SelectedNFT[]> => {
    try {
      console.log(`🔍 Checking balance for user ${userAddress}...`);
      const balance = await contract.balanceOf(userAddress);
      const balanceNum = Number(balance);
      
      console.log(`🔍 User balance: ${balanceNum} NFTs`);
      
      if (balanceNum === 0) {
        return []; // User doesn't own any NFTs from this contract
      }

      let tokenIds: string[] = [];
    
    try {
      // Try Enumerable approach first (if supported)
      console.log(`🔍 Attempting to use ERC-721 Enumerable for ${balanceNum} tokens...`);
      for (let i = 0; i < balanceNum; i++) {
        try {
          const tokenId = await contract.tokenOfOwnerByIndex(userAddress, i);
          tokenIds.push(tokenId.toString());
        } catch (indexError) {
          // If any individual call fails, fall back to event scanning immediately
          console.log(`❌ Failed on token index ${i}, falling back to event scanning...`);
          tokenIds = []; // Clear any partial results
          throw indexError;
        }
      }
      console.log(`✅ Successfully retrieved ${tokenIds.length} tokens via Enumerable`);
    } catch (enumerableError) {
      console.log('Contract does not support ERC-721 Enumerable, falling back to event scanning...');
      tokenIds = []; // Ensure we start fresh
      
      // Fallback: Scan Transfer events with improved error handling
      const provider = contract.runner?.provider;
      if (!provider) throw new Error('No provider available');
      
      try {
        const currentBlock = await provider.getBlockNumber();
        // Use a more conservative block range to avoid RPC limits
        const fromBlock = Math.max(0, currentBlock - 5000); // Reduced from 10000
        
        console.log(`🔍 Event scanning from block ${fromBlock} to ${currentBlock}`);
        
        // Get all Transfer events TO the user
        const transferFilter = contract.filters.Transfer(null, userAddress, null);
        const transferEvents = await contract.queryFilter(transferFilter, fromBlock, 'latest');
        
        // Get all Transfer events FROM the user (to check if they still own the token)
        const transferFromFilter = contract.filters.Transfer(userAddress, null, null);
        const transferFromEvents = await contract.queryFilter(transferFromFilter, fromBlock, 'latest');
        
        console.log(`🔍 Found ${transferEvents.length} transfers TO user, ${transferFromEvents.length} transfers FROM user`);
        
        // Create sets for efficient lookup
        const receivedTokens = new Set<string>();
        const sentTokens = new Set<string>();
        
        // Process received tokens
        for (const event of transferEvents) {
          if ('args' in event && event.args) {
            const tokenId = event.args.tokenId?.toString();
            if (tokenId) {
              receivedTokens.add(tokenId);
            }
          }
        }
        
        // Process sent tokens
        for (const event of transferFromEvents) {
          if ('args' in event && event.args) {
            const tokenId = event.args.tokenId?.toString();
            if (tokenId) {
              sentTokens.add(tokenId);
            }
          }
        }
        
        // Tokens currently owned = received - sent
        const potentialTokenIds = Array.from(receivedTokens).filter(tokenId => !sentTokens.has(tokenId));
        
        console.log(`🔍 Potential owned tokens from events: ${potentialTokenIds.length}`);
        
        // Verify ownership (in case we missed some transfers)
        for (const tokenId of potentialTokenIds) {
          try {
            const owner = await contract.ownerOf(tokenId);
            if (owner.toLowerCase() === userAddress.toLowerCase()) {
              tokenIds.push(tokenId);
            }
          } catch (ownerError) {
            // Token might not exist or be burned
            console.log(`Token ${tokenId} does not exist or is burned`);
          }
        }
      } catch (eventScanError) {
        console.error('❌ Event scanning also failed:', eventScanError);
        // If event scanning fails, we can't determine ownership
        throw new Error(`Unable to determine NFT ownership: ${eventScanError instanceof Error ? eventScanError.message : 'Unknown error'}`);
      }
    }
    
    // Fetch metadata for each owned token
    const nfts: SelectedNFT[] = [];
    for (const tokenId of tokenIds) {
      const nft = await fetchNFTMetadataWithOwnershipCheck(contract, contractAddress, contractName, tokenId, userAddress, 'owned', undefined, currentChainId);
      if (nft) nfts.push(nft);
    }
    
    return nfts;
    } catch (error) {
      console.error(`❌ Error finding user owned NFTs:`, error);
      return [];
    }
  };

  // Helper function to find NFTs that were transferred to bridge addresses
  const findBridgedNFTs = async (
    contract: ethers.Contract, 
    userAddress: string, 
    contractAddress: string, 
    contractName: string,
    currentChainId: number
  ): Promise<SelectedNFT[]> => {
    const provider = contract.runner?.provider;
    if (!provider) return [];

    const nfts: SelectedNFT[] = [];
    
    try {
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 50000); // Look further back for bridged NFTs
      console.log(`🔍 Scanning blocks ${fromBlock} to ${currentBlock} for transfers from ${userAddress}`);
      
      // First, find transfers FROM user (to any address)
      const transferFromUserFilter = contract.filters.Transfer(userAddress, null, null);
      const transferFromUserEvents = await contract.queryFilter(transferFromUserFilter, fromBlock, 'latest');
      console.log(`🔍 Found ${transferFromUserEvents.length} transfers from user address`);
      
      if (transferFromUserEvents.length === 0) {
        console.log('⚠️ No transfers from user found - skipping bridge address lookup');
        return [];
      }
      
      // Process all transfers to see if any went to bridge addresses
      // We'll check ICRC-7 ownership FIRST to avoid unnecessary bridge address calls
      for (const event of transferFromUserEvents) {
        if ('args' in event && event.args) {
          const tokenId = event.args.tokenId?.toString();
          const toAddress = event.args.to?.toString().toLowerCase();
          const txHash = event.transactionHash;
          
          console.log(`🔍 Transfer event: token ${tokenId} to ${toAddress}, tx: ${txHash}`);
          
          if (tokenId && toAddress) {
            // FIRST: Check if this NFT has already been minted on ICRC-7 (before any bridge checks!)
            console.log(`🔍 Checking ICRC-7 ownership for token ${tokenId} before bridge checks...`);
            const icrcOwner = await checkICRC7Ownership(contractAddress, tokenId, currentChainId);
            
            if (icrcOwner) {
              // NFT already minted on ICRC-7 - skip bridge address checks entirely!
              console.log(`🎯 Token ${tokenId} already minted on ICRC-7, owned by ${icrcOwner} - adding as already-minted`);
              
              try {
                const currentOwner = await contract.ownerOf(tokenId);
                const nft = await fetchNFTMetadata(
                  contract, 
                  contractAddress, 
                  contractName, 
                  tokenId, 
                  currentOwner, 
                  'already-minted', 
                  txHash,
                  tokenId // Store the ICRC token ID mapping
                );
                if (nft) nfts.push(nft);
              } catch (ownerError) {
                console.log(`❌ Token ${tokenId} no longer exists:`, ownerError);
              }
              continue; // Skip bridge address checks for this token
            }
            
            // Only get bridge addresses if NOT already minted on ICRC-7
            console.log(`📋 Token ${tokenId} not minted on ICRC-7, checking if ${toAddress} is a bridge address...`);
            const bridgeAddresses = await getBridgeApprovalAddresses(contractAddress);
            
            if (bridgeAddresses.includes(toAddress)) {
              console.log(`✅ Found transfer to bridge address: token ${tokenId}`);
              // Check if this NFT is still owned by the bridge address
              try {
                const currentOwner = await contract.ownerOf(tokenId);
                console.log(`🔍 Current owner of token ${tokenId}: ${currentOwner}`);
                
                if (currentOwner.toLowerCase() === toAddress) {
                  console.log(`🎯 Token ${tokenId} is ready to mint!`);
                  // This NFT is in a bridge address and ready to mint!
                  const nft = await fetchNFTMetadata(
                    contract, 
                    contractAddress, 
                    contractName, 
                    tokenId, 
                    currentOwner, 
                    'ready-to-mint', 
                    txHash
                  );
                  if (nft) nfts.push(nft);
                } else {
                  console.log(`❌ Token ${tokenId} no longer owned by bridge (owner: ${currentOwner})`);
                }
              } catch (ownerError) {
                console.log(`❌ Token ${tokenId} no longer exists:`, ownerError);
              }
            } else {
              console.log(`⚪ Transfer to non-bridge address: ${toAddress}`);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Error scanning for bridged NFTs:', error);
      // Don't throw - just return empty array for bridged NFTs
    }
    
    return nfts;
  };

  // Helper function to get known bridge approval addresses with caching
  const getBridgeApprovalAddresses = async (contractAddress: string): Promise<string[]> => {
    // Check cache first
    const cached = bridgeAddressCache.get(contractAddress);
    if (cached) {
      console.log('✅ Using cached bridge addresses for contract:', contractAddress);
      return cached;
    }

    const addresses: string[] = [];
    
    console.log('🔍 Getting bridge approval addresses for contract:', contractAddress);
    
    if (!mutations.getApprovalAddress || !user?.principal) {
      console.log('⚠️ No approval address mutation or user principal available');
      // Cache empty result to avoid repeated calls
      setBridgeAddressCache(prev => new Map(prev).set(contractAddress, addresses));
      return addresses;
    }
    
    try {
      // Create contract pointer for this contract
      const effectiveChainId = chainId ?? 1;
      const network = { Ethereum: [BigInt(effectiveChainId)] as [bigint] };
      
      // For getting approval addresses, we need a dummy token ID since the address
      // is typically the same for all tokens in a contract
      const approvalRequest = {
        remoteNFTPointer: {
          tokenId: BigInt(0), // Use token ID 0 as dummy
          contract: contractAddress,
          network
        },
        account: { owner: user.principal, subaccount: [] as [] }
      };
      
      console.log('🔍 Requesting approval address with:', approvalRequest);
      
      // Get the approval address for this contract
      const approvalAddress = await mutations.getApprovalAddress.mutateAsync({
        request: approvalRequest,
        spender: { owner: user.principal, subaccount: [] as [] },
      });
      
      if (approvalAddress) {
        addresses.push(approvalAddress.toLowerCase());
        console.log('✅ Found approval address:', approvalAddress);
      } else {
        console.log('❌ No approval address returned');
      }
      
      // Cache the result (whether empty or not) to avoid repeated calls
      setBridgeAddressCache(prev => new Map(prev).set(contractAddress, addresses));
      
      console.log('🔍 Final bridge addresses list:', addresses);
      return addresses;
    } catch (error) {
      console.error('❌ Failed to get bridge approval addresses:', error);
      // Cache empty result to avoid repeated failed calls
      setBridgeAddressCache(prev => new Map(prev).set(contractAddress, addresses));
      return addresses;
    }
  };

  // Enhanced metadata fetcher that checks ICRC-7 ownership first
  const fetchNFTMetadataWithOwnershipCheck = async (
    contract: ethers.Contract,
    contractAddress: string,
    contractName: string,
    tokenId: string,
    currentOwner: string,
    preliminaryStatus: 'owned' | 'bridged' | 'ready-to-mint',
    bridgeTransferHash?: string,
    currentChainId?: number
  ): Promise<SelectedNFT | null> => {
    try {
      // Only check ICRC-7 ownership for owned/bridged tokens - skip if already determined
      if (preliminaryStatus === 'owned' || preliminaryStatus === 'bridged') {
        const effectiveChainId = currentChainId ?? chainId ?? 1;
        const icrcOwner = await checkICRC7Ownership(contractAddress, tokenId, effectiveChainId);
        
        let finalStatus: 'owned' | 'bridged' | 'ready-to-mint' | 'already-minted';
        let icrcTokenId: string | undefined;
        
        if (icrcOwner) {
          // NFT has already been minted on ICRC-7
          finalStatus = 'already-minted';
          icrcTokenId = tokenId; // Assuming 1:1 mapping for now
          console.log(`✅ Token ${tokenId} already minted on ICRC-7, owned by: ${icrcOwner}`);
        } else {
          // NFT not yet minted, use preliminary status
          finalStatus = preliminaryStatus;
        }
        
        return await fetchNFTMetadata(
          contract,
          contractAddress,
          contractName,
          tokenId,
          currentOwner,
          finalStatus,
          bridgeTransferHash,
          icrcTokenId
        );
      } else {
        // For ready-to-mint or other statuses, use them directly (ICRC-7 check already done)
        return await fetchNFTMetadata(
          contract,
          contractAddress,
          contractName,
          tokenId,
          currentOwner,
          preliminaryStatus,
          bridgeTransferHash
        );
      }
    } catch (error) {
      console.error(`Error in ownership check for token ${tokenId}:`, error);
      // Fallback to preliminary status if ownership check fails
      return await fetchNFTMetadata(
        contract,
        contractAddress,
        contractName,
        tokenId,
        currentOwner,
        preliminaryStatus,
        bridgeTransferHash
      );
    }
  };

  // Helper function to fetch NFT metadata
  const fetchNFTMetadata = async (
    contract: ethers.Contract,
    contractAddress: string,
    contractName: string,
    tokenId: string,
    currentOwner: string,
    ownershipStatus: 'owned' | 'bridged' | 'ready-to-mint' | 'already-minted',
    bridgeTransferHash?: string,
    icrcTokenId?: string
  ): Promise<SelectedNFT | null> => {
    try {
      let name = `${contractName} #${tokenId}`;
      let image: string | undefined;
      let description: string | undefined;
      
      try {
        // Try to get token URI and fetch metadata
        const tokenURI = await contract.tokenURI(tokenId);
        
        if (tokenURI) {
          // Skip placeholder/example URLs that won't resolve
          const isPlaceholderURL = tokenURI.includes('example.com') || 
                                 tokenURI.includes('placeholder') ||
                                 tokenURI.includes('localhost') && !tokenURI.includes(window.location.host);
          
          if (!isPlaceholderURL) {
            // Handle IPFS URLs
            let metadataURL = tokenURI;
            if (tokenURI.startsWith('ipfs://')) {
              metadataURL = `https://ipfs.io/ipfs/${tokenURI.slice(7)}`;
            }
            
            // Fetch metadata (with timeout)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            try {
              const response = await fetch(metadataURL, { 
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
              });
              clearTimeout(timeoutId);
              
              if (response.ok) {
                const metadata = await response.json();
                name = metadata.name || name;
                description = metadata.description;
                
                // Handle IPFS image URLs
                if (metadata.image) {
                  image = metadata.image;
                  if (image && image.startsWith('ipfs://')) {
                    image = `https://ipfs.io/ipfs/${image.slice(7)}`;
                  }
                }
              }
            } catch (fetchError) {
              clearTimeout(timeoutId);
              console.log(`Failed to fetch metadata for token ${tokenId}:`, fetchError);
            }
          } else {
            console.log(`Skipping placeholder URL for token ${tokenId}: ${tokenURI}`);
            // For placeholder URLs, generate mock metadata
            name = `Mock NFT #${tokenId}`;
            description = `This is a mock NFT with token ID ${tokenId} from contract ${contractAddress}`;
            // Use a placeholder image service
            image = `https://picsum.photos/400/400?random=${tokenId}`;
          }
        }
      } catch (uriError) {
        console.log(`Failed to get tokenURI for token ${tokenId}:`, uriError);
      }
      
      return {
        contractAddress,
        tokenId,
        name,
        image,
        description,
        ownershipStatus,
        currentOwner: currentOwner.toLowerCase(),
        bridgeTransferHash,
        icrcTokenId
      };
    } catch (tokenError) {
      console.log(`Error processing token ${tokenId}:`, tokenError);
      return null;
    }
  };

  const toggleNFTSelection = (nft: SelectedNFT) => {
    // Selection rules based on mode:
    // - Import mode: Prevent selection of already-minted NFTs (they can't be imported again)
    // - Burn mode: Only allow selection of already-minted NFTs (they're the ones that can be burned)
    if (mode === 'import' && nft.ownershipStatus === 'already-minted') {
      return; // Can't import already-minted NFTs
    }
    if (mode === 'burn' && nft.ownershipStatus !== 'already-minted') {
      return; // Can only burn already-minted NFTs
    }
    
    const isSelected = selectedNFTs.some(
      selected => selected.contractAddress === nft.contractAddress && selected.tokenId === nft.tokenId
    );
    
    if (isSelected) {
      onSelectionChange(
        selectedNFTs.filter(
          selected => !(selected.contractAddress === nft.contractAddress && selected.tokenId === nft.tokenId)
        )
      );
    } else {
      onSelectionChange([...selectedNFTs, nft]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Select NFTs to Import</h3>
        <p className="text-gray-600">
          Choose which NFTs you'd like to bridge to the Internet Computer.
        </p>
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <p className="text-blue-800">
            <strong>💡 Smart Recovery:</strong> This scanner will find both NFTs you own and NFTs you previously 
            transferred to the bridge that failed to mint due to insufficient cycles. Ready-to-mint NFTs 
            can be processed faster since they skip the transfer step!
          </p>
          
          <details className="mt-2 group">
            <summary className="cursor-pointer text-blue-700 hover:text-blue-800 text-xs">
              🔍 Debug: What we're looking for...
            </summary>
            <div className="mt-2 text-xs text-blue-600 space-y-1">
              <p>• <strong>Owned NFTs:</strong> Currently in your wallet</p>
              <p>• <strong>Bridge NFTs:</strong> Transferred to known bridge addresses</p>
              <p>• <strong>Stranded NFTs:</strong> Transferred but not in expected bridge addresses</p>
              <p>• <strong>Scan Range:</strong> Last 50,000-100,000 blocks (adjust if needed)</p>
            </div>
          </details>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Collection Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">1. Select NFT Collection</h4>
          <button
            onClick={() => setShowManualEntry(!showManualEntry)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showManualEntry ? 'Browse Collections' : 'Enter Contract Manually'}
          </button>
        </div>

        {showManualEntry ? (
          <div className="space-y-3">
            <div className="flex gap-3">
              <input
                type="text"
                value={manualContract}
                onChange={(e) => setManualContract(e.target.value)}
                placeholder="Enter contract address (0x...)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleManualContractSubmit}
                disabled={!manualContract.trim() || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Load NFTs
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Enter the contract address of an NFT collection to see your NFTs
            </p>
            
            {/* Advanced Recovery Mode */}
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-amber-800 mb-2">
                  🔍 Advanced: Recover Specific Token ID
                </summary>
                <div className="space-y-2">
                  <p className="text-xs text-amber-700">
                    If you know a specific token ID that you transferred but don't see in the list, 
                    you can manually check it here:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Token ID (e.g., 1234)"
                      className="flex-1 px-2 py-1 text-sm border border-amber-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                      onKeyPress={async (e) => {
                        if (e.key === 'Enter' && manualContract.trim()) {
                          const tokenId = (e.target as HTMLInputElement).value.trim();
                          if (tokenId) {
                            console.log(`🔍 Manual recovery check for token ${tokenId} in contract ${manualContract}`);
                            await handleManualTokenRecovery(manualContract, tokenId);
                          }
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.querySelector('input[placeholder="Token ID (e.g., 1234)"]') as HTMLInputElement;
                        const tokenId = input?.value.trim();
                        if (tokenId && manualContract.trim()) {
                          handleManualTokenRecovery(manualContract, tokenId);
                        }
                      }}
                      className="px-2 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700"
                    >
                      Check
                    </button>
                  </div>
                </div>
              </details>
            </div>
          </div>
        ) : (
          <div>
            {loading && collections.length === 0 ? (
              <div className="p-6 text-center">
                <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading your NFT collections...</p>
              </div>
            ) : collections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {collections.map((collection) => (
                  <button
                    key={collection.contractAddress}
                    onClick={() => setSelectedCollection(collection)}
                    className={clsx(
                      'p-4 border rounded-lg text-left transition-colors',
                      selectedCollection?.contractAddress === collection.contractAddress
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="flex items-start space-x-3">
                      {collection.imageUrl && (
                        <img 
                          src={collection.imageUrl} 
                          alt={collection.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{collection.name}</p>
                        <p className="text-sm text-gray-600 truncate">
                          {collection.contractAddress.slice(0, 6)}...{collection.contractAddress.slice(-4)}
                        </p>
                        {collection.totalSupply && (
                          <p className="text-xs text-gray-500">Supply: {collection.totalSupply}</p>
                        )}
                      </div>
                      {collection.verified && (
                        <div className="text-blue-500">✓</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : !loading && nftDiscoveryService ? (
              <div className="p-6 text-center border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500">No NFT collections found for this account</p>
                <p className="text-sm text-gray-400 mt-1">
                  Try entering a contract address manually
                </p>
              </div>
            ) : (
              <div className="p-6 text-center border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500">NFT discovery service not configured</p>
                <p className="text-sm text-gray-400 mt-1">
                  Enter contract addresses manually to continue
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* NFT Selection within Collection */}
      {selectedCollection && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">
            2. Select NFTs from {selectedCollection.name}
          </h4>
          
          {loading && availableNFTs.length === 0 ? (
            <div className="p-6 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading NFTs from collection...</p>
            </div>
          ) : availableNFTs.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {availableNFTs.map((nft) => {
                const isSelected = selectedNFTs.some(
                  selected => selected.contractAddress === nft.contractAddress && selected.tokenId === nft.tokenId
                );
                
                // Visual styling based on ownership status
                const getOwnershipStyles = () => {
                  switch (nft.ownershipStatus) {
                    case 'ready-to-mint':
                      return {
                        border: 'border-amber-500 bg-amber-50',
                        ring: isSelected ? 'ring-2 ring-amber-200' : '',
                        badge: 'bg-amber-100 text-amber-800'
                      };
                    case 'bridged':
                      return {
                        border: 'border-purple-500 bg-purple-50',
                        ring: isSelected ? 'ring-2 ring-purple-200' : '',
                        badge: 'bg-purple-100 text-purple-800'
                      };
                    case 'already-minted':
                      return {
                        border: 'border-green-500 bg-green-50 opacity-60',
                        ring: '',
                        badge: 'bg-green-100 text-green-800'
                      };
                    case 'owned':
                    default:
                      return {
                        border: isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300',
                        ring: isSelected ? 'ring-2 ring-blue-200' : '',
                        badge: 'bg-green-100 text-green-800'
                      };
                  }
                };
                
                const styles = getOwnershipStyles();
                
                // Check if NFT is selectable based on mode
                const isSelectable = mode === 'import' 
                  ? nft.ownershipStatus !== 'already-minted'  // Import: can't select already-minted
                  : nft.ownershipStatus === 'already-minted'; // Burn: can only select already-minted
                
                return (
                  <div
                    key={`${nft.contractAddress}-${nft.tokenId}`}
                    className="relative"
                  >
                    <button
                      onClick={() => toggleNFTSelection(nft)}
                      disabled={!isSelectable}
                      className={clsx(
                        'w-full p-3 border rounded-lg text-left transition-all',
                        styles.border,
                        styles.ring,
                        !isSelectable ? 'cursor-not-allowed' : 'cursor-pointer'
                      )}
                    >
                      {/* Ownership Status Badge */}
                      <div className="absolute top-2 right-2 z-10">
                        <span className={clsx(
                          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                          styles.badge
                        )}>
                          {nft.ownershipStatus === 'ready-to-mint' && '⏳ Ready to Mint'}
                          {nft.ownershipStatus === 'bridged' && '🌉 Bridged'}
                          {nft.ownershipStatus === 'already-minted' && '✅ Already Minted'}
                          {(nft.ownershipStatus === 'owned' || !nft.ownershipStatus) && '✓ Owned'}
                        </span>
                      </div>
                      
                      {nft.image && (
                        <img 
                          src={nft.image} 
                          alt={nft.name}
                          className="w-full h-32 object-cover rounded-md mb-2"
                        />
                      )}
                      <p className="font-medium text-sm truncate pr-16">{nft.name}</p>
                      <p className="text-xs text-gray-600">#{nft.tokenId}</p>
                      
                      {/* Additional info for bridged/ready-to-mint NFTs */}
                      {nft.ownershipStatus === 'ready-to-mint' && (
                        <div className="mt-2 p-2 bg-amber-100 rounded text-xs">
                          <p className="font-medium text-amber-800">Ready to mint!</p>
                          <p className="text-amber-700">This NFT was transferred to the bridge and is ready to be minted on IC without additional transfer fees.</p>
                          {nft.bridgeTransferHash && (
                            <p className="text-amber-600 mt-1 truncate">
                              Transfer: {nft.bridgeTransferHash.slice(0, 10)}...
                            </p>
                          )}
                        </div>
                      )}
                      
                      {nft.ownershipStatus === 'bridged' && (
                        <div className="mt-2 p-2 bg-purple-100 rounded text-xs">
                          <p className="font-medium text-purple-800">In bridge</p>
                          <p className="text-purple-700">This NFT is currently held by the bridge.</p>
                          {nft.currentOwner && (
                            <p className="text-purple-600 mt-1 truncate">
                              Owner: {nft.currentOwner.slice(0, 10)}...
                            </p>
                          )}
                        </div>
                      )}
                      
                      {nft.ownershipStatus === 'already-minted' && (
                        <div className="mt-2 p-2 bg-green-100 rounded text-xs">
                          <p className="font-medium text-green-800">Already minted on IC!</p>
                          <p className="text-green-700">This NFT has already been successfully minted on the Internet Computer.</p>
                          {nft.icrcTokenId && (
                            <p className="text-green-600 mt-1">
                              ICRC-7 Token ID: {nft.icrcTokenId}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {isSelected && (
                        <div className="mt-2 text-xs font-medium text-blue-600">✓ Selected for bridge</div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">No NFTs found in this collection</p>
              <p className="text-sm text-gray-400 mt-1">
                You don't own any NFTs from this contract
              </p>
            </div>
          )}
        </div>
      )}

      {/* Selected NFTs Summary */}
      {selectedNFTs.length > 0 && (
        <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-green-900">Selected NFTs ({selectedNFTs.length})</h4>
          <div className="space-y-2">
            {selectedNFTs.map(nft => {
              const getProcessingInfo = () => {
                switch (nft.ownershipStatus) {
                  case 'ready-to-mint':
                    return {
                      badge: 'bg-amber-100 text-amber-800',
                      text: '⏳ Ready to mint - will skip transfer steps',
                      description: 'This NFT is already in the bridge and can be minted directly on IC.'
                    };
                  case 'bridged':
                    return {
                      badge: 'bg-purple-100 text-purple-800',
                      text: '🌉 In bridge - pending mint approval',
                      description: 'This NFT is held by the bridge but may need additional approvals.'
                    };
                  case 'owned':
                  default:
                    return {
                      badge: 'bg-blue-100 text-blue-800',
                      text: '🔄 Will transfer then mint',
                      description: 'This NFT will be transferred to the bridge then minted on IC.'
                    };
                }
              };

              const processInfo = getProcessingInfo();

              return (
                <div key={`${nft.contractAddress}-${nft.tokenId}`} className="p-2 bg-white rounded-md border">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{nft.name}</p>
                      <p className="text-xs text-gray-600 mb-1">Token ID: {nft.tokenId}</p>
                      
                      {/* Processing status */}
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={clsx(
                          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                          processInfo.badge
                        )}>
                          {processInfo.text}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-500">{processInfo.description}</p>
                      
                      {/* Additional info for special cases */}
                      {nft.bridgeTransferHash && (
                        <p className="text-xs text-gray-400 mt-1">
                          Previous transfer: {nft.bridgeTransferHash.slice(0, 16)}...
                        </p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => toggleNFTSelection(nft)}
                      className="text-red-600 hover:text-red-700 text-sm ml-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Summary of what will happen */}
          <div className="pt-3 border-t border-green-200">
            <h5 className="text-sm font-medium text-green-900 mb-2">Bridge Process Summary:</h5>
            <div className="text-xs text-green-800 space-y-1">
              {selectedNFTs.filter(nft => nft.ownershipStatus === 'ready-to-mint').length > 0 && (
                <p>• {selectedNFTs.filter(nft => nft.ownershipStatus === 'ready-to-mint').length} NFT(s) ready to mint directly (faster process)</p>
              )}
              {selectedNFTs.filter(nft => !nft.ownershipStatus || nft.ownershipStatus === 'owned').length > 0 && (
                <p>• {selectedNFTs.filter(nft => !nft.ownershipStatus || nft.ownershipStatus === 'owned').length} NFT(s) will be transferred then minted</p>
              )}
              {selectedNFTs.filter(nft => nft.ownershipStatus === 'bridged').length > 0 && (
                <p>• {selectedNFTs.filter(nft => nft.ownershipStatus === 'bridged').length} NFT(s) may need additional approvals</p>
              )}
              {availableNFTs.filter(nft => nft.ownershipStatus === 'already-minted').length > 0 && (
                <p className="text-green-600">ℹ️ Found {availableNFTs.filter(nft => nft.ownershipStatus === 'already-minted').length} NFT(s) already minted on IC (not selectable)</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Demo fallback for testing */}
      {!nftDiscoveryService && !selectedCollection && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 mb-2">
            <strong>Direct Blockchain Scanning Enabled</strong>
          </p>
          <p className="text-xs text-blue-700 mb-3">
            No NFT discovery service configured, but you can still enter contract addresses manually. 
            The app will scan the blockchain directly using your wallet to find your NFTs.
          </p>
          <button
            onClick={() => onSelectionChange([{
              contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
              tokenId: '1234',
              name: 'Demo Bored Ape #1234',
              image: 'https://ipfs.io/ipfs/QmRRPWG96cmgTn2qSzjwr2qvfNEuhunv6FNeMFGa9bx6mQ',
            }])}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Select Demo NFT (for testing)
          </button>
        </div>
      )}
    </div>
  );
}

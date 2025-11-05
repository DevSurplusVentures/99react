import { Connection, PublicKey } from '@solana/web3.js';
import type { SolanaCluster } from '../types/solana';
import { SOLANA_RPC_ENDPOINTS } from '../types/solana';

// Token Metadata Program ID (constant across all Solana networks)
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

/**
 * Simplified NFT interface for direct RPC discovery
 * This bypasses the problematic Metaplex SDK
 */
export interface SolanaNFT {
  mintAddress: string;
  tokenAddress: string;
  updateAuthority?: string;
  name: string;
  symbol?: string;
  uri?: string;
  sellerFeeBasisPoints?: number;
  image?: string;
  description?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  collectionAddress?: string;
  collectionName?: string;
  verified?: boolean;
  isMasterEdition?: boolean;
  supply?: number;
}

export interface SolanaNFTCollection {
  address: string;
  name: string;
  symbol?: string;
  image?: string;
  description?: string;
  nftCount: number;
  verified: boolean;  // Changed from optional to required
  updateAuthority?: string;
  nfts: SolanaNFT[];  // Added: array of NFTs in this collection
}

/**
 * Derive the Metadata PDA for a given mint address
 * The PDA is derived using seeds: ["metadata", Token Metadata Program ID, Mint Address]
 */
function getMetadataPDA(mintAddress: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mintAddress.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
  return pda;
}

/**
 * Parse Metaplex Token Metadata account to extract collection info
 * Based on the Metaplex Token Metadata account structure
 */
function parseMetadataAccount(data: Buffer): {
  name: string;
  symbol: string;
  uri: string;
  collectionAddress?: string;
  verified: boolean;
} | null {
  try {
    let offset = 1; // Skip the 'key' discriminator byte
    
    // Read update authority (32 bytes)
    offset += 32;
    
    // Read mint address (32 bytes)
    offset += 32;
    
    // Helper to read a length-prefixed string
    const readString = (): string => {
      const length = data.readUInt32LE(offset);
      offset += 4;
      const str = data.slice(offset, offset + length).toString('utf8').replace(/\0/g, '');
      offset += length;
      return str;
    };
    
    // Read name
    const name = readString();
    
    // Read symbol
    const symbol = readString();
    
    // Read uri
    const uri = readString();
    
    // Read seller_fee_basis_points (2 bytes)
    offset += 2;
    
    // Read creators (Option<Vec<Creator>>)
    const hasCreators = data[offset];
    offset += 1;
    
    if (hasCreators === 1) {
      const numCreators = data.readUInt32LE(offset);
      offset += 4;
      // Each creator is 34 bytes (32 pubkey + 1 verified + 1 share)
      offset += numCreators * 34;
    }
    
    // Read primary_sale_happened (1 byte)
    offset += 1;
    
    // Read is_mutable (1 byte)
    offset += 1;
    
    // Read edition_nonce (Option<u8>)
    const hasEditionNonce = data[offset];
    offset += 1;
    if (hasEditionNonce === 1) {
      offset += 1;
    }
    
    // Read token_standard (Option<TokenStandard>)
    const hasTokenStandard = data[offset];
    offset += 1;
    if (hasTokenStandard === 1) {
      offset += 1;
    }
    
    // Check for optional collection field (1 byte)
    let collectionAddress: string | undefined;
    let verified = false;
    
    const hasCollection = data[offset];
    offset += 1;
    
    console.log('[parseMetadataAccount] Collection field check:', {
      hasCollection,
      offsetBefore: offset - 1,
      nextBytes: Array.from(data.slice(offset, offset + 40))
    });
    
    if (hasCollection === 1) {
      // Metaplex Collection struct: verified (1 byte) THEN key (32 bytes)
      // Read verified flag FIRST (1 byte)
      verified = data[offset] === 1;
      offset += 1;
      
      // Then read collection mint address (32 bytes)
      const collectionBytes = data.slice(offset, offset + 32);
      const collectionPubkey = new PublicKey(collectionBytes);
      collectionAddress = collectionPubkey.toBase58();
      offset += 32;
      
      console.log('[parseMetadataAccount] Extracted collection:', {
        collectionAddress,
        verified,
        collectionBytes: Array.from(collectionBytes)
      });
    } else {
      console.log('[parseMetadataAccount] No collection field present');
    }
    
    return {
      name,
      symbol,
      uri,
      collectionAddress,
      verified,
    };
  } catch (error) {
    console.warn('Error parsing metadata account:', error);
    return null;
  }
}

/**
 * Fetch metadata account for a mint and extract collection info
 */
async function fetchNFTMetadata(
  connection: Connection,
  mintAddress: PublicKey
): Promise<{ collectionAddress?: string; verified: boolean; name?: string; symbol?: string; uri?: string } | null> {
  try {
    const metadataPDA = getMetadataPDA(mintAddress);
    const accountInfo = await connection.getAccountInfo(metadataPDA);
    
    if (!accountInfo || !accountInfo.data) {
      console.warn(`No metadata account found for mint ${mintAddress.toBase58()}`);
      return null;
    }
    
    // Parse the metadata account
    const parsed = parseMetadataAccount(accountInfo.data);
    
    if (!parsed) {
      return null;
    }
    
    return {
      collectionAddress: parsed.collectionAddress,
      verified: parsed.verified,
      name: parsed.name,
      symbol: parsed.symbol,
      uri: parsed.uri,
    };
  } catch (error) {
    console.warn(`Error fetching metadata for ${mintAddress.toBase58()}:`, error);
    return null;
  }
}

/**
 * Fetch user's NFTs using direct RPC calls (no Metaplex SDK)
 * This is more compatible with modern bundlers
 */
export async function fetchUserSolanaNFTs(
  publicKey: PublicKey,
  rpcEndpointOrCluster: string | SolanaCluster = 'mainnet-beta',
  options?: {
    includeOffChainMetadata?: boolean;
    maxNFTs?: number;
  }
): Promise<SolanaNFT[]> {
  try {
    // Determine if it's a full RPC endpoint or cluster name
    const rpcEndpoint = rpcEndpointOrCluster.startsWith('http') 
      ? rpcEndpointOrCluster 
      : SOLANA_RPC_ENDPOINTS[rpcEndpointOrCluster as SolanaCluster];
    
    const connection = new Connection(rpcEndpoint, 'confirmed');

    console.log(`[Direct RPC] Fetching NFTs for ${publicKey.toBase58()} from ${rpcEndpoint}...`);

    // Get all token accounts owned by the wallet
    const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: TOKEN_PROGRAM_ID,
    });

    console.log(`[Direct RPC] Found ${tokenAccounts.value.length} token accounts`);

    // Filter for NFTs (amount = 1, decimals = 0)
    const nftAccounts = tokenAccounts.value.filter(account => {
      const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
      const decimals = account.account.data.parsed.info.tokenAmount.decimals;
      const mintAddress = account.account.data.parsed.info.mint;
      
      console.log(`[Direct RPC] Token account filter check:`, {
        mint: mintAddress,
        amount,
        decimals,
        amountType: typeof amount,
        decimalsType: typeof decimals,
        passes: amount === 1 && decimals === 0
      });
      
      return amount === 1 && decimals === 0;
    });

    console.log(`[Direct RPC] Found ${nftAccounts.length} potential NFTs owned by ${publicKey.toBase58()}`);

    // Fetch metadata for each NFT to get collection info
    const nfts: SolanaNFT[] = [];
    
    for (const account of nftAccounts) {
      const mintAddress = account.account.data.parsed.info.mint;
      const tokenAddress = account.pubkey.toBase58();
      const owner = account.account.data.parsed.info.owner;
      const mintPubkey = new PublicKey(mintAddress);
      
      console.log(`[Direct RPC] NFT Token Account:`, {
        mint: mintAddress,
        tokenAccount: tokenAddress,
        owner: owner,
        yourWallet: publicKey.toBase58(),
        ownerMatches: owner === publicKey.toBase58(),
      });
      
      try {
        // Fetch metadata to get collection info
        const metadata = await fetchNFTMetadata(connection, mintPubkey);
        
        // Fetch off-chain metadata (image, description, attributes) if requested
        let image: string | undefined;
        let description: string | undefined;
        let attributes: any[] | undefined;
        
        if (metadata?.uri && options?.includeOffChainMetadata !== false) {
          try {
            console.log(`[fetchUserSolanaNFTs] Fetching NFT off-chain metadata from: ${metadata.uri}`);
            const response = await fetch(metadata.uri);
            if (response.ok) {
              const offChainData = await response.json();
              image = offChainData.image;
              description = offChainData.description;
              attributes = offChainData.attributes;
              console.log(`[fetchUserSolanaNFTs] ✓ Fetched NFT off-chain metadata for ${mintAddress}`, {
                hasImage: !!image,
                hasDescription: !!description,
                hasAttributes: !!attributes
              });
            }
          } catch (error) {
            console.warn(`[fetchUserSolanaNFTs] Failed to fetch off-chain metadata for ${mintAddress}:`, error);
          }
        }
        
        nfts.push({
          mintAddress,
          tokenAddress,
          name: metadata?.name || `NFT ${mintAddress.slice(0, 8)}...`,
          symbol: metadata?.symbol || 'NFT',
          uri: metadata?.uri,
          image,
          description,
          attributes,
          collectionAddress: metadata?.collectionAddress, // This will be undefined if no collection
          collectionName: metadata?.collectionAddress ? undefined : 'Uncategorized NFTs', // Only set if no collection
          verified: metadata?.verified ?? false,
        });
      } catch (error) {
        console.warn(`Failed to fetch metadata for ${mintAddress}:`, error);
        // Add NFT without metadata
        nfts.push({
          mintAddress,
          tokenAddress,
          name: `NFT ${mintAddress.slice(0, 8)}...`,
          symbol: 'NFT',
          verified: false,
        });
      }
    }

    // Apply limit if specified
    const limitedNfts = options?.maxNFTs ? nfts.slice(0, options.maxNFTs) : nfts;

    console.log(`[Direct RPC] Returning ${limitedNfts.length} NFTs`);
    return limitedNfts;

  } catch (error) {
    console.error('[Direct RPC] Error fetching NFTs:', error);
    throw new Error(
      error instanceof Error 
        ? `Failed to fetch NFTs: ${error.message}`
        : 'Failed to fetch NFTs from Solana'
    );
  }
}

/**
 * Group NFTs by collection
 */
export function groupNFTsByCollection(nfts: SolanaNFT[]): Map<string, SolanaNFT[]> {
  const grouped = new Map<string, SolanaNFT[]>();

  for (const nft of nfts) {
    // Use 'uncategorized' for NFTs without a collection address
    const collectionKey = nft.collectionAddress || 'uncategorized';
    const existing = grouped.get(collectionKey) || [];
    existing.push(nft);
    grouped.set(collectionKey, existing);
  }

  return grouped;
}

/**
 * Fetch collection metadata from the collection mint address
 */
async function fetchCollectionMetadata(
  connection: Connection,
  collectionAddress: string
): Promise<{ name?: string; symbol?: string; uri?: string } | null> {
  try {
    const collectionMint = new PublicKey(collectionAddress);
    const metadataPDA = getMetadataPDA(collectionMint);
    const accountInfo = await connection.getAccountInfo(metadataPDA);
    
    if (!accountInfo || !accountInfo.data) {
      console.warn(`No metadata account found for collection ${collectionAddress}`);
      return null;
    }
    
    // Parse the metadata account
    const parsed = parseMetadataAccount(accountInfo.data);
    
    if (!parsed) {
      return null;
    }
    
    return {
      name: parsed.name,
      symbol: parsed.symbol,
      uri: parsed.uri,
    };
  } catch (error) {
    console.warn(`Error fetching collection metadata for ${collectionAddress}:`, error);
    return null;
  }
}

/**
 * Get collection info from NFTs
 */
function getCollectionInfo(collectionAddress: string, nfts: SolanaNFT[]): SolanaNFTCollection {
  const firstNFT = nfts[0];
  
  return {
    address: collectionAddress,
    name: firstNFT?.collectionName || 'Uncategorized',
    symbol: firstNFT?.symbol,
    image: firstNFT?.image,
    description: firstNFT?.description,
    nftCount: nfts.length,
    verified: firstNFT?.verified || false,
    updateAuthority: firstNFT?.updateAuthority,
    nfts: nfts, // Include the NFTs array in the collection object
  };
}

/**
 * Fetch collections with their NFTs
 */
export async function fetchCollectionsWithNFTs(
  publicKey: PublicKey,
  rpcEndpointOrCluster: string | SolanaCluster = 'mainnet-beta',
  options?: {
    includeOffChainMetadata?: boolean;
    maxNFTs?: number;
  }
): Promise<{ collections: SolanaNFTCollection[]; nftsByCollection: Map<string, SolanaNFT[]> }> {
  // Determine if it's a full RPC endpoint or cluster name
  const rpcEndpoint = rpcEndpointOrCluster.startsWith('http') 
    ? rpcEndpointOrCluster 
    : SOLANA_RPC_ENDPOINTS[rpcEndpointOrCluster as SolanaCluster];
  
  const connection = new Connection(rpcEndpoint, 'confirmed');
  
  // Fetch all NFTs
  const nfts = await fetchUserSolanaNFTs(publicKey, rpcEndpointOrCluster, options);

  // Group by collection
  const nftsByCollection = groupNFTsByCollection(nfts);

  // Create collection info objects with proper metadata
  const collections = await Promise.all(
    Array.from(nftsByCollection.entries()).map(async ([address, collectionNfts]) => {
      // Get basic collection info from NFTs
      const collection = getCollectionInfo(address, collectionNfts);
      
      // Try to fetch actual collection metadata from the collection mint
      const collectionMetadata = await fetchCollectionMetadata(connection, address);
      
      // Override with collection metadata if available
      if (collectionMetadata) {
        collection.name = collectionMetadata.name || collection.name;
        collection.symbol = collectionMetadata.symbol || collection.symbol;
        
        // Fetch collection image from off-chain metadata if URI available
        if (collectionMetadata.uri && options?.includeOffChainMetadata !== false) {
          try {
            console.log(`[fetchCollectionsWithNFTs] Fetching collection image from: ${collectionMetadata.uri}`);
            const response = await fetch(collectionMetadata.uri);
            if (response.ok) {
              const offChainData = await response.json();
              collection.image = offChainData.image;
              collection.description = offChainData.description;
              console.log(`[fetchCollectionsWithNFTs] ✓ Fetched collection image:`, {
                hasImage: !!collection.image,
                hasDescription: !!collection.description
              });
            }
          } catch (error) {
            console.warn(`[fetchCollectionsWithNFTs] Failed to fetch collection off-chain metadata:`, error);
          }
        }
      }
      
      console.log(`[fetchCollectionsWithNFTs] Collection ${address}:`, {
        name: collection.name,
        symbol: collection.symbol,
        nftCount: collection.nftCount,
        nftsArrayLength: collection.nfts.length,
        firstNFT: collection.nfts[0],
      });
      return collection;
    })
  );

  // Sort collections by NFT count (descending)
  collections.sort((a, b) => b.nftCount - a.nftCount);

  return { collections, nftsByCollection };
}

/**
 * Validate a Solana mint address
 */
export function isValidMintAddress(address: string): boolean {
  try {
    const pubkey = new PublicKey(address);
    return PublicKey.isOnCurve(pubkey.toBytes());
  } catch {
    return false;
  }
}

/**
 * Fetch a single NFT by mint address
 */
export async function fetchNFTByMint(
  mintAddress: string,
  rpcEndpointOrCluster: string | SolanaCluster = 'mainnet-beta',
  includeOffChainMetadata: boolean = true
): Promise<SolanaNFT | null> {
  try {
    if (!isValidMintAddress(mintAddress)) {
      throw new Error('Invalid mint address');
    }

    // Get RPC endpoint
    const rpcEndpoint = typeof rpcEndpointOrCluster === 'string' && rpcEndpointOrCluster.startsWith('http')
      ? rpcEndpointOrCluster
      : SOLANA_RPC_ENDPOINTS[rpcEndpointOrCluster as SolanaCluster];

    const connection = new Connection(rpcEndpoint, 'confirmed');
    const mintPubkey = new PublicKey(mintAddress);

    console.log(`[fetchNFTByMint] Fetching metadata for ${mintAddress}...`);
    console.log(`[fetchNFTByMint] Using RPC endpoint: ${rpcEndpoint}`);

    // Get metadata account address (PDA)
    const metadataPDA = getMetadataPDA(mintPubkey);

    // Fetch the metadata account
    const accountInfo = await connection.getAccountInfo(metadataPDA);
    if (!accountInfo || !accountInfo.data) {
      console.log(`[fetchNFTByMint] No metadata account found for ${mintAddress}`);
      console.log(`[fetchNFTByMint] Metadata address would be: ${metadataPDA.toBase58()}`);
      return null;
    }

    console.log(`[fetchNFTByMint] Found metadata account, data length: ${accountInfo.data.length} bytes`);

    // Use the existing working parser
    const parsed = parseMetadataAccount(accountInfo.data);
    if (!parsed) {
      console.log(`[fetchNFTByMint] Failed to parse metadata`);
      return null;
    }

    console.log(`[fetchNFTByMint] Parsed metadata:`, parsed);

    // Fetch off-chain metadata if URI available
    let image: string | undefined;
    let description: string | undefined;
    let attributes: any[] | undefined;
    
    if (parsed.uri && includeOffChainMetadata) {
      try {
        const response = await fetch(parsed.uri);
        if (response.ok) {
          const offChainData = await response.json();
          image = offChainData.image;
          description = offChainData.description;
          attributes = offChainData.attributes;
          console.log(`[fetchNFTByMint] Fetched off-chain metadata from ${parsed.uri}`);
        }
      } catch (error) {
        console.log(`[fetchNFTByMint] Could not fetch off-chain metadata:`, error);
      }
    }

    const result: SolanaNFT = {
      mintAddress,
      tokenAddress: mintAddress,
      name: parsed.name,
      symbol: parsed.symbol,
      uri: parsed.uri,
      collectionAddress: parsed.collectionAddress,
      verified: parsed.verified,
      image,
      description,
      attributes,
    };

    console.log(`[fetchNFTByMint] Final result:`, result);

    return result;

  } catch (error) {
    console.error('[fetchNFTByMint] Error fetching NFT by mint:', error);
    return null;
  }
}

/**
 * Detect stuck/trapped NFTs that were transferred to approval addresses
 * but never completed minting on IC
 * 
 * @param userWallet - User's Solana wallet public key
 * @param connection - Solana RPC connection
 * @param orchestratorActor - Orchestrator canister actor for approval address calculation
 * @param userPrincipal - User's IC principal for approval address derivation
 * @param collectionAddress - Optional: Check specific collection only
 * @returns Array of stuck NFTs with approval addresses
 */
export async function detectStuckSolanaNFTs(
  userWallet: PublicKey,
  connection: Connection,
  orchestratorActor: any, // OrchestratorService type
  userPrincipal: any, // Principal type
  collectionAddress?: string
): Promise<Array<SolanaNFT & { approvalAddress: string; mintRequestId?: bigint }>> {
  console.log('[Recovery] Starting stuck NFT detection...');
  console.log('  User wallet:', userWallet.toBase58());
  console.log('  User principal:', userPrincipal.toString());
  console.log('  Collection filter:', collectionAddress || 'all collections');

  const stuckNFTs: Array<SolanaNFT & { approvalAddress: string; mintRequestId?: bigint }> = [];

  try {
    // Get all collections and NFTs from local storage cache
    // This represents NFTs the user previously owned
    const cachedMintAddresses = getLocalStorageMintCache();
    console.log(`[Recovery] Found ${cachedMintAddresses.length} cached mint addresses to check`);

    if (cachedMintAddresses.length === 0) {
      console.log('[Recovery] No cached NFTs found - nothing to recover');
      return stuckNFTs;
    }

    // Check each cached NFT
    for (const cachedNFT of cachedMintAddresses) {
      try {
        const mintAddress = cachedNFT.mintAddress;
        const nftCollectionAddress = cachedNFT.collectionAddress;
        
        // Skip if filtering by collection and this NFT is from a different collection
        if (collectionAddress && nftCollectionAddress !== collectionAddress) {
          console.log(`[Recovery] Skipping ${mintAddress} - different collection`);
          continue;
        }
        
        console.log(`[Recovery] Checking NFT: ${mintAddress} (collection: ${nftCollectionAddress})`);
        
        // Get the approval address for this NFT from orchestrator
        const approvalResult = await orchestratorActor.get_remote_approval_address(
          {
            remoteNFTPointer: {
              tokenId: solanaTokenIdFromMintAddress(mintAddress),
              contract: nftCollectionAddress,
              network: { Solana: [{ Devnet: null }] }, // TODO: Make dynamic
            },
            account: { owner: userPrincipal, subaccount: [] },
          },
          [] // No spender account
        );

        // approvalResult is [] | [string] (optional)
        if (!approvalResult || approvalResult.length === 0) {
          console.log(`[Recovery]   Skipping - no approval address`);
          continue;
        }

        const approvalAddressStr = approvalResult[0];
        const approvalAddress = new PublicKey(approvalAddressStr);
        console.log(`[Recovery]   Approval address: ${approvalAddressStr}`);

        // Check if NFT is currently in the approval address
        const mintPubkey = new PublicKey(mintAddress);
        const { getAssociatedTokenAddress } = await import('@solana/spl-token');
        const approvalATA = await getAssociatedTokenAddress(mintPubkey, approvalAddress);

        const tokenAccountInfo = await connection.getAccountInfo(approvalATA);
        
        if (!tokenAccountInfo) {
          console.log(`[Recovery]   Not stuck - approval token account doesn't exist`);
          continue;
        }

        // Parse token account to get amount
        const amount = tokenAccountInfo.data.readBigUInt64LE(64); // Token amount at offset 64
        
        if (amount !== BigInt(1)) {
          console.log(`[Recovery]   Not stuck - approval address has ${amount} tokens (expected 1)`);
          continue;
        }

        console.log(`[Recovery]   ⚠️ STUCK NFT DETECTED - NFT is in approval address!`);

        // TODO: Check if already minted on IC by querying the ckNFT canister
        // For now, assume it's stuck if it's in the approval address

        // Get mint request ID from local storage if available
        const mintRequestId = getLocalStorageMintRequestId(mintAddress);

        // Fetch NFT metadata
        const nftMetadata = await fetchStuckNFTMetadata(mintPubkey, connection);
        
        stuckNFTs.push({
          ...nftMetadata,
          approvalAddress: approvalAddressStr,
          mintRequestId: mintRequestId ? BigInt(mintRequestId) : undefined,
        });

        console.log(`[Recovery]   Added to stuck NFTs list`);
      } catch (nftError) {
        console.error(`[Recovery] Error checking NFT ${cachedNFT.mintAddress}:`, nftError);
        // Continue with next NFT
      }
    }

    console.log(`[Recovery] Detection complete. Found ${stuckNFTs.length} stuck NFT(s)`);
    return stuckNFTs;

  } catch (error) {
    console.error('[Recovery] Error detecting stuck NFTs:', error);
    throw error;
  }
}

interface CachedNFT {
  mintAddress: string;
  collectionAddress: string;
}

/**
 * Helper: Get cached NFT info from local storage
 * These represent NFTs the user previously owned/selected
 */
function getLocalStorageMintCache(): CachedNFT[] {
  try {
    const cache = localStorage.getItem('solana_nft_history');
    if (!cache) return [];
    
    const parsed = JSON.parse(cache);
    
    // Handle legacy format (array of strings) - convert to new format
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
      console.log('[Recovery] Migrating legacy cache format');
      return parsed.map((mintAddress: string) => ({
        mintAddress,
        collectionAddress: 'unknown' // Legacy entries don't have collection info
      }));
    }
    
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Helper: Add NFT to cache
 */
export function addToLocalStorageMintCache(mintAddress: string, collectionAddress?: string): void {
  try {
    const cache = getLocalStorageMintCache();
    const exists = cache.find(nft => nft.mintAddress === mintAddress);
    
    if (!exists) {
      cache.push({
        mintAddress,
        collectionAddress: collectionAddress || 'unknown'
      });
      localStorage.setItem('solana_nft_history', JSON.stringify(cache));
    }
  } catch (error) {
    console.error('[Recovery] Error updating mint cache:', error);
  }
}

/**
 * Helper: Get mint request ID from local storage
 */
function getLocalStorageMintRequestId(mintAddress: string): string | null {
  try {
    return localStorage.getItem(`solana_mint_request_${mintAddress}`);
  } catch {
    return null;
  }
}

/**
 * Comprehensive collection discovery for manual entry.
 * Implements the full flow:
 * 1. Check if ckNFT canister exists for collection
 * 2. Query user's wallet for NFTs from this collection
 * 3. Query approval address for stuck NFTs from this collection  
 * 4. Check ckNFT canister to filter out already-minted NFTs
 * 5. Return combined list with ownership states
 * 
 * @param userWallet - User's Solana wallet public key
 * @param connection - Solana RPC connection
 * @param orchestratorActor - Orchestrator canister actor
 * @param userPrincipal - User's IC principal
 * @param collectionAddress - Collection mint address
 * @returns Object with canister info and NFTs (wallet + approval address)
 */
export async function discoverCollectionNFTsComprehensive(
  userWallet: PublicKey,
  connection: Connection,
  orchestratorActor: any,
  userPrincipal: any,
  collectionAddress: string,
  network: { Solana: [{ Devnet: null } | { Testnet: null } | { Mainnet: null }] }
): Promise<{
  ckNFTCanister: string | null;
  nftsInWallet: SolanaNFT[];
  nftsAtApproval: Array<SolanaNFT & { approvalAddress: string; mintRequestId?: bigint }>;
  alreadyMinted: Set<string>; // Set of mint addresses already minted on IC
}> {
  console.log('[Comprehensive Discovery] Starting for collection:', collectionAddress);
  
  const result = {
    ckNFTCanister: null as string | null,
    nftsInWallet: [] as SolanaNFT[],
    nftsAtApproval: [] as Array<SolanaNFT & { approvalAddress: string; mintRequestId?: bigint }>,
    alreadyMinted: new Set<string>(),
  };

  try {
    // Step 1: Check if ckNFT canister exists for this collection
    console.log('[Comprehensive Discovery] Step 1: Checking for ckNFT canister...');
    const canisterResult = await orchestratorActor.get_ck_nft_canister([
      {
        contract: collectionAddress,
        network,
      }
    ]);

    if (!canisterResult || canisterResult.length === 0 || !canisterResult[0] || canisterResult[0].length === 0) {
      console.log('[Comprehensive Discovery] No ckNFT canister found for this collection');
      throw new Error('No ckNFT canister exists for this collection. The collection has not been bridged yet.');
    }

    const ckNFTCanisterPrincipal = canisterResult[0][0];
    result.ckNFTCanister = ckNFTCanisterPrincipal.toString();
    console.log('[Comprehensive Discovery] ✓ Found ckNFT canister:', result.ckNFTCanister);

    // Step 2: Query user's wallet for NFTs from this collection
    console.log('[Comprehensive Discovery] Step 2: Querying user wallet...');
    const { TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(userWallet, {
      programId: TOKEN_PROGRAM_ID,
    });

    const nftAccounts = tokenAccounts.value.filter(account => {
      const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
      const decimals = account.account.data.parsed.info.tokenAmount.decimals;
      return amount === 1 && decimals === 0;
    });

    console.log(`[Comprehensive Discovery] Found ${nftAccounts.length} potential NFTs in wallet`);

    for (const account of nftAccounts) {
      const mintAddress = account.account.data.parsed.info.mint;
      try {
        const metadata = await fetchStuckNFTMetadata(mintAddress, connection);
        if (metadata && metadata.collectionAddress === collectionAddress) {
          result.nftsInWallet.push(metadata);
          console.log(`[Comprehensive Discovery] ✓ Wallet NFT: ${metadata.name}`);
        }
      } catch (error) {
        console.error(`[Comprehensive Discovery] Error fetching metadata for ${mintAddress}:`, error);
      }
    }

    // Step 3: Query approval address for stuck NFTs
    console.log('[Comprehensive Discovery] Step 3: Querying approval address...');
    const stuckNFTs = await discoverNFTsAtApprovalAddress(
      userWallet,
      connection,
      orchestratorActor,
      userPrincipal,
      collectionAddress
    );
    result.nftsAtApproval = stuckNFTs;
    console.log(`[Comprehensive Discovery] Found ${stuckNFTs.length} NFTs at approval address`);

    // Step 4: Check ckNFT canister for already-minted NFTs
    console.log('[Comprehensive Discovery] Step 4: Checking ckNFT canister for minted NFTs...');
    // TODO: Query ckNFT canister using icrc7_owner_of for each token ID
    // This requires importing ckNFT canister interface and converting mint addresses to token IDs

    console.log('[Comprehensive Discovery] Summary:');
    console.log(`  - ckNFT Canister: ${result.ckNFTCanister}`);
    console.log(`  - NFTs in wallet: ${result.nftsInWallet.length}`);
    console.log(`  - NFTs at approval: ${result.nftsAtApproval.length}`);
    console.log(`  - Already minted: ${result.alreadyMinted.size}`);

    return result;
  } catch (error) {
    console.error('[Comprehensive Discovery] Error:', error);
    throw error;
  }
}

/**
 * Helper: Store mint request ID for recovery
 */
export function storeLocalStorageMintRequestId(mintAddress: string, mintRequestId: bigint): void {
  try {
    localStorage.setItem(`solana_mint_request_${mintAddress}`, mintRequestId.toString());
  } catch (error) {
    console.error('[Recovery] Error storing mint request ID:', error);
  }
}

/**
 * Discover NFTs at the approval address (for recovery).
 * Queries the approval address's token accounts instead of the user's wallet.
 * 
 * @param userWallet - User's Solana wallet (for reference)
 * @param connection - Solana RPC connection
 * @param orchestratorActor - Orchestrator canister actor
 * @param userPrincipal - User's IC principal
 * @param collectionAddress - Optional: Filter by collection
 * @returns Array of NFTs found at approval address
 */
/**
 * Check if a specific NFT is stuck at its approval address
 * 
 * @param mintAddress - The NFT's mint address
 * @param connection - Solana RPC connection
 * @param orchestratorActor - Orchestrator canister actor
 * @param userPrincipal - User's IC principal
 * @param collectionAddress - The collection address
 * @returns NFT data with approval address if stuck, null otherwise
 */
export async function checkNFTAtApprovalAddress(
  mintAddress: string,
  connection: Connection,
  orchestratorActor: any,
  userPrincipal: any,
  collectionAddress: string,
  cluster?: 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet'
): Promise<(SolanaNFT & { approvalAddress: string; mintRequestId?: bigint }) | null> {
  try {
    const mintPubkey = new PublicKey(mintAddress);
    const tokenId = solanaTokenIdFromMintAddress(mintAddress);
    
    console.log(`[Recovery] Checking NFT ${mintAddress} (tokenId: ${tokenId})`);
    
    // Determine network based on cluster - default to mainnet
    // Treat testnet and localnet as devnet for orchestrator purposes
    const normalizedCluster = cluster === 'mainnet-beta' ? 'mainnet-beta' : 'devnet';
    const targetNetwork = normalizedCluster === 'mainnet-beta' 
      ? { Solana: [{ Mainnet: null }] as const }
      : { Solana: [{ Devnet: null }] as const };
    
    console.log('🔥🔥🔥 [RECOVERY] CALLING get_remote_approval_address WITH:', {
      mintAddress,
      tokenId: tokenId.toString(),
      contract: collectionAddress,
      network: targetNetwork,
      cluster,
      normalizedCluster,
      rawNetwork: JSON.stringify(targetNetwork),
      userPrincipal: userPrincipal.toString(),
    });
    
    // Get the approval address for THIS specific NFT
    const approvalResult = await orchestratorActor.get_remote_approval_address(
      {
        remoteNFTPointer: {
          tokenId,
          contract: collectionAddress,
          network: targetNetwork,
        },
        account: { owner: userPrincipal, subaccount: [] },
      },
      []
    );

    if (!approvalResult || approvalResult.length === 0) {
      console.log(`[Recovery] Could not get approval address for ${mintAddress}`);
      return null;
    }

    const approvalAddressStr = approvalResult[0];
    const approvalAddress = new PublicKey(approvalAddressStr);
    console.log(`[Recovery] Approval address for ${mintAddress}: ${approvalAddressStr}`);

    // Check if this NFT is at the approval address
    const { getAssociatedTokenAddress } = await import('@solana/spl-token');
    const approvalATA = await getAssociatedTokenAddress(mintPubkey, approvalAddress);

    const tokenAccountInfo = await connection.getAccountInfo(approvalATA);
    
    if (!tokenAccountInfo) {
      console.log(`[Recovery] No token account at approval address for ${mintAddress}`);
      return null;
    }

    // Check if amount === 1
    const data = tokenAccountInfo.data;
    const amount = data.readBigUInt64LE(64);
    
    console.log(`[Recovery] Token amount at approval address: ${amount}`);
    
    if (amount !== BigInt(1)) {
      console.log(`[Recovery] NFT not stuck - amount is ${amount}, expected 1`);
      return null;
    }

    // NFT is stuck! Fetch its metadata
    const metadata = await fetchStuckNFTMetadata(mintPubkey, connection);
    
    // Check for stored mint request ID
    const mintRequestIdStr = getLocalStorageMintRequestId(mintAddress);
    const mintRequestId = mintRequestIdStr ? BigInt(mintRequestIdStr) : undefined;

    console.log(`[Recovery] ✓ Found stuck NFT: ${metadata.name} at ${approvalAddressStr}`);

    return {
      ...metadata,
      approvalAddress: approvalAddressStr,
      mintRequestId,
    };
  } catch (error) {
    console.error(`[Recovery] Error checking NFT ${mintAddress}:`, error);
    return null;
  }
}

/**
 * Discover NFTs at approval addresses (legacy function - uses cache)
 * Now deprecated in favor of checkNFTAtApprovalAddress for specific NFTs
 */
export async function discoverNFTsAtApprovalAddress(
  userWallet: PublicKey,
  connection: Connection,
  orchestratorActor: any,
  userPrincipal: any,
  collectionAddress?: string,
  cluster?: 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet'
): Promise<Array<SolanaNFT & { approvalAddress: string; mintRequestId?: bigint }>> {
  console.log('[Recovery] Discovering NFTs at approval address...');
  console.log('  User wallet:', userWallet.toBase58());
  console.log('  User principal:', userPrincipal.toString());
  console.log('  Collection filter:', collectionAddress || 'all collections');
  console.log('  Cluster:', cluster);

  const recoveredNFTs: Array<SolanaNFT & { approvalAddress: string; mintRequestId?: bigint }> = [];

  try {
    // Determine network based on cluster - default to mainnet
    // Treat testnet and localnet as devnet for orchestrator purposes
    const normalizedCluster = cluster === 'mainnet-beta' ? 'mainnet-beta' : 'devnet';
    const targetNetwork = normalizedCluster === 'mainnet-beta' 
      ? { Solana: [{ Mainnet: null }] as const }
      : { Solana: [{ Devnet: null }] as const };
    
    console.log('🔥🔥🔥 [RECOVERY - DISCOVERY] CALLING get_remote_approval_address WITH:', {
      tokenId: '0 (placeholder)',
      contract: collectionAddress || '11111111111111111111111111111111',
      network: targetNetwork,
      cluster,
      normalizedCluster,
      rawNetwork: JSON.stringify(targetNetwork),
      userPrincipal: userPrincipal.toString(),
    });
    
    // First, get the approval address for this user
    // The approval address is deterministic based on user principal
    // We can use a dummy NFT pointer since the address only depends on the account
    const approvalResult = await orchestratorActor.get_remote_approval_address(
      {
        remoteNFTPointer: {
          tokenId: BigInt(0), // Placeholder - approval address only depends on account
          contract: collectionAddress || '11111111111111111111111111111111', // Placeholder
          network: targetNetwork,
        },
        account: { owner: userPrincipal, subaccount: [] },
      },
      []
    );

    // approvalResult is [] | [string] (optional)
    if (!approvalResult || approvalResult.length === 0) {
      console.log('[Recovery] Could not get approval address - empty result');
      return recoveredNFTs;
    }

    const approvalAddressStr = approvalResult[0];
    const approvalAddress = new PublicKey(approvalAddressStr);
    console.log('[Recovery] Approval address:', approvalAddressStr);
    console.log('[Recovery] Approval address PublicKey:', approvalAddress.toBase58());

    // Query all token accounts owned by the approval address
    const { TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
    console.log('[Recovery] Querying token accounts for approval address...');
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(approvalAddress, {
      programId: TOKEN_PROGRAM_ID,
    });

    console.log(`[Recovery] Found ${tokenAccounts.value.length} token accounts at approval address`);
    
    // Debug: Log all token accounts
    for (const account of tokenAccounts.value) {
      const mintAddress = account.account.data.parsed.info.mint;
      const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
      const decimals = account.account.data.parsed.info.tokenAmount.decimals;
      console.log(`[Recovery]   Token account: mint=${mintAddress}, amount=${amount}, decimals=${decimals}`);
    }

    // Filter for NFTs (amount = 1, decimals = 0)
    const nftAccounts = tokenAccounts.value.filter(account => {
      const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
      const decimals = account.account.data.parsed.info.tokenAmount.decimals;
      return amount === 1 && decimals === 0;
    });

    console.log(`[Recovery] Found ${nftAccounts.length} potential NFTs at approval address`);

    // Fetch metadata for each NFT
    for (const account of nftAccounts) {
      const mintAddress = account.account.data.parsed.info.mint;
      
      try {
        const metadata = await fetchStuckNFTMetadata(mintAddress, connection);
        
        if (!metadata) {
          console.log(`[Recovery] No metadata for ${mintAddress}`);
          continue;
        }

        // Filter by collection if specified
        if (collectionAddress && metadata.collectionAddress !== collectionAddress) {
          console.log(`[Recovery] Skipping ${mintAddress} - different collection`);
          continue;
        }

        // Check if we have a stored mint request ID
        const mintRequestIdStr = getLocalStorageMintRequestId(mintAddress);
        const mintRequestId = mintRequestIdStr ? BigInt(mintRequestIdStr) : undefined;

        recoveredNFTs.push({
          ...metadata,
          approvalAddress: approvalAddressStr,
          mintRequestId,
        });

        console.log(`[Recovery] ✓ Recovered NFT: ${metadata.name} (${mintAddress})`);
      } catch (error) {
        console.error(`[Recovery] Error fetching metadata for ${mintAddress}:`, error);
      }
    }

    console.log(`[Recovery] Total recovered NFTs: ${recoveredNFTs.length}`);
    return recoveredNFTs;
  } catch (error) {
    console.error('[Recovery] Error discovering NFTs at approval address:', error);
    return recoveredNFTs;
  }
}

/**
 * Helper: Convert Solana mint address to BigInt token ID
 * Same logic as solanaTokenIdFromMint utility
 */
function solanaTokenIdFromMintAddress(mintAddress: string): bigint {
  const pubkey = new PublicKey(mintAddress);
  const bytes = pubkey.toBytes();
  
  let tokenId = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    tokenId = tokenId * BigInt(256) + BigInt(bytes[i]);
  }
  
  return tokenId;
}

/**
 * Helper: Fetch NFT metadata for a stuck NFT
 */
async function fetchStuckNFTMetadata(mintPubkey: PublicKey, connection: Connection): Promise<SolanaNFT> {
  try {
    const metadataPDA = getMetadataPDA(mintPubkey);
    const metadataAccount = await connection.getAccountInfo(metadataPDA);
    
    if (!metadataAccount) {
      return {
        mintAddress: mintPubkey.toBase58(),
        tokenAddress: mintPubkey.toBase58(),
        name: `NFT ${mintPubkey.toBase58().slice(0, 8)}...`,
        symbol: 'STUCK',
      };
    }

    const parsed = parseMetadataAccount(metadataAccount.data);
    if (!parsed) {
      return {
        mintAddress: mintPubkey.toBase58(),
        tokenAddress: mintPubkey.toBase58(),
        name: `NFT ${mintPubkey.toBase58().slice(0, 8)}...`,
        symbol: 'STUCK',
      };
    }

    // Fetch off-chain metadata if URI available
    let image: string | undefined;
    let description: string | undefined;
    let attributes: any[] | undefined;
    
    if (parsed.uri) {
      try {
        console.log(`[fetchStuckNFTMetadata] Fetching off-chain metadata from: ${parsed.uri}`);
        const response = await fetch(parsed.uri);
        if (!response.ok) {
          console.warn(`[fetchStuckNFTMetadata] HTTP ${response.status} when fetching ${parsed.uri}`);
        } else {
          const metadata = await response.json();
          image = metadata.image;
          description = metadata.description;
          attributes = metadata.attributes;
          console.log(`[fetchStuckNFTMetadata] ✓ Successfully fetched off-chain metadata`, {
            hasImage: !!image,
            hasDescription: !!description,
            hasAttributes: !!attributes
          });
        }
      } catch (error) {
        // Log the error but continue - NFT can still be displayed without image
        console.warn(`[fetchStuckNFTMetadata] Failed to fetch off-chain metadata from ${parsed.uri}:`, error);
      }
    } else {
      console.log(`[fetchStuckNFTMetadata] No URI in metadata, skipping off-chain fetch`);
    }

    return {
      mintAddress: mintPubkey.toBase58(),
      tokenAddress: mintPubkey.toBase58(),
      name: parsed.name,
      symbol: parsed.symbol,
      uri: parsed.uri,
      image,
      description,
      attributes,
      collectionAddress: parsed.collectionAddress,
      verified: parsed.verified,
    };
  } catch (error) {
    console.error('[Recovery] Error fetching NFT metadata:', error);
    return {
      mintAddress: mintPubkey.toBase58(),
      tokenAddress: mintPubkey.toBase58(),
      name: `NFT ${mintPubkey.toBase58().slice(0, 8)}...`,
      symbol: 'STUCK',
    };
  }
}

import { Connection, PublicKey } from '@solana/web3.js';
import { Metaplex } from '@metaplex-foundation/js';
import type { SolanaCluster } from '../types/solana';
import { SOLANA_RPC_ENDPOINTS } from '../types/solana';

// Types
export interface SolanaNFTMetadata {
  name: string;
  symbol?: string;
  description?: string;
  image?: string;
  animationUrl?: string;
  externalUrl?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties?: {
    category?: string;
    creators?: Array<{
      address: string;
      share: number;
      verified?: boolean;
    }>;
    files?: Array<{
      uri: string;
      type: string;
    }>;
  };
}

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
  attributes?: SolanaNFTMetadata['attributes'];
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
  verified?: boolean;
  updateAuthority?: string;
}

/**
 * Cache for NFT metadata to reduce RPC calls
 */
class NFTCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

const nftCache = new NFTCache();

/**
 * Fetch off-chain metadata from URI
 */
async function fetchOffChainMetadata(uri: string): Promise<SolanaNFTMetadata | null> {
  try {
    // Check cache first
    const cached = nftCache.get(`metadata:${uri}`);
    if (cached) return cached;

    // Handle IPFS URIs
    let fetchUrl = uri;
    if (uri.startsWith('ipfs://')) {
      fetchUrl = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }

    const response = await fetch(fetchUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch metadata from ${uri}: ${response.statusText}`);
      return null;
    }

    const metadata = await response.json();
    
    // Cache the result
    nftCache.set(`metadata:${uri}`, metadata);
    
    return metadata as SolanaNFTMetadata;
  } catch (error) {
    console.error(`Error fetching off-chain metadata from ${uri}:`, error);
    return null;
  }
}

/**
 * Fetch user's NFTs from Solana using Metaplex
 */
export async function fetchUserSolanaNFTs(
  publicKey: PublicKey,
  cluster: SolanaCluster = 'mainnet-beta',
  options?: {
    includeOffChainMetadata?: boolean;
    maxNFTs?: number;
  }
): Promise<SolanaNFT[]> {
  try {
    const rpcEndpoint = SOLANA_RPC_ENDPOINTS[cluster];
    const connection = new Connection(rpcEndpoint, 'confirmed');
    
    // Create Metaplex instance with error handling for browser environments
    let metaplex: Metaplex;
    try {
      metaplex = Metaplex.make(connection);
    } catch (error) {
      console.error('Failed to create Metaplex instance:', error);
      throw new Error('Metaplex SDK initialization failed. Please refresh and try again.');
    }

    console.log(`Fetching NFTs for ${publicKey.toBase58()} on ${cluster}...`);

    // Get all NFTs owned by the wallet
    const nfts = await metaplex.nfts().findAllByOwner({ owner: publicKey });

    console.log(`Found ${nfts.length} NFTs`);

    // Apply limit if specified
    const nftsToProcess = options?.maxNFTs ? nfts.slice(0, options.maxNFTs) : nfts;

    // Process NFTs in parallel with rate limiting
    const processedNFTs = await Promise.all(
      nftsToProcess.map(async (nft) => {
        try {
          // Load full metadata if it's a metadata account
          const fullNft = await metaplex.nfts().load({ metadata: nft as any });

          const result: SolanaNFT = {
            mintAddress: fullNft.address.toBase58(),
            tokenAddress: nft.address.toBase58(),
            name: fullNft.name,
            symbol: fullNft.symbol,
            uri: fullNft.uri,
            sellerFeeBasisPoints: fullNft.sellerFeeBasisPoints,
            updateAuthority: fullNft.updateAuthorityAddress?.toBase58(),
            isMasterEdition: ('edition' in fullNft && fullNft.edition?.isOriginal) || false,
            supply: ('edition' in fullNft && 'supply' in (fullNft.edition || {}) && (fullNft.edition as any)?.supply?.toNumber()) || undefined,
            collectionAddress: fullNft.collection?.address.toBase58(),
            verified: fullNft.collection?.verified,
          };

          // Fetch off-chain metadata if requested and URI is available
          if (options?.includeOffChainMetadata && fullNft.uri) {
            const offChainMetadata = await fetchOffChainMetadata(fullNft.uri);
            if (offChainMetadata) {
              result.description = offChainMetadata.description;
              result.image = offChainMetadata.image;
              result.attributes = offChainMetadata.attributes;
              
              // Get collection name from off-chain metadata if available
              if (offChainMetadata.properties?.creators) {
                result.collectionName = offChainMetadata.name;
              }
            }
          }

          return result;
        } catch (error) {
          console.error(`Error processing NFT ${nft.address.toBase58()}:`, error);
          return null;
        }
      })
    );

    // Filter out failed NFTs and return
    return processedNFTs.filter((nft): nft is SolanaNFT => nft !== null);
  } catch (error) {
    console.error('Error fetching Solana NFTs:', error);
    throw new Error(`Failed to fetch Solana NFTs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Group NFTs by collection
 */
export function groupNFTsByCollection(nfts: SolanaNFT[]): Map<string, SolanaNFT[]> {
  const collections = new Map<string, SolanaNFT[]>();

  for (const nft of nfts) {
    const collectionKey = nft.collectionAddress || 'uncategorized';
    
    if (!collections.has(collectionKey)) {
      collections.set(collectionKey, []);
    }
    
    collections.get(collectionKey)!.push(nft);
  }

  return collections;
}

/**
 * Get collection information from grouped NFTs
 */
export function getCollectionInfo(
  collectionAddress: string,
  nfts: SolanaNFT[]
): SolanaNFTCollection {
  const firstNFT = nfts[0];
  
  return {
    address: collectionAddress === 'uncategorized' ? 'uncategorized' : collectionAddress,
    name: firstNFT?.collectionName || firstNFT?.name || 'Unknown Collection',
    symbol: firstNFT?.symbol,
    image: firstNFT?.image,
    description: firstNFT?.description,
    nftCount: nfts.length,
    verified: firstNFT?.verified,
    updateAuthority: firstNFT?.updateAuthority,
  };
}

/**
 * Fetch NFTs and group them by collection
 */
export async function fetchCollectionsWithNFTs(
  publicKey: PublicKey,
  cluster: SolanaCluster = 'mainnet-beta',
  options?: {
    includeOffChainMetadata?: boolean;
    maxNFTs?: number;
  }
): Promise<{ collections: SolanaNFTCollection[]; nftsByCollection: Map<string, SolanaNFT[]> }> {
  // Fetch all NFTs
  const nfts = await fetchUserSolanaNFTs(publicKey, cluster, options);

  // Group by collection
  const nftsByCollection = groupNFTsByCollection(nfts);

  // Create collection info objects
  const collections = Array.from(nftsByCollection.entries()).map(([address, collectionNfts]) =>
    getCollectionInfo(address, collectionNfts)
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
  cluster: SolanaCluster = 'mainnet-beta',
  includeOffChainMetadata: boolean = true
): Promise<SolanaNFT | null> {
  try {
    if (!isValidMintAddress(mintAddress)) {
      throw new Error('Invalid mint address');
    }

    const rpcEndpoint = SOLANA_RPC_ENDPOINTS[cluster];
    const connection = new Connection(rpcEndpoint, 'confirmed');
    const metaplex = new Metaplex(connection);

    const mintPubkey = new PublicKey(mintAddress);
    const nft = await metaplex.nfts().findByMint({ mintAddress: mintPubkey });

    const result: SolanaNFT = {
      mintAddress: nft.address.toBase58(),
      tokenAddress: nft.address.toBase58(),
      name: nft.name,
      symbol: nft.symbol,
      uri: nft.uri,
      sellerFeeBasisPoints: nft.sellerFeeBasisPoints,
      updateAuthority: nft.updateAuthorityAddress?.toBase58(),
      isMasterEdition: ('edition' in nft && nft.edition?.isOriginal) || false,
      supply: ('edition' in nft && 'supply' in (nft.edition || {}) && (nft.edition as any)?.supply?.toNumber()) || undefined,
      collectionAddress: nft.collection?.address.toBase58(),
      verified: nft.collection?.verified,
    };

    // Fetch off-chain metadata if requested
    if (includeOffChainMetadata && nft.uri) {
      const offChainMetadata = await fetchOffChainMetadata(nft.uri);
      if (offChainMetadata) {
        result.description = offChainMetadata.description;
        result.image = offChainMetadata.image;
        result.attributes = offChainMetadata.attributes;
        result.collectionName = offChainMetadata.name;
      }
    }

    return result;
  } catch (error) {
    console.error(`Error fetching NFT ${mintAddress}:`, error);
    return null;
  }
}

/**
 * Clear the NFT metadata cache
 */
export function clearNFTCache(): void {
  nftCache.clear();
}

/**
 * Batch fetch NFTs with pagination support
 */
export async function fetchNFTsBatch(
  publicKey: PublicKey,
  cluster: SolanaCluster = 'mainnet-beta',
  options?: {
    offset?: number;
    limit?: number;
    includeOffChainMetadata?: boolean;
  }
): Promise<{ nfts: SolanaNFT[]; total: number; hasMore: boolean }> {
  const offset = options?.offset || 0;
  const limit = options?.limit || 50;

  // Fetch all NFTs (we'll handle pagination manually)
  const allNFTs = await fetchUserSolanaNFTs(publicKey, cluster, {
    includeOffChainMetadata: options?.includeOffChainMetadata,
  });

  const total = allNFTs.length;
  const nfts = allNFTs.slice(offset, offset + limit);
  const hasMore = offset + limit < total;

  return { nfts, total, hasMore };
}

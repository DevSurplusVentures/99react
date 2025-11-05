/**
 * Solana NFT Query Utilities
 * 
 * Query NFTs owned by a wallet address, fetch Metaplex metadata,
 * and discover collections.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { AccountLayout, MintLayout, TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Metaplex metadata program ID
export const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

export interface SolanaNFT {
  mintAddress: string;
  tokenAccount: string;
  name?: string;
  symbol?: string;
  uri?: string;
  collectionAddress?: string;
  collectionName?: string;
  image?: string;
  description?: string;
  metadata?: any;
}

export interface MetaplexMetadata {
  key: number;
  updateAuthority: string;
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
  creators?: Array<{
    address: string;
    verified: boolean;
    share: number;
  }>;
  primarySaleHappened: boolean;
  isMutable: boolean;
  editionNonce?: number;
  tokenStandard?: number;
  collection?: {
    verified: boolean;
    key: string;
  };
  uses?: {
    useMethod: number;
    remaining: number;
    total: number;
  };
}

/**
 * Derive the Metaplex metadata PDA for a given mint
 */
export function getMetadataPDA(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );
  return pda;
}

/**
 * Parse Metaplex metadata account data
 */
function parseMetadata(data: Buffer): MetaplexMetadata | null {
  try {
    let offset = 1; // Skip key byte

    // Update authority (32 bytes)
    const updateAuthority = new PublicKey(data.slice(offset, offset + 32)).toBase58();
    offset += 32;

    // Mint (32 bytes)
    const mint = new PublicKey(data.slice(offset, offset + 32)).toBase58();
    offset += 32;

    // Name (4 bytes length + string)
    const nameLength = data.readUInt32LE(offset);
    offset += 4;
    const name = data.slice(offset, offset + nameLength).toString('utf8').replace(/\0/g, '');
    offset += nameLength;

    // Symbol (4 bytes length + string)
    const symbolLength = data.readUInt32LE(offset);
    offset += 4;
    const symbol = data.slice(offset, offset + symbolLength).toString('utf8').replace(/\0/g, '');
    offset += symbolLength;

    // URI (4 bytes length + string)
    const uriLength = data.readUInt32LE(offset);
    offset += 4;
    const uri = data.slice(offset, offset + uriLength).toString('utf8').replace(/\0/g, '');
    offset += uriLength;

    // Seller fee basis points (2 bytes)
    const sellerFeeBasisPoints = data.readUInt16LE(offset);
    offset += 2;

    // Creators (optional)
    const hasCreators = data[offset];
    offset += 1;
    let creators: Array<{ address: string; verified: boolean; share: number }> | undefined;
    if (hasCreators) {
      const creatorsLength = data.readUInt32LE(offset);
      offset += 4;
      creators = [];
      for (let i = 0; i < creatorsLength; i++) {
        const address = new PublicKey(data.slice(offset, offset + 32)).toBase58();
        offset += 32;
        const verified = data[offset] === 1;
        offset += 1;
        const share = data[offset];
        offset += 1;
        creators.push({ address, verified, share });
      }
    }

    // Primary sale happened (1 byte)
    const primarySaleHappened = data[offset] === 1;
    offset += 1;

    // Is mutable (1 byte)
    const isMutable = data[offset] === 1;
    offset += 1;

    // Edition nonce (optional, 1 byte flag + 1 byte value)
    let editionNonce: number | undefined;
    if (offset < data.length && data[offset] === 1) {
      offset += 1;
      editionNonce = data[offset];
      offset += 1;
    } else if (offset < data.length) {
      offset += 1; // Skip the None flag
    }

    // Token standard (optional)
    let tokenStandard: number | undefined;
    if (offset < data.length && data[offset] === 1) {
      offset += 1;
      tokenStandard = data[offset];
      offset += 1;
    } else if (offset < data.length) {
      offset += 1;
    }

    // Collection (optional)
    let collection: { verified: boolean; key: string } | undefined;
    if (offset < data.length && data[offset] === 1) {
      offset += 1;
      const verified = data[offset] === 1;
      offset += 1;
      const key = new PublicKey(data.slice(offset, offset + 32)).toBase58();
      offset += 32;
      collection = { verified, key };
    }

    return {
      key: data[0],
      updateAuthority,
      mint,
      name,
      symbol,
      uri,
      sellerFeeBasisPoints,
      creators,
      primarySaleHappened,
      isMutable,
      editionNonce,
      tokenStandard,
      collection,
    };
  } catch (error) {
    console.error('Failed to parse metadata:', error);
    return null;
  }
}

/**
 * Fetch metadata from URI (typically Arweave or IPFS)
 */
async function fetchMetadataJson(uri: string): Promise<any> {
  try {
    // Handle IPFS URIs
    if (uri.startsWith('ipfs://')) {
      uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }

    const response = await fetch(uri, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      // Silently fail for 404s and other HTTP errors - common for test/invalid URIs
      return null;
    }

    return await response.json();
  } catch (error) {
    // Silently fail for network errors (CORS, DNS, etc.) - common for test/invalid URIs
    // Only log if it's not a typical network error
    if (!(error instanceof TypeError)) {
      console.debug(`Metadata fetch error for ${uri}:`, error);
    }
    return null;
  }
}

/**
 * Get NFT metadata from Metaplex for a specific mint
 */
export async function getNFTMetadata(
  connection: Connection,
  mintAddress: PublicKey
): Promise<SolanaNFT | null> {
  try {
    const metadataPDA = getMetadataPDA(mintAddress);
    const metadataAccount = await connection.getAccountInfo(metadataPDA);

    if (!metadataAccount) {
      console.warn(`No metadata found for mint ${mintAddress.toBase58()}`);
      return null;
    }

    const metadata = parseMetadata(metadataAccount.data);
    if (!metadata) {
      return null;
    }

    // Fetch additional metadata from URI
    let metadataJson: any = null;
    if (metadata.uri) {
      metadataJson = await fetchMetadataJson(metadata.uri);
    }

    return {
      mintAddress: mintAddress.toBase58(),
      tokenAccount: '', // Will be set by caller
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      collectionAddress: metadata.collection?.key,
      collectionName: undefined, // Would need separate collection metadata fetch
      image: metadataJson?.image,
      description: metadataJson?.description,
      metadata: metadataJson,
    };
  } catch (error) {
    console.error(`Error fetching NFT metadata for ${mintAddress.toBase58()}:`, error);
    return null;
  }
}

/**
 * Query all NFTs owned by a wallet address
 * 
 * This function:
 * 1. Queries all token accounts owned by the wallet
 * 2. Filters to NFTs (decimals = 0, amount = 1)
 * 3. Fetches Metaplex metadata for each NFT
 * 4. Fetches additional metadata from URI (image, description, etc.)
 * 
 * @param connection Solana connection
 * @param ownerAddress Owner's wallet address
 * @returns Array of NFTs with metadata
 */
export async function queryOwnedNFTs(
  connection: Connection,
  ownerAddress: PublicKey
): Promise<SolanaNFT[]> {
  try {
    console.log('🔍 Querying NFTs owned by:', ownerAddress.toBase58());

    // Get all token accounts owned by this address
    const tokenAccounts = await connection.getTokenAccountsByOwner(
      ownerAddress,
      { programId: TOKEN_PROGRAM_ID }
    );

    console.log(`📦 Found ${tokenAccounts.value.length} token accounts`);

    // Filter to NFTs and fetch metadata
    const nfts: SolanaNFT[] = [];
    const metadataPromises: Promise<void>[] = [];

    for (const { account, pubkey } of tokenAccounts.value) {
      const accountData = AccountLayout.decode(account.data);
      const amount = accountData.amount;

      // Check if this is an NFT (amount = 1)
      if (amount === 1n) {
        const mintAddress = new PublicKey(accountData.mint);

        // Verify it's an NFT by checking mint decimals = 0
        metadataPromises.push(
          (async () => {
            try {
              const mintInfo = await connection.getAccountInfo(mintAddress);
              if (mintInfo) {
                const mintData = MintLayout.decode(mintInfo.data);
                if (mintData.decimals === 0) {
                  // This is an NFT! Fetch metadata
                  const nftMetadata = await getNFTMetadata(connection, mintAddress);
                  if (nftMetadata) {
                    nftMetadata.tokenAccount = pubkey.toBase58();
                    nfts.push(nftMetadata);
                    console.log(`✅ Found NFT: ${nftMetadata.name || mintAddress.toBase58()}`);
                  }
                }
              }
            } catch (error) {
              console.warn(`Error checking mint ${mintAddress.toBase58()}:`, error);
            }
          })()
        );
      }
    }

    // Wait for all metadata fetches to complete
    await Promise.all(metadataPromises);

    console.log(`✅ Found ${nfts.length} NFTs total`);
    return nfts;
  } catch (error) {
    console.error('Error querying owned NFTs:', error);
    throw error;
  }
}

/**
 * Query a specific NFT by mint address
 * Useful for manual input scenarios
 */
export async function queryNFTByMint(
  connection: Connection,
  mintAddress: string,
  ownerAddress?: PublicKey
): Promise<SolanaNFT | null> {
  try {
    const mintPubkey = new PublicKey(mintAddress);
    
    // Verify it's an NFT (decimals = 0)
    const mintInfo = await connection.getAccountInfo(mintPubkey);
    if (!mintInfo) {
      throw new Error('Mint address not found');
    }

    const mintData = MintLayout.decode(mintInfo.data);
    if (mintData.decimals !== 0) {
      throw new Error('Not an NFT (decimals must be 0)');
    }

    // Fetch metadata
    const nftMetadata = await getNFTMetadata(connection, mintPubkey);
    if (!nftMetadata) {
      throw new Error('No metadata found for this NFT');
    }

    // Optionally verify ownership
    if (ownerAddress) {
      // Would need to check token account ownership
      // This is left as optional since we may want to query NFTs
      // even if not currently owned (e.g., for burn after transfer)
    }

    return nftMetadata;
  } catch (error) {
    console.error(`Error querying NFT ${mintAddress}:`, error);
    throw error;
  }
}

/**
 * Group NFTs by collection
 */
export function groupNFTsByCollection(nfts: SolanaNFT[]): Map<string, SolanaNFT[]> {
  const collections = new Map<string, SolanaNFT[]>();

  for (const nft of nfts) {
    const collectionKey = nft.collectionAddress || 'uncategorized';
    const existing = collections.get(collectionKey) || [];
    existing.push(nft);
    collections.set(collectionKey, existing);
  }

  return collections;
}

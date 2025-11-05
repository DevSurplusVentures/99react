/**
 * Solana TokenId Conversion Utilities
 * 
 * Converts Solana mint addresses (base58) to Nat tokenIds (BigInt) for ckNFT consistency.
 * Based on ICRC99 standards - tokenId IS the mint address as a number (bijective mapping).
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Convert a Solana mint address to a Nat tokenId by decoding base58 to BigInt
 * 
 * Algorithm:
 * 1. Decode base58 mint address to bytes (32 bytes for Solana public keys)
 * 2. Convert bytes to BigInt (treating as big-endian unsigned integer)
 * 3. Return as tokenId
 * 
 * @param mintAddress - Solana mint address in base58 format
 * @returns TokenId as BigInt for use in ICRC7 calls
 */
export function solanaTokenIdFromMint(mintAddress: string): bigint {
  try {
    // Validate the mint address format
    const mintPubkey = new PublicKey(mintAddress);
    const mintBytes = mintPubkey.toBytes(); // 32 bytes
    
    // Convert bytes to BigInt (big-endian)
    let tokenId = 0n;
    for (let i = 0; i < mintBytes.length; i++) {
      tokenId = (tokenId << 8n) | BigInt(mintBytes[i]);
    }
    
    return tokenId;
    
  } catch (error) {
    console.error(`Failed to convert mint address to tokenId: ${mintAddress}`, error);
    throw new Error(`Invalid Solana mint address: ${mintAddress}`);
  }
}

/**
 * Convert a tokenId back to a Solana mint address (inverse of solanaTokenIdFromMint)
 * 
 * @param tokenId - TokenId from ICRC7 (must be from a Solana NFT)
 * @returns Solana mint address in base58 format
 */
export function solanaMintFromTokenId(tokenId: bigint): string {
  try {
    // Convert BigInt back to 32 bytes (big-endian)
    const mintBytes = new Uint8Array(32);
    let tempId = tokenId;
    
    for (let i = 31; i >= 0; i--) {
      mintBytes[i] = Number(tempId & 0xFFn);
      tempId = tempId >> 8n;
    }
    
    // Convert bytes to Solana PublicKey and return as base58
    return new PublicKey(mintBytes).toString();
    
  } catch (error) {
    console.error(`Failed to convert tokenId to mint address: ${tokenId}`, error);
    throw new Error(`Invalid tokenId for Solana mint conversion: ${tokenId}`);
  }
}

/**
 * Validate that a tokenId was properly derived from a mint address
 * 
 * @param mintAddress - Original Solana mint address
 * @param tokenId - TokenId to validate  
 * @returns True if tokenId matches the expected conversion
 */
export function validateSolanaTokenId(mintAddress: string, tokenId: bigint): boolean {
  try {
    const expectedTokenId = solanaTokenIdFromMint(mintAddress);
    return expectedTokenId === tokenId;
  } catch (error) {
    console.error(`Failed to validate tokenId for ${mintAddress}:`, error);
    return false;
  }
}

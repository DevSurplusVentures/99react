/**
 * Solana Type Definitions for NFT Bridge
 * 
 * This file extends the orchestrator types with Solana-specific utilities,
 * helper types, and convenience functions for working with Solana networks
 * in the NFT Bridge application.
 */

import { PublicKey } from '@solana/web3.js';
import type { Network, ContractPointer } from '../declarations/orchestrator/orchestrator.did.d.ts';

/**
 * Solana Cluster Types
 * Matches the SolanaWalletProvider cluster configuration
 */
export type SolanaCluster = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';

/**
 * Solana Cluster ID mapping - DEPRECATED
 * The orchestrator now uses SolanaCluster variants (Mainnet, Devnet, Testnet)
 * instead of numeric IDs. Localnet uses Devnet variant with sol_rpc's Demo mode override.
 */
export const SolanaClusterId = {
  MAINNET: 0n,
  DEVNET: 1n,
  TESTNET: 2n,
  LOCALNET: 3n, // Maps to Devnet with Demo mode override
} as const;

/**
 * Solana Network Helper Functions
 */

/**
 * Create a Solana Network type for orchestrator
 * @param cluster - Solana cluster name
 * @returns Network type with Solana variant using SolanaCluster enum
 */
export function createSolanaNetwork(cluster: SolanaCluster): Network {
  // Map cluster names to orchestrator's SolanaCluster variant
  let clusterVariant: { 'Mainnet': null } | { 'Devnet': null } | { 'Testnet': null } | { 'Custom': string };
  
  switch (cluster) {
    case 'mainnet-beta':
      clusterVariant = { 'Mainnet': null };
      break;
    case 'devnet':
      clusterVariant = { 'Devnet': null };
      break;
    case 'testnet':
      clusterVariant = { 'Testnet': null };
      break;
    case 'localnet':
      // Localnet uses Custom variant with localhost URL
      clusterVariant = { 'Custom': 'http://127.0.0.1:8899' };
      break;
    default:
      clusterVariant = { 'Devnet': null };
  }
  
  return { 'Solana': [clusterVariant] };
}

/**
 * Create a Solana ContractPointer
 * @param mintAddress - Solana NFT mint address (PublicKey or base58 string)
 * @param cluster - Solana cluster
 * @returns ContractPointer for the Solana NFT
 */
export function createSolanaContractPointer(
  mintAddress: string | PublicKey,
  cluster: SolanaCluster = 'mainnet-beta'
): ContractPointer {
  const addressStr = typeof mintAddress === 'string' 
    ? mintAddress 
    : mintAddress.toBase58();

  return {
    contract: addressStr,
    network: createSolanaNetwork(cluster),
  };
}

/**
 * Convert cluster name to cluster ID
 * @param cluster - Cluster name
 * @returns Cluster ID as bigint
 */
export function solanaClusterToId(cluster: SolanaCluster): bigint {
  switch (cluster) {
    case 'mainnet-beta':
      return SolanaClusterId.MAINNET;
    case 'devnet':
      return SolanaClusterId.DEVNET;
    case 'testnet':
      return SolanaClusterId.TESTNET;
    case 'localnet':
      return SolanaClusterId.LOCALNET;
    default:
      return SolanaClusterId.DEVNET;
  }
}

/**
 * Convert cluster ID to cluster name
 * @param clusterId - Cluster ID as bigint
 * @returns Cluster name
 */
export function solanaIdToCluster(clusterId: bigint): SolanaCluster {
  switch (clusterId) {
    case SolanaClusterId.MAINNET:
      return 'mainnet-beta';
    case SolanaClusterId.DEVNET:
      return 'devnet';
    case SolanaClusterId.TESTNET:
      return 'testnet';
    case SolanaClusterId.LOCALNET:
      return 'localnet';
    default:
      return 'devnet';
  }
}

/**
 * Check if a Network is a Solana network
 * @param network - Network type to check
 * @returns true if Solana network
 */
export function isSolanaNetwork(network: Network): network is { 'Solana': [] | [{ 'Mainnet': null } | { 'Devnet': null } | { 'Testnet': null } | { 'Custom': string }] } {
  return 'Solana' in network;
}

/**
 * Check if a ContractPointer points to Solana
 * @param pointer - Contract pointer to check
 * @returns true if Solana contract
 */
export function isSolanaContract(pointer: ContractPointer): boolean {
  return isSolanaNetwork(pointer.network);
}

/**
 * Extract Solana cluster from Network type
 * @param network - Network type
 * @returns Cluster name if Solana network, undefined otherwise
 */
export function getSolanaCluster(network: Network): SolanaCluster | undefined {
  if (!isSolanaNetwork(network)) return undefined;
  
  const clusterVariant = network.Solana[0];
  if (clusterVariant === undefined) return 'mainnet-beta'; // Default
  
  // Map variant to cluster name
  if ('Mainnet' in clusterVariant) return 'mainnet-beta';
  if ('Devnet' in clusterVariant) return 'devnet';
  if ('Testnet' in clusterVariant) return 'testnet';
  if ('Custom' in clusterVariant) {
    // Check if it's localhost
    if (clusterVariant.Custom === 'http://127.0.0.1:8899' || 
        clusterVariant.Custom === 'http://localhost:8899') {
      return 'localnet';
    }
    // For other custom URLs, default to devnet
    return 'devnet';
  }
  
  return 'mainnet-beta'; // Fallback
}

/**
 * Extract Solana mint address from ContractPointer
 * @param pointer - Contract pointer
 * @returns Mint address if Solana contract, undefined otherwise
 */
export function getSolanaMintAddress(pointer: ContractPointer): string | undefined {
  if (!isSolanaContract(pointer)) return undefined;
  return pointer.contract;
}

/**
 * Validate Solana mint address format
 * @param address - Address to validate
 * @returns true if valid Solana public key
 */
export function isValidSolanaMintAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Solana RPC endpoint configuration
 */
export const SOLANA_RPC_ENDPOINTS: Record<SolanaCluster, string> = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  'devnet': 'https://api.devnet.solana.com',
  'testnet': 'https://api.testnet.solana.com',
  'localnet': 'http://127.0.0.1:8899',
};

/**
 * Get RPC endpoint for cluster
 * @param cluster - Solana cluster
 * @returns RPC endpoint URL
 */
export function getSolanaRpcEndpoint(cluster: SolanaCluster): string {
  return SOLANA_RPC_ENDPOINTS[cluster];
}

/**
 * Solana block explorer URLs
 */
export const SOLANA_EXPLORER_URLS: Record<SolanaCluster, string> = {
  'mainnet-beta': 'https://solscan.io',
  'devnet': 'https://solscan.io',
  'testnet': 'https://solscan.io',
  'localnet': 'https://explorer.solana.com', // Local explorer or fallback
};

/**
 * Get explorer URL for Solana transaction
 * @param signature - Transaction signature
 * @param cluster - Solana cluster
 * @returns Solscan URL
 */
export function getSolanaExplorerTxUrl(
  signature: string,
  cluster: SolanaCluster = 'mainnet-beta'
): string {
  const baseUrl = SOLANA_EXPLORER_URLS[cluster];
  const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
  return `${baseUrl}/tx/${signature}${clusterParam}`;
}

/**
 * Get explorer URL for Solana account/mint
 * @param address - Account address or mint address
 * @param cluster - Solana cluster
 * @returns Solscan URL
 */
export function getSolanaExplorerAccountUrl(
  address: string | PublicKey,
  cluster: SolanaCluster = 'mainnet-beta'
): string {
  const addressStr = typeof address === 'string' ? address : address.toBase58();
  const baseUrl = SOLANA_EXPLORER_URLS[cluster];
  const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
  return `${baseUrl}/account/${addressStr}${clusterParam}`;
}

/**
 * Solana NFT Metadata Types
 * For compatibility with Metaplex metadata standard
 */
export interface SolanaNFTMetadata {
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
  creators: Array<{
    address: string;
    verified: boolean;
    share: number;
  }>;
}

/**
 * Solana NFT Info (for UI display)
 */
export interface SolanaNFT {
  mintAddress: string;
  tokenAddress?: string;
  metadata?: SolanaNFTMetadata;
  cluster: SolanaCluster;
}

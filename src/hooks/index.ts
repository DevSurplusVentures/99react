// Main EVM hooks
export {
  useMetaMask,
  useEthersProvider,
  useERC721Contract,
  useGasFees,
  useTransactionStatus,
} from './useEVM';

// Advanced EVM functionality
export {
  useAdvancedGasFees,
  useNetworkManager,
  useFundingManager,
  useBatchOperations,
  L2_CHAINS,
  type L2Chain,
} from './useAdvancedEVM';

// NFT-specific bridging hooks
export {
  useNFTBridge,
  useBatchNFTOperations,
  useNFTMetadataCache,
  type NFTMetadata,
  type NFTDetails,
  type BridgeConfig,
} from './useNFTBridge';

// ICRC-99 support checking
export {
  useICRC99Support,
  type ICRC99SupportResult,
} from './useICRC99Support';

// Re-export types
export type { ChainConfig } from './useEVM';

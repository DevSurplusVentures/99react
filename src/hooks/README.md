# EVM Integration Hooks for ICRC-99 Bridge

This directory contains comprehensive React hooks for integrating Ethereum Virtual Machine (EVM) functionality with the ICRC-99 NFT bridge. These hooks provide MetaMask connectivity, contract interactions, gas estimation, and bridging operations.

## 🎯 Overview

The EVM hooks enable seamless integration between EVM-based blockchains (Ethereum, Optimism, Base, Arbitrum) and the Internet Computer for NFT bridging operations.

### Key Features

- 🦊 **MetaMask Integration**: Wallet connection, account management, network switching
- 🔗 **Multi-Chain Support**: Ethereum mainnet, L2 rollups (Optimism, Base, Arbitrum)
- 📝 **Smart Contract Interactions**: ERC-721 NFT operations (approve, transfer, metadata)
- ⛽ **Advanced Gas Estimation**: L2-optimized fee calculations
- 🌉 **Bridge Operations**: Complete NFT bridging workflow
- 📊 **Batch Operations**: Multiple NFT operations in sequence
- 💾 **Metadata Caching**: Optimized NFT metadata fetching

## 📁 File Structure

```
src/hooks/
├── useEVM.ts              # Core EVM functionality
├── useAdvancedEVM.ts      # Advanced features (gas, networks, funding)
├── useNFTBridge.ts        # NFT-specific bridging operations
├── index.ts               # Exports and types
├── EVMHooks.stories.tsx   # Storybook demos
└── README.md             # This file
```

## 🔧 Core Hooks

### `useMetaMask()`

Manages MetaMask wallet connection and account state.

```typescript
const {
  isDetected,     // MetaMask extension detected
  isUnlocked,     // Wallet connected
  activeAddress,  // Current wallet address
  chainId,        // Current chain ID
  connectWallet,  // Connect to MetaMask
  switchChain,    // Switch to specific chain
} = useMetaMask();
```

### `useERC721Contract(contractAddress, chainConfig, requireSigner)`

Interacts with ERC-721 NFT contracts.

```typescript
const {
  contract,        // Ethers contract instance
  isLoading,       // Operation in progress
  error,           // Error state
  getOwner,        // Get NFT owner
  getTokenURI,     // Get metadata URI
  getApproved,     // Get approved address
  approve,         // Approve for transfer
  safeTransferFrom,// Transfer NFT
  getContractInfo, // Get contract name/symbol
} = useERC721Contract(contractAddress, chainConfig, true);
```

### `useAdvancedGasFees(chainId)`

Advanced gas fee estimation with L2 rollup support.

```typescript
const {
  isLoading,
  error,
  isL2Chain,              // Detect L2 networks
  estimateCompleteFee,    // Full fee estimation
  estimateL1DataFee,      // L2 data fees
  formatFeeEstimate,      // Format wei to ETH
} = useAdvancedGasFees(chainId);
```

### `useNetworkManager()`

Manage network switching and configuration.

```typescript
const {
  isLoading,
  error,
  supportedNetworks,  // Available networks
  addNetwork,         // Add network to MetaMask
  switchNetwork,      // Switch to network
} = useNetworkManager();
```

## 🌉 Bridge-Specific Hooks

### `useNFTBridge(config)`

Complete NFT bridging workflow management.

```typescript
const bridgeConfig = {
  sourceChain: {
    chainId: 1,
    name: 'Ethereum',
    contractAddress: '0x...',
  },
  targetChain: {
    chainId: 8453,
    name: 'Base',
    bridgeAddress: '0x...',
  },
};

const {
  isLoading,
  error,
  getNFTDetails,           // Fetch complete NFT info
  checkBridgeEligibility,  // Verify can bridge
  approveForBridge,        // Approve NFT
  estimateBridgeCost,      // Calculate costs
  prepareBridgeTransaction,// Prepare bridge tx
  sourceContract,          // Underlying contract
} = useNFTBridge(bridgeConfig);
```

### `useBatchNFTOperations()`

Batch operations for multiple NFTs.

```typescript
const {
  isLoading,
  error,
  progress,              // { current, total }
  batchApprove,          // Approve multiple NFTs
  batchCheckOwnership,   // Check multiple owners
} = useBatchNFTOperations();
```

### `useNFTMetadataCache()`

Optimized metadata fetching and caching.

```typescript
const {
  cache,                 // Metadata cache Map
  getCachedMetadata,     // Fetch with cache
  clearCache,            // Clear all cache
  clearExpiredCache,     // Clear old entries
} = useNFTMetadataCache();
```

## 🚀 Usage Examples

### Basic MetaMask Connection

```typescript
import { useMetaMask } from './hooks';

function WalletConnector() {
  const { isDetected, isUnlocked, activeAddress, connectWallet } = useMetaMask();

  if (!isDetected) {
    return <div>Please install MetaMask</div>;
  }

  if (!isUnlocked) {
    return (
      <button onClick={connectWallet}>
        Connect Wallet
      </button>
    );
  }

  return <div>Connected: {activeAddress}</div>;
}
```

### NFT Approval for Bridge

```typescript
import { useERC721Contract, useNetworkManager } from './hooks';

function NFTApproval({ tokenId, bridgeAddress }) {
  const { switchNetwork } = useNetworkManager();
  const contract = useERC721Contract(
    '0x1234...', // NFT contract address
    { chainId: 1, name: 'Ethereum', rpc: '...', nativeCurrency: {...}, blockExplorerUrls: [...] },
    true // Require signer
  );

  const handleApprove = async () => {
    // Switch to correct network
    await switchNetwork(1);
    
    // Approve NFT for bridge
    const txHash = await contract.approve(bridgeAddress, tokenId);
    console.log('Approved:', txHash);
  };

  return (
    <button onClick={handleApprove} disabled={contract.isLoading}>
      {contract.isLoading ? 'Approving...' : 'Approve NFT'}
    </button>
  );
}
```

### Complete Bridge Workflow

```typescript
import { useNFTBridge, useFundingManager } from './hooks';

function BridgeWorkflow({ tokenId, targetPrincipal }) {
  const bridge = useNFTBridge(bridgeConfig);
  const funding = useFundingManager();

  const handleBridge = async () => {
    // 1. Check eligibility
    const eligibility = await bridge.checkBridgeEligibility(tokenId, userAddress);
    if (!eligibility.canBridge) {
      console.error('Cannot bridge:', eligibility.issues);
      return;
    }

    // 2. Estimate costs
    const costEstimate = await bridge.estimateBridgeCost(tokenId);
    
    // 3. Check funding
    const fundingInfo = await funding.getFundingRequirement(
      userAddress,
      costEstimate.totalEstimate
    );
    
    if (fundingInfo.needsFunding) {
      console.log('Need additional funding:', funding.formatBalance(fundingInfo.fundingAmount));
      return;
    }

    // 4. Execute bridge
    const txData = await bridge.prepareBridgeTransaction(tokenId, targetPrincipal);
    console.log('Ready to bridge:', txData);
  };

  return (
    <button onClick={handleBridge} disabled={bridge.isLoading}>
      {bridge.isLoading ? 'Processing...' : 'Bridge NFT'}
    </button>
  );
}
```

### Integration with BridgeChecklist

```typescript
import { BridgeChecklist } from '../components/BridgeChecklist/BridgeChecklist';
import { useMetaMask, useNFTBridge } from './hooks';
import { createBridgeProgress, updateBridgeStep } from '../utils/bridgeProgress';

function BridgeInterface() {
  const { isUnlocked, activeAddress } = useMetaMask();
  const bridge = useNFTBridge(bridgeConfig);
  const [progress, setProgress] = useState(() => createBridgeProgress());

  // Update progress based on wallet state
  useEffect(() => {
    if (isUnlocked && activeAddress) {
      setProgress(prev => updateBridgeStep(prev, 'setup-wallet', {
        status: 'completed',
        message: `Connected to ${activeAddress.slice(0, 6)}...`
      }));
    }
  }, [isUnlocked, activeAddress]);

  return (
    <div>
      <BridgeChecklist 
        progress={progress}
        onUpdateProgress={setProgress}
      />
      {/* Additional bridge controls */}
    </div>
  );
}
```

## 🔗 Integration Points

### With ICRC-99 Mutations

The EVM hooks integrate seamlessly with the existing `use99Mutations` hook:

```typescript
const mutations = use99Mutations(orchestratorActor);
const { approveForBridge } = useNFTBridge(config);

// Approve EVM NFT
await approveForBridge(tokenId);

// Execute IC bridge transaction
await mutations.mintFromEVM.mutateAsync({
  request: {
    source_nft_contract: contractAddress,
    source_chain: chainId.toString(),
    source_token_id: tokenId,
    target: targetPrincipal,
  }
});
```

### With BridgeChecklist Component

The hooks provide real-time updates to the traffic light progress interface:

```typescript
// EVM wallet connection updates setup stage
useEffect(() => {
  if (isUnlocked) {
    setProgress(prev => updateBridgeStep(prev, 'setup-wallet', {
      status: 'completed'
    }));
  }
}, [isUnlocked]);

// NFT approval updates preparation stage
const handleApprove = async () => {
  setProgress(prev => updateBridgeStep(prev, 'approve-nft', {
    status: 'in-progress'
  }));
  
  await approveForBridge(tokenId);
  
  setProgress(prev => updateBridgeStep(prev, 'approve-nft', {
    status: 'completed'
  }));
};
```

## 🌐 Supported Networks

| Network | Chain ID | Type | L2 Features |
|---------|----------|------|-------------|
| Ethereum | 1 | Mainnet | ❌ |
| Optimism | 10 | L2 Rollup | ✅ |
| Base | 8453 | L2 Rollup | ✅ |
| Arbitrum | 42161 | L2 Rollup | ✅ |

L2 networks include additional features:
- L1 data fee estimation
- Rollup-specific gas calculations
- Optimized transaction bundling

## 🛠️ Development

### Testing with Storybook

```bash
npm run storybook
```

View the EVM hooks demo stories at: `Hooks/EVM Hooks Demo`

### TypeScript Support

All hooks are fully typed with comprehensive TypeScript definitions:

```typescript
import type { 
  ChainConfig, 
  NFTMetadata, 
  NFTDetails, 
  BridgeConfig,
  L2Chain 
} from './hooks';
```

### Error Handling

All hooks include comprehensive error handling:

```typescript
const { error, isLoading } = useERC721Contract(...);

if (error) {
  console.error('Contract error:', error);
}
```

## 🔮 Future Enhancements

- **Additional L2 Support**: Polygon, zkSync, Starknet
- **Contract Deployment**: Deploy bridge contracts from UI
- **Gas Optimization**: MEV protection, batch transactions
- **Enhanced Caching**: Persistent storage, background refresh
- **Multi-Wallet Support**: WalletConnect, Coinbase Wallet
- **Real-time Updates**: WebSocket connections, event listeners

## 📚 Related Documentation

- [BridgeChecklist Component](../components/BridgeChecklist/README.md)
- [use99Mutations Hook](./use99Mutations.md)
- [Bridge Progress Utils](../utils/bridgeProgress.md)
- [ICRC-99 Specification](../../docs/ICRC-99.md)

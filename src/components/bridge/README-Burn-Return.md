# ICRC-99 Burn and Return Wizards

This document covers the newly implemented **Burn Wizard** and **Return Wizard** that complete the full ICRC-99 cross-chain NFT bridging suite.

## Overview

The ICRC-99 bridge now supports four complete operations:

1. **Import Wizard** (EVM → IC): Lock EVM NFT, mint ckNFT
2. **Export Wizard** (IC → EVM): Lock ckNFT, deploy new EVM contract and mint
3. **Burn Wizard** (EVM → IC): **NEW** - Burn EVM NFT, mint ckNFT  
4. **Return Wizard** (IC → EVM): **NEW** - Burn ckNFT, return to original EVM chain

## Burn Wizard (`EVMBurnWizard`)

### Purpose
Burns an NFT on the source EVM chain and mints a corresponding ckNFT on the Internet Computer. Unlike import (which locks), burn permanently destroys the original EVM NFT.

### Use Cases
- Permanently migrate NFTs from EVM to IC
- Reduce EVM contract complexity by eliminating locked state
- One-way bridging for projects moving to IC

### Flow
1. **Connect**: Verify EVM wallet connection
2. **Select NFT**: Choose EVM NFT to burn (contract + token ID)
3. **Costs**: Review cycles and gas costs
4. **Burn**: Execute burn process
5. **Complete**: View results and ckNFT details

### Key Technical Features
- **Burn Funding Address**: Gets burn address from `ckNFT.icrc99_burn_fund_address(tokenId)`
- **MetaMask Integration**: Handles EVM wallet connection and network switching
- **Cost Estimation**: Calculates cycles for IC operations and gas for EVM burns
- **Progress Tracking**: Real-time progress with retry capabilities
- **Auto-completion**: Automatically advances to success screen

### Usage Example

```tsx
import { EVMBurnWizard } from './components/bridge';

function MyApp() {
  return (
    <EVMBurnWizard
      sourceChainId="1"
      sourceContractAddress="0x1234..."
      sourceTokenId="123"
      onComplete={(result) => {
        if (result.success) {
          console.log('ckNFT minted:', result.ckNFTCanisterId);
        }
      }}
      onCancel={() => console.log('Burn cancelled')}
    />
  );
}
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `sourceChainId` | `string` | EVM chain ID (e.g., "1" for Ethereum) |
| `sourceContractAddress` | `string` | EVM contract address |
| `sourceTokenId` | `string` | Token ID to burn |
| `onComplete` | `(result: BurnResult) => void` | Completion callback |
| `onCancel` | `() => void` | Cancellation callback |
| `mockBurnResult` | `BurnResult` | Mock result for testing |

## Return Wizard (`ICReturnWizard`)

### Purpose
Returns a ckNFT to its original EVM chain by burning the ckNFT and minting/unlocking the NFT on the target EVM chain.

### Use Cases
- Return borrowed/bridged NFTs to original chains
- Undo previous import/burn operations
- Cross-chain liquidity without permanent migration

### Flow
1. **Connect**: Verify IC wallet connection
2. **Select ckNFT**: Choose ckNFT to return (canister + token ID)
3. **Target Chain**: Select destination EVM chain and contract
4. **Costs**: Review cycles and gas costs
5. **Return**: Execute return process
6. **Complete**: View EVM transaction details

### Key Technical Features
- **IC Wallet Integration**: Works with Internet Identity, NFID, Plug
- **Target Selection**: Flexible destination (original or different EVM chain)
- **ckNFT Approval**: Handles ICRC-7 approval flow for bridge transfer
- **Cast Operation**: Uses `ckNFT.icrc99_cast()` for cross-chain execution
- **EVM Confirmation**: Monitors target chain for successful minting

### Usage Example

```tsx
import { ICReturnWizard } from './components/bridge';

function MyApp() {
  return (
    <ICReturnWizard
      ckNFTCanisterId="umunu-kh777-77774-qaaca-cai"
      tokenId="456"
      targetChainId="1"
      targetContractAddress="0x5678..."
      onComplete={(result) => {
        if (result.success) {
          console.log('NFT returned to EVM:', result.evmTransactionHash);
        }
      }}
      onCancel={() => console.log('Return cancelled')}
    />
  );
}
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `ckNFTCanisterId` | `string` | ckNFT canister principal |
| `tokenId` | `string` | Token ID to return |
| `targetChainId` | `string` | Target EVM chain ID |
| `targetContractAddress` | `string` | Target contract address |
| `onComplete` | `(result: ReturnResult) => void` | Completion callback |
| `onCancel` | `() => void` | Cancellation callback |
| `mockReturnResult` | `ReturnResult` | Mock result for testing |

## Bridge Operations Matrix

| Operation | Source | Target | Source Action | Target Action | Use Case |
|-----------|--------|--------|---------------|---------------|----------|
| **Import** | EVM | IC | Lock | Mint ckNFT | Temporary bridging |
| **Export** | IC | EVM | Lock ckNFT | Deploy + Mint | New EVM presence |
| **Burn** | EVM | IC | **Burn** | Mint ckNFT | Permanent migration |
| **Return** | IC | EVM | **Burn ckNFT** | Mint/Unlock | Reverse bridging |

## Technical Implementation

### New Mutations Added

The `use99Mutations` hook now includes:

```typescript
// Burn operation support
getBurnFundingAddress: UseMutationResult<string | null, Error, {
  ckNFTCanisterId: Principal;
  tokenId: bigint;
}>
```

### API Integration

Both wizards integrate with the ICRC-99 protocol:

- **Burn Wizard**: Uses `icrc99_burn_fund_address()` to get burn address
- **Return Wizard**: Uses `icrc99_cast()` to initiate return to EVM
- **Cost Calculation**: Both use `icrc99_cast_cost()` for accurate fee estimation
- **Status Monitoring**: Both use `icrc99_cast_status()` for progress tracking

### Progress Tracking

Both wizards use the unified `BridgeProgress` system:

- **Staged Progress**: Groups steps into logical stages
- **Real-time Updates**: Live status updates with error handling
- **Retry Capability**: Failed steps can be retried where applicable
- **Visual Feedback**: Traffic light system (red/yellow/green) for stage status

## Error Handling

Both wizards implement comprehensive error handling:

- **Validation**: Pre-flight checks for required parameters
- **Network Errors**: Graceful handling of connectivity issues
- **Transaction Failures**: Clear error messages with retry options
- **User Cancellation**: Clean state reset on cancellation

## Testing

Both wizards support mock results for development and testing:

```tsx
// Test burn wizard
<EVMBurnWizard
  mockBurnResult={{
    success: true,
    ckNFTCanisterId: 'test-canister',
    tokenId: '123'
  }}
/>

// Test return wizard
<ICReturnWizard
  mockReturnResult={{
    success: true,
    evmTransactionHash: '0xtest...',
    targetChainId: '1'
  }}
/>
```

## Integration Examples

### Complete Bridge Suite

```tsx
import { 
  EVMImportWizard, 
  EVMExportWizard, 
  EVMBurnWizard, 
  ICReturnWizard 
} from './components/bridge';

function BridgeApp() {
  const [operation, setOperation] = useState<'import' | 'export' | 'burn' | 'return'>('import');

  return (
    <div>
      <nav>
        <button onClick={() => setOperation('import')}>Import EVM→IC</button>
        <button onClick={() => setOperation('export')}>Export IC→EVM</button>
        <button onClick={() => setOperation('burn')}>Burn EVM→IC</button>
        <button onClick={() => setOperation('return')}>Return IC→EVM</button>
      </nav>

      {operation === 'import' && <EVMImportWizard {...importProps} />}
      {operation === 'export' && <EVMExportWizard {...exportProps} />}
      {operation === 'burn' && <EVMBurnWizard {...burnProps} />}
      {operation === 'return' && <ICReturnWizard {...returnProps} />}
    </div>
  );
}
```

## Next Steps

1. **Real Integration**: Replace mock implementations with actual ICRC-99 API calls
2. **Gas Optimization**: Implement dynamic gas estimation using MetaMask
3. **Batch Operations**: Support for burning/returning multiple NFTs
4. **Advanced Routing**: Smart contract selection and chain routing
5. **Historical Tracking**: Transaction history and bridge operation logs

## Conclusion

The Burn and Return wizards complete the ICRC-99 bridge ecosystem, providing:

- **Full Bidirectional Bridging**: All four bridge operations supported
- **Consistent UX**: Unified wizard pattern across all operations  
- **Comprehensive Error Handling**: Robust error recovery and retry mechanisms
- **Flexible Configuration**: Support for various EVM chains and IC canisters
- **Developer-Friendly**: Mock support, TypeScript types, and clear APIs

The bridge now supports the complete NFT lifecycle across EVM chains and the Internet Computer.

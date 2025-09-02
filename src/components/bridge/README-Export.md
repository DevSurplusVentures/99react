# NFT Export Wizard

This document describes the EVMExportWizard component that enables users to export ckNFTs (Internet Computer NFTs) back to EVM blockchains.

## Overview

The EVMExportWizard follows the same design patterns as the EVMImportWizard but operates in reverse - taking NFTs that exist on the Internet Computer and exporting them back to EVM chains like Ethereum, Polygon, BSC, etc.

## Architecture

### Components

1. **EVMExportWizard.tsx** - Main wizard component with step navigation
2. **ICNFTSelectionStep.tsx** - Select ckNFTs to export from the IC
3. **RemoteContractStep.tsx** - Configure target EVM network and contract
4. **ExportCostsStep.tsx** - Review and approve cycles for export operation
5. **EVMConnectionStep.tsx** - Reused from import wizard for EVM wallet connection

### Wizard Steps

1. **Connect** - Connect EVM wallet to receive exported NFTs
2. **Select IC NFTs** - Choose ckNFTs from user's Internet Computer wallet
3. **Remote Contract** - Select target network and configure EVM contract
4. **Costs** - Review cycles costs and approve payment
5. **Export** - Monitor the export process
6. **Complete** - Show results and transaction details

## Key Features

### Multi-NFT Export
- Select multiple ckNFTs for batch export
- Sequential processing with progress tracking
- Support for different NFT collections

### Network Support
- Ethereum, Polygon, BSC, Arbitrum, Optimism, Base
- Automatic gas fee estimation per network
- Contract deployment or use existing contracts

### Cost Management
- Transparent cycles cost breakdown
- Real-time gas price information
- Payment approval workflow

### Progress Tracking
- Real-time status updates
- Error handling with retry capability
- Transaction verification

## Usage

### Basic Usage

```tsx
import { EVMExportWizard } from './components/bridge/EVMExportWizard';

function App() {
  const handleExportComplete = (result) => {
    if (result.success) {
      console.log('Export successful!', result);
    } else {
      console.error('Export failed:', result.error);
    }
  };

  return (
    <EVMExportWizard
      sourceCanisterId="your-canister-id"
      supportedNetworks={['ethereum', 'polygon']}
      onComplete={handleExportComplete}
      onCancel={() => console.log('Export cancelled')}
    />
  );
}
```

### Modal Usage

```tsx
<EVMExportWizard
  sourceCanisterId="your-canister-id"
  supportedNetworks={['ethereum', 'polygon']}
  modal={true}
  onComplete={handleExportComplete}
  onCancel={() => setShowModal(false)}
/>
```

### With Mock Data (for Testing/Storybook)

```tsx
<EVMExportWizard
  sourceCanisterId="your-canister-id"
  mockWalletConnected={true}
  mockSelectedICNFTs={mockNFTs}
  mockExportCosts="15000000000"
  initialStep="costs"
/>
```

## Props

### EVMExportWizardProps

| Prop | Type | Description |
|------|------|-------------|
| `sourceCanisterId` | `string` | Optional source ckNFT canister ID |
| `supportedNetworks` | `string[]` | Array of supported EVM networks |
| `onComplete` | `(result: ExportResult) => void` | Callback when export completes |
| `onCancel` | `() => void` | Callback when wizard is cancelled |
| `modal` | `boolean` | Whether to show as modal |
| `className` | `string` | Additional CSS classes |

### Mock Props (for Testing)

| Prop | Type | Description |
|------|------|-------------|
| `mockWalletConnected` | `boolean` | Mock wallet connection state |
| `mockSelectedICNFTs` | `SelectedICNFT[]` | Mock selected NFTs |
| `mockExportCosts` | `string` | Mock export costs in cycles |
| `mockExportResult` | `ExportResult` | Mock export result |
| `initialStep` | `ExportWizardStep` | Initial step for testing |

## Data Types

### SelectedICNFT

```typescript
interface SelectedICNFT {
  tokenId: string;
  canisterId: string;
  metadata?: any;
  owner: Principal;
  image?: string;
  name?: string;
  description?: string;
}
```

### ExportResult

```typescript
interface ExportResult {
  success: boolean;
  icTransactionHash?: string;
  evmTransactionHash?: string;
  remoteContractAddress?: string;
  tokenId?: string;
  error?: string;
}
```

### RemoteContractInfo

```typescript
interface RemoteContractInfo {
  address?: string;
  network: Network;
  deployed: boolean;
  transactionHash?: string;
}
```

## Integration with Bridge Route

The export wizard is integrated into the main bridge route alongside the import wizard:

```tsx
// In bridge.tsx
import { EVMExportWizard, ExportResult } from "../../components/bridge/EVMExportWizard";

// State management
const [activeWizard, setActiveWizard] = useState<'import' | 'export' | null>(null);
const [lastExportResult, setLastExportResult] = useState<ExportResult | null>(null);

// Export handler
const handleExportComplete = (result: ExportResult) => {
  setLastExportResult(result);
  if (result.success) {
    setShowExportSuccess(true);
  }
};

// Render export wizard
{activeWizard === 'export' && (
  <EVMExportWizard
    sourceCanisterId="your-canister-id"
    supportedNetworks={['ethereum', 'polygon', 'bsc']}
    onComplete={handleExportComplete}
    onCancel={() => setActiveWizard(null)}
  />
)}
```

## Testing

The export wizard includes comprehensive test coverage:

- Unit tests with Vitest
- Storybook stories for all states
- Mock data for development
- Integration tests for step navigation

### Running Tests

```bash
# Run unit tests
npm run test

# Run Storybook
npm run storybook
```

### Test Coverage

- ✅ Basic rendering
- ✅ Modal functionality
- ✅ Step navigation
- ✅ NFT selection
- ✅ Network configuration
- ✅ Cost calculation
- ✅ Export process
- ✅ Success/error states
- ✅ Multi-NFT support

## Development Notes

### Current Implementation Status

- ✅ UI Components complete
- ✅ Step navigation working
- ✅ Mock data integration
- 🚧 ICRC-7 queries (placeholder implementation)
- 🚧 Orchestrator integration (mock implementation)
- 🚧 Cycles payment approval (mock implementation)
- 🚧 Cast operations (placeholder implementation)

### Next Steps

1. Implement actual ICRC-7 queries for NFT fetching
2. Integrate with orchestrator for cost calculations
3. Implement cycles payment approval workflow
4. Add cast operation handling
5. Implement EVM transaction monitoring
6. Add proper error handling and retry logic

### Notes

- The export wizard reuses the EVMConnectionStep from the import wizard
- Mock implementations are provided for all backend operations
- The component follows the same patterns as EVMImportWizard for consistency
- Progress tracking uses the same BridgeProgress system as import

## Related Files

- `src/components/bridge/EVMExportWizard.tsx` - Main wizard component
- `src/components/bridge/ICNFTSelectionStep.tsx` - NFT selection step
- `src/components/bridge/RemoteContractStep.tsx` - Contract configuration step
- `src/components/bridge/ExportCostsStep.tsx` - Cost review step
- `src/components/bridge/EVMConnectionStep.tsx` - Shared wallet connection step
- `src/frontend/routes/bridge.tsx` - Main bridge page integration
- `src/stories/EVMExportWizard.stories.tsx` - Storybook stories
- `src/components/bridge/__tests__/EVMExportWizard.test.tsx` - Unit tests

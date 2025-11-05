import type { Meta, StoryObj } from '@storybook/react';
import { SolanaExportWizard } from '../components/bridge/SolanaExportWizard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SolanaWalletProvider } from '../provider/SolanaWalletProvider';
import { IdentityKitProvider } from '@nfid/identitykit/react';
import { IdentityKitAuthType } from '@nfid/identitykit';
import { AgentProvider } from '../provider/AgentProvider';
import '@nfid/identitykit/react/styles.css';

// Create a query client that doesn't retry
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Full provider chain for Solana export wizard
const withStoryProviders = (Story: any) => (
  <SolanaWalletProvider>
    <IdentityKitProvider authType={IdentityKitAuthType.ACCOUNTS}>
      <AgentProvider network="local">
        <QueryClientProvider client={queryClient}>
          <div className="min-h-screen bg-gray-50 p-4">
            <Story />
          </div>
        </QueryClientProvider>
      </AgentProvider>
    </IdentityKitProvider>
  </SolanaWalletProvider>
);

// Error suppression for network calls in stories
if (typeof window !== 'undefined') {
  try {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      if (args[0]?.includes?.('Cannot POST') || args[0]?.includes?.('404')) {
        return;
      }
      originalError.apply(console, args);
    };
  } catch (e) {
    // Ignore
  }
}

const meta: Meta<typeof SolanaExportWizard> = {
  title: 'Bridge/SolanaExportWizard',
  component: SolanaExportWizard,
  decorators: [withStoryProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## SolanaExportWizard Component

The SolanaExportWizard provides a comprehensive multi-step interface for exporting ckNFTs from the Internet Computer to Solana blockchain. This wizard manages the complete IC-to-Solana bridging workflow using the ICRC-99 standard.

### Wizard Flow

**4 Steps + Completion**:
1. **IC NFT Selection** (\`select-ic-nft\`) - Choose ckNFTs to export
2. **Network Selection** (\`network\`) - Select Solana cluster (mainnet/devnet/testnet/localnet)
3. **Cost Review** (\`costs\`) - Approve cycles payment, fund SOL, deploy collection (if needed)
4. **Export Execution** (\`export\`) - Cast NFTs to Solana with progress tracking
5. **Completion** (\`complete\`) - Success/failure result with transaction details

### Architecture

#### Multi-Step State Management
\\\`\\\`\\\`typescript
type SolanaExportWizardStep = 
  | 'select-ic-nft'    // Choose NFTs from IC
  | 'network'          // Pick Solana cluster
  | 'costs'            // Approve & fund
  | 'export'           // Execute cast
  | 'complete';        // Show result
\\\`\\\`\\\`

#### Step Components Used
- **ICNFTSelectionStep**: Browse ckNFT collections, select NFTs to export
- **SolanaNetworkSelectionStep**: Choose Solana cluster with wallet integration
- **SolanaExportCostStep**: Cost breakdown, cycles approval, SOL funding, collection deployment
- **BridgeChecklist**: Real-time progress tracking during export execution

#### ICRC-99 Integration

**Source Contract Pointer Detection**:
\\\`\\\`\\\`typescript
// Check if canister supports ICRC-99
const icrc99Support = useICRC99Support(canisterId);

// Use native chain info if supported
if (icrc99Support.isSupported) {
  sourcePointer = icrc99Support.nativeChain;
} else {
  // Fallback to IC network
  sourcePointer = { network: { IC: [] }, contract: canisterId };
}
\\\`\\\`\\\`

**Cast Request Format**:
\\\`\\\`\\\`typescript
interface CastRequest {
  from: Principal;        // IC identity (user)
  to: string;            // Solana wallet address
  token_ids: bigint[];   // NFTs to export
  memo?: Uint8Array;     // Optional metadata
}
\\\`\\\`\\\`

### Key Features

#### 1. Automatic Collection Deployment
If target network doesn't have collection deployed:
- Cost step shows deployment cost (~50 TC)
- User clicks "Deploy Collection"
- Progress: createRemoteContract() → poll status → get address
- Auto-enables export after deployment

#### 2. Progress Tracking System
Custom steps based on collection deployment status:
\\\`\\\`\\\`typescript
const steps = [
  // Only if collection doesn't exist:
  { id: 'deploy-solana-collection', stage: 'contract' },
  
  // Always required:
  { id: 'approve-cycles-cast', stage: 'preparation' },
  { id: 'cast-nfts', stage: 'execution' },
  { id: 'wait-solana-confirmation', stage: 'execution' },
];
\\\`\\\`\\\`

#### 3. Cast Operation Flow
\\\`\\\`\\\`
1. User clicks "Start Export"
2. Create BridgeProgress state
3. Step 1: Approve cycles (if not already approved)
4. Step 2: Call orchestrator.cast()
   - Returns castId for tracking
5. Step 3: Poll orchestrator.getCastStatus(castId)
   - Wait for finalized: true
   - Extract Solana transaction hash
6. Show success with transaction details
\\\`\\\`\\\`

#### 4. Error Recovery
- **Retry Buttons**: Available on failed retryable steps
- **Back Navigation**: Return to previous steps to fix issues
- **Clear Error Messages**: Specific guidance for common failures
- **State Preservation**: Selections persist during retries

### Props Interface

\\\`\\\`\\\`typescript
interface SolanaExportWizardProps {
  sourceCanisterId?: string;        // Pre-select ckNFT canister
  onComplete?: (result: SolanaExportResult) => void;
  onCancel?: () => void;            // Close/cancel callback
  className?: string;               // Additional CSS
  modal?: boolean;                  // Show as modal (default: false)
  initialStep?: SolanaExportWizardStep; // For testing/demos
}

interface SolanaExportResult {
  success: boolean;
  icTransactionHash?: string;       // IC cast transaction
  solanaTransactionHash?: string;   // Solana confirmation
  collectionAddress?: string;       // Deployed collection (if new)
  tokenIds?: string[];              // Exported token IDs
  mintAddresses?: string[];         // Solana mint addresses
  error?: string;                   // Error message if failed
}
\\\`\\\`\\\`

### Integration Requirements

**1. Solana Wallet Connection**
- User must connect Phantom, Backpack, or Solflare
- Wallet provides: publicKey, signTransaction, sendTransaction
- Used for: target address, SOL funding (optional)

**2. IC Authentication**
- User must authenticate with Internet Identity or NFID
- Provides: principal (from identity), agent (authenticated)
- Used for: NFT ownership, cast signing

**3. Orchestrator Configuration**
- Orchestrator must be configured with Solana service
- MapNetwork configuration required for target cluster
- Example for localnet:
\\\`\\\`\\\`bash
dfx canister call orchestrator configure '(
  vec {
    variant {
      MapNetwork = record {
        network = variant { Solana = opt variant { localnet } };
        service = variant {
          Solana = record {
            rpc = variant { Provider = 0 };
            canisterId = principal "tghme-zyaaa-aaaar-qarca-cai";
          }
        };
        action = variant { Add };
      }
    };
  }
)' --network local
\\\`\\\`\\\`

### Step-by-Step Workflow

#### Step 1: IC NFT Selection
**User Actions**:
- Browse owned ckNFT collections
- Search/filter NFTs
- Select one or more NFTs to export
- Click "Continue"

**Validation**:
- At least 1 NFT selected
- User owns all selected NFTs
- Canister supports ICRC-99 (or IC fallback)

**State Updates**:
- \`selectedICNFTs\`: Array of selected tokens
- \`activeCanisterId\`: Source canister ID
- \`sourceContractPointer\`: Determined from ICRC-99 check

#### Step 2: Network Selection
**User Actions**:
- Connect Solana wallet (if not connected)
- Select target cluster (mainnet/devnet/testnet/localnet)
- Wallet cluster must match selection
- Click "Continue"

**Validation**:
- Wallet connected
- Cluster selected
- (Optional) Wallet RPC matches cluster

**State Updates**:
- \`targetNetwork\`: { name, endpoint, deployed, collectionAddress?, network }
- Deployed status checked via orchestrator query

#### Step 3: Cost Review
**User Actions**:
- Review cost breakdown (deployment + casting)
- Select priority fee preset
- Approve cycles payment (dual approvals)
- Fund SOL address (rent + priority fee)
- Deploy collection (if needed)
- Wait for "Ready to Export" state

**Validation**:
- Cycles approved for orchestrator (if deployment needed)
- Cycles approved for ckNFT canister (always)
- SOL funded to canister's address (sufficient balance)
- Collection deployed (if wasn't already)

**State Updates**:
- \`exportCosts\`: Total cycles required
- \`isExportReady\`: true when all requirements met
- \`targetNetwork.deployed\`: true after deployment
- \`targetNetwork.collectionAddress\`: Set after deployment

#### Step 4: Export Execution
**User Actions**:
- Click "Start Export"
- Watch progress through BridgeChecklist
- Wait for completion (30s - 3 minutes)

**Automated Flow**:
1. Create progress state with custom steps
2. Execute cycles approval (if not already done)
3. Call \`orchestrator.cast(castRequest)\`
   - \`from\`: User's IC principal
   - \`to\`: Solana wallet address (base58)
   - \`token_ids\`: Selected NFT IDs (as bigints)
4. Get \`castId\` from response
5. Poll \`orchestrator.getCastStatus(castId)\` every 5 seconds
   - Max 60 attempts (5 minutes timeout)
6. Wait for \`finalized: true\`
7. Extract Solana transaction hash from status
8. Mark step complete

**State Updates**:
- \`progress\`: BridgeProgress with step statuses
- Individual steps: 'pending' → 'loading' → 'completed'/'failed'

#### Step 5: Completion
**Success Display**:
- Green checkmark icon
- "Export Successful!" heading
- Collection address (if deployed)
- Number of NFTs exported
- Solana transaction hash (clickable to explorer)
- Buttons: "Export More NFTs" (restart), "Close"

**Failure Display**:
- Red X icon
- "Export Failed" heading
- Error message with details
- Buttons: "Try Again" (restart), "Close"

**Callbacks**:
- \`onComplete(result)\`: Called with success/failure details
- User clicks button → triggers callback or restart

### Navigation Controls

**Header Bar**:
- Progress indicator: "Step X of 4"
- Step labels with checkmarks
- Close button (X icon)

**Footer Buttons**:
- **Back**: Returns to previous step
  - Hidden on step 1
  - Disabled during export execution
- **Cancel**: Closes wizard
  - Visible on all steps except completion
  - Confirms if export in progress
- **Continue**: Proceeds to next step
  - Disabled if validation fails
  - Label changes: "Continue" → "Review Costs" → "Start Export"

### Network-Specific Behavior

**Localnet** (http://127.0.0.1:8899):
- Shows CLI airdrop command
- Fast confirmation (200ms slots)
- Devnet cluster ID used for orchestrator mapping
- Perfect for rapid testing

**Devnet** (https://api.devnet.solana.com):
- Shows faucet link for free SOL
- 1-5 second confirmation
- Standard testing environment

**Testnet** (https://api.testnet.solana.com):
- Similar to devnet
- Alternative testing cluster
- Less commonly used

**Mainnet Beta** (https://api.mainnet-beta.solana.com):
- Real SOL required
- 10-20 second confirmation
- Production environment
- Warning shown about real value

### Cost Breakdown Examples

**Single NFT to Devnet (New Collection)**:
- Collection deployment: ~50 TC
- NFT casting: ~20 TC
- Total cycles: ~70 TC
- SOL required: ~0.058 SOL (rent + medium priority fee)
- Time: 60-90 seconds

**5 NFTs to Devnet (Existing Collection)**:
- Collection deployment: 0 TC (exists)
- NFT casting: 20 TC × 5 = 100 TC
- Total cycles: 100 TC
- SOL required: ~0.065 SOL (5 NFTs rent + priority fee)
- Time: 90-120 seconds

**Re-export to Devnet**:
- Collection deployment: 0 TC (exists)
- NFT casting: ~2 TC (just transfer)
- Total cycles: ~2 TC
- SOL required: ~0.0001 SOL (1 tx)
- Time: 30 seconds

### Common Error Scenarios

**1. Insufficient Cycles**
- **When**: Costs step, after calculation
- **Display**: Red warning banner, deficit shown
- **Resolution**: Deposit cycles to user account
- **User Action**: Back to deposit, then continue

**2. Insufficient SOL**
- **When**: Costs step, checking balance
- **Display**: Red warning at funding section
- **Resolution**: Transfer SOL to canister's address
- **User Action**: Fund via wallet or manual transfer

**3. Wallet Disconnected**
- **When**: Network step or during export
- **Display**: "Wallet not connected" error
- **Resolution**: Reconnect Solana wallet
- **User Action**: Click "Connect Wallet"

**4. IC Session Expired**
- **When**: Export execution, cast call
- **Display**: "Authentication required" error
- **Resolution**: Re-authenticate with IC identity
- **User Action**: Back to login, then continue

**5. Deployment Timeout**
- **When**: Costs step, deploying collection
- **Display**: "Deployment timed out" after 5 minutes
- **Resolution**: Check orchestrator, retry
- **User Action**: Click "Deploy Collection" again

**6. Cast Timeout**
- **When**: Export execution, polling status
- **Display**: "Cast operation timed out"
- **Resolution**: Check orchestrator logs, verify status
- **User Action**: Retry from costs step

### Performance Considerations

- **Step Components**: Lazy-loaded via dynamic imports
- **RPC Queries**: Parallel where possible (balance, allowance, costs)
- **Polling Intervals**: 5 seconds (prevents spam)
- **Timeout Limits**: 5 minutes for deployment, cast operations
- **State Persistence**: Selections maintained during back/retry
- **Memory Cleanup**: Abort controllers cancelled on unmount

### Accessibility

- **Keyboard Navigation**: Full tab/enter support
- **Screen Readers**: ARIA labels on all controls
- **Progress Indicators**: Visual and text status
- **Error Announcements**: Clear error messages
- **Loading States**: Spinners with descriptive text
- **Focus Management**: Auto-focus on step transitions

### Testing Strategies

**Unit Testing**:
- Mock Solana wallet provider
- Mock IC agent and identity
- Mock orchestrator responses
- Test step transitions
- Test validation logic

**Integration Testing**:
- Use solana-test-validator
- Use dfx local replica
- Deploy test orchestrator
- Execute real cast operations
- Verify on-chain state

**E2E Testing**:
- Playwright/Cypress with wallet extension
- Full workflow from selection to completion
- Error scenario testing
- Network switching tests
- Timeout handling tests

### Future Enhancements

Potential improvements:
- **Batch Optimization**: Group multiple NFTs in single transaction
- **Gas Estimation**: Better SOL cost prediction with network conditions
- **Resume Support**: Save progress, resume later
- **Transaction History**: Show previous exports
- **Advanced Options**: Custom RPC, custom explorer URLs
- **Mobile Optimization**: Better touch interactions
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    sourceCanisterId: {
      control: 'text',
      description: 'Pre-select the ckNFT canister ID to export from',
      table: {
        type: { summary: 'string | undefined' },
      },
    },
    onComplete: {
      action: 'export-complete',
      description: 'Callback fired when export completes (success or failure)',
      table: {
        type: { summary: '(result: SolanaExportResult) => void | undefined' },
      },
    },
    onCancel: {
      action: 'wizard-cancelled',
      description: 'Callback fired when wizard is cancelled or closed',
      table: {
        type: { summary: '() => void | undefined' },
      },
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes for the wizard container',
      table: {
        type: { summary: 'string | undefined' },
      },
    },
    modal: {
      control: 'boolean',
      description: 'Display wizard in modal mode (full-screen overlay)',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    initialStep: {
      control: 'select',
      options: ['select-ic-nft', 'network', 'costs', 'export', 'complete'],
      description: 'Initial step to display (for testing/demos)',
      table: {
        type: { summary: 'SolanaExportWizardStep | undefined' },
      },
    },
  },
} satisfies Meta<typeof SolanaExportWizard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Default wizard starting at IC NFT selection step. Requires IC authentication to see owned NFTs and Solana wallet connection for target address. **Complete Flow**: Select NFTs → Choose network → Approve costs → Execute export → View result.',
      },
    },
  },
};

export const Step1_ICNFTSelection: Story = {
  args: {
    initialStep: 'select-ic-nft',
  },
  parameters: {
    docs: {
      description: {
        story: 'Step 1: IC NFT Selection. Browse owned ckNFT collections, search/filter, select NFTs to export. **Validation**: Must select at least 1 NFT, user must own all selected NFTs. **Next**: Network selection.',
      },
    },
  },
};

export const Step2_NetworkSelection: Story = {
  args: {
    initialStep: 'network',
    sourceCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  },
  parameters: {
    docs: {
      description: {
        story: 'Step 2: Solana Network Selection. Connect wallet, choose cluster (mainnet/devnet/testnet/localnet). Shows RPC endpoint, wallet connection status, cluster options. **Validation**: Wallet connected, cluster selected. **Next**: Cost review.',
      },
    },
  },
};

export const Step3_CostReview: Story = {
  args: {
    initialStep: 'costs',
    sourceCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  },
  parameters: {
    docs: {
      description: {
        story: 'Step 3: Cost Review. Shows cycles breakdown (deployment + casting), SOL requirements (rent + priority fee). User approves cycles, funds SOL, deploys collection (if needed). **Validation**: Approved + funded + deployed. **Next**: Export execution.',
      },
    },
  },
};

export const Step4_ExportExecution: Story = {
  args: {
    initialStep: 'export',
    sourceCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  },
  parameters: {
    docs: {
      description: {
        story: 'Step 4: Export Execution. BridgeChecklist shows real-time progress: approve cycles → cast NFTs → wait confirmation. Progress bars, status indicators, estimated times. **Duration**: 30s - 3 minutes. **Result**: Success or failure screen.',
      },
    },
  },
};

export const SuccessfulExport: Story = {
  args: {
    initialStep: 'complete',
  },
  render: (args) => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Export Successful!</h3>
        <p className="text-gray-600 mb-6">
          Your NFTs have been successfully exported to Solana.
        </p>
        
        <div className="bg-cyan-50 rounded-lg p-4 text-left max-w-md mx-auto mb-6">
          <h4 className="font-semibold text-gray-900 mb-2">Export Details:</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">Collection Address:</span>
              <div className="font-mono text-xs break-all text-cyan-700">CoLLecTioN...xyz789</div>
            </div>
            <div>
              <span className="text-gray-500">NFTs Exported:</span>
              <div className="font-medium text-gray-900">3 tokens</div>
            </div>
            <div>
              <span className="text-gray-500">Solana Transaction:</span>
              <div className="font-mono text-xs break-all text-cyan-700">5X7gH2kL9pQ...abc123</div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center space-x-4">
          <button className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors">
            Export More NFTs
          </button>
          <button className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Success completion screen. Green checkmark, export details (collection address, token count, transaction hash), action buttons. **User Options**: Export more NFTs (restart wizard), Close (exit). **Result**: onComplete() called with success=true.',
      },
    },
  },
};

export const FailedExport: Story = {
  args: {
    initialStep: 'complete',
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Export Failed</h3>
        <p className="text-gray-600 mb-6">
          There was an issue exporting your NFTs to Solana.
        </p>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left max-w-md mx-auto mb-6">
          <h4 className="font-semibold text-red-900 mb-2">Error Details:</h4>
          <p className="text-sm text-red-700">Cast operation timed out after 5 minutes. The orchestrator may be processing the request. Check cast status or contact support.</p>
        </div>
        
        <div className="flex items-center justify-center space-x-4">
          <button className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors">
            Try Again
          </button>
          <button className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Failure completion screen. Red X icon, error explanation, action buttons. **Common Errors**: Timeout, insufficient balance, network issues, orchestrator error. **User Options**: Try again (restart), Close (exit). **Result**: onComplete() called with success=false.',
      },
    },
  },
};

export const BackNavigation: Story = {
  args: {
    initialStep: 'costs',
    sourceCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  },
  parameters: {
    docs: {
      description: {
        story: 'Back navigation demonstration. Footer shows "← Back" button to return to previous step. **Behavior**: State preserved (selections maintained), can fix issues and continue. **Disabled**: During export execution.',
      },
    },
  },
};

export const CancelFlow: Story = {
  args: {
    initialStep: 'network',
  },
  parameters: {
    docs: {
      description: {
        story: 'Cancel flow with confirmation. "Cancel" button in footer or X icon in header. **Confirmation**: If export in progress, asks "Are you sure?". **Result**: onCancel() callback fired, wizard closes.',
      },
    },
  },
};

export const ValidationErrors: Story = {
  args: {
    initialStep: 'select-ic-nft',
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">IC NFT Selection</h3>
        
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-red-800">Please select at least one NFT to continue</span>
          </div>
        </div>
        
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-yellow-800">Wallet not connected. Connect to see your NFTs</span>
          </div>
        </div>
        
        <button disabled className="w-full px-6 py-3 bg-gray-300 text-gray-500 font-semibold rounded-lg cursor-not-allowed">
          Continue →
        </button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Validation error states. Red banners for hard errors (no NFTs selected), yellow for warnings (no wallet). **Effect**: Continue button disabled until requirements met. **Clear Guidance**: Specific messages explain what\'s needed.',
      },
    },
  },
};

export const InsufficientBalance: Story = {
  args: {
    initialStep: 'costs',
    sourceCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h3 className="text-lg font-semibold">Cost Review</h3>
      
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center mb-2">
          <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="font-medium text-red-800">Insufficient Cycles Balance</span>
        </div>
        <p className="text-sm text-red-700 ml-7">
          You have 25 TC but need 84 TC (including 120% buffer). Please deposit 59 TC to continue.
        </p>
      </div>
      
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center mb-2">
          <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="font-medium text-red-800">Insufficient SOL Balance</span>
        </div>
        <p className="text-sm text-red-700 ml-7">
          Canister address has 0.000 SOL but needs 0.058 SOL for rent + priority fee. Please fund the address.
        </p>
      </div>
      
      <div className="flex space-x-4">
        <button className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg">
          ← Back
        </button>
        <button disabled className="px-6 py-3 bg-gray-300 text-gray-500 font-semibold rounded-lg cursor-not-allowed flex-1">
          Start Export
        </button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Insufficient balance errors at cost step. Shows specific deficits for cycles and SOL. **Resolution**: User must deposit cycles and fund SOL address. **Effect**: "Start Export" disabled until balances sufficient.',
      },
    },
  },
};

export const CollectionDeploymentNeeded: Story = {
  args: {
    initialStep: 'costs',
    sourceCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  },
  parameters: {
    docs: {
      description: {
        story: 'Collection deployment required scenario. Cost breakdown shows deployment cost (~50 TC). After approval + funding, "Deploy Collection" button enabled. **Flow**: Deploy → wait 30-60s → success → ready to export.',
      },
    },
  },
};

export const MultipleNFTsExport: Story = {
  args: {
    initialStep: 'select-ic-nft',
    sourceCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  },
  parameters: {
    docs: {
      description: {
        story: 'Multiple NFTs selected (5 tokens). Cost step shows scaled costs: deployment (if needed) + (20 TC × 5) = casting cost. SOL rent also scales. **Efficiency**: Batch export cheaper than individual exports.',
      },
    },
  },
};

export const Interactive: Story = {
  args: {
    sourceCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  },
  parameters: {
    docs: {
      description: {
        story: 'Fully interactive wizard demo. Navigate through all steps, interact with components. **Requirements**: IC authentication for NFT selection, Solana wallet for target address. **Try**: Select NFTs → choose network → review costs → (mock) export.',
      },
    },
  },
};

export const WithPreselectedCanister: Story = {
  args: {
    sourceCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  },
  parameters: {
    docs: {
      description: {
        story: 'Wizard with pre-selected canister ID. NFT selection step shows only this canister\'s NFTs. **Use Case**: Direct link to export from specific collection, embedded widget with fixed source.',
      },
    },
  },
};

export const ModalMode: Story = {
  args: {
    modal: true,
    sourceCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  },
  parameters: {
    docs: {
      description: {
        story: 'Wizard displayed as full-screen modal overlay. Dark backdrop, centered content, close button in corner. **Use Case**: Popup export flow from collection page, overlay on existing UI.',
      },
    },
  },
};

// Responsive variants
export const Mobile: Story = {
  args: {
    initialStep: 'network',
    sourceCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Mobile-optimized wizard view. Steps stack vertically, buttons full-width, progress indicator condensed. All functionality preserved, touch-friendly targets.',
      },
    },
  },
};

export const Tablet: Story = {
  args: {
    initialStep: 'costs',
    sourceCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story: 'Tablet view with balanced layout. 2-column cost breakdown, medium-width containers, comfortable spacing. Optimal for iPad-sized devices.',
      },
    },
  },
};

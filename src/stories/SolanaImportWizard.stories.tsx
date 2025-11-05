import type { Meta, StoryObj } from '@storybook/react';
import { SolanaImportWizard } from '../components/bridge/SolanaImportWizard';
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

// Full provider chain for Solana import wizard
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

const meta: Meta<typeof SolanaImportWizard> = {
  title: 'Bridge/SolanaImportWizard',
  component: SolanaImportWizard,
  decorators: [withStoryProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## SolanaImportWizard Component

The SolanaImportWizard provides a comprehensive multi-step interface for importing NFTs from Solana blockchain to the Internet Computer as ckNFTs. This wizard manages the complete Solana-to-IC bridging workflow.

### Wizard Flow

**6 Steps + Completion**:
1. **Connect** - Connect Solana wallet and select cluster
2. **Select NFTs** - Browse collections via Metaplex, choose NFTs to bridge
3. **Create Canister** - Set up ckNFT canister on IC
4. **Estimate Costs** - Calculate minting costs, check approval
5. **Bridge** - Execute burn on Solana, mint on IC with progress tracking
6. **Complete** - Success/failure result with canister address

### Architecture

#### Step Sequence
\\\`\\\`\\\`typescript
Step 1: SolanaConnectionStep
  → Connect wallet (Phantom/Backpack/Solflare)
  → Select cluster (mainnet/devnet/testnet/localnet)

Step 2: Collection & NFT Selection
  → SolanaCollectionSelectionStep (browse via Metaplex)
  → SolanaNFTSelectionStep (select individual NFTs)

Step 3: SolanaCanisterCostStep
  → Calculate canister creation cost
  → Create ckNFT canister on IC
  → Display canister principal

Step 4: NFTMintEstimationStep
  → Calculate minting costs (per NFT)
  → Check orchestrator allowance
  → Show 120% buffer requirement

Step 5: SolanaBridgeExecutionStep
  → Approve cycles (if insufficient)
  → Burn NFTs on Solana
  → Mint ckNFTs on IC
  → Track progress

Step 6: Completion
  → Display success/failure
  → Show canister address
  → Link to newly minted ckNFTs
\\\`\\\`\\\`

### Key Features

#### 1. Metaplex Integration
Discovers NFTs using Metaplex Foundation JS SDK:
- **Digital Asset API**: Query NFTs by owner
- **Metadata Resolution**: Fetch on-chain + off-chain metadata
- **Collection Detection**: Identify collection memberships
- **Image Loading**: Display NFT thumbnails from Arweave/IPFS

#### 2. Dual-Chain Operations

**Solana Side** (Burn):
- Transfer NFT to burn address (special account)
- Proof of burn via transaction signature
- NFT effectively removed from circulation
- Recoverable if bridge fails

**IC Side** (Mint):
- Create ckNFT canister (if first import)
- Mint wrapped NFT with original metadata
- Preserve traits, image, description
- Maintain collection affiliation

#### 3. Cost Management

**Canister Creation** (~1 TC):
- One-time cost per collection
- Subsequent imports reuse canister
- Admin controls set to user

**Minting Cost** (~0.5 TC per NFT):
- Scales with NFT count
- Includes metadata storage
- 120% buffer required for approval
- Approval valid 24 hours

#### 4. Progress Tracking
Real-time status updates:
- **Pending**: Operation not started
- **Loading**: Transaction in progress
- **Completed**: Operation successful
- **Failed**: Error occurred (retryable)

### Props Interface

\\\`\\\`\\\`typescript
interface SolanaImportWizardProps {
  onComplete?: (result: SolanaImportResult) => void;
  onCancel?: () => void;
  mode?: 'inline' | 'modal';  // Display mode
}

interface SolanaImportResult {
  success: boolean;
  solanaTransactionHash?: string;  // Burn tx hash
  icTransactionHash?: string;      // Mint tx hash
  canisterAddress?: string;        // ckNFT canister principal
  tokenId?: string;                // Minted token ID
  error?: string;                  // Error message if failed
}
\\\`\\\`\\\`

### Step-by-Step Workflow

#### Step 1: Connect Wallet
**User Actions**:
- Click wallet extension (Phantom/Backpack/Solflare)
- Approve connection
- Select target cluster
- Verify wallet cluster matches selection

**Validation**:
- Wallet connected (publicKey exists)
- Cluster selected
- (Optional) Wallet RPC matches cluster

**State Updates**:
- \`selectedTargetCluster\`: Solana cluster
- Wallet connection established

**UI Components**:
- SolanaConnectionStep
- Cluster selector
- Wallet connection button
- RPC endpoint display (with custom RPC detection)

#### Step 2: Select NFTs
**User Actions**:
- View owned NFT collections (via Metaplex query)
- Select a collection
- Browse NFTs in collection
- Select individual NFTs to bridge (multi-select)
- Click "Continue"

**Validation**:
- Collection selected
- At least 1 NFT selected
- User owns all selected NFTs

**State Updates**:
- \`selectedCollection\`: Collection metadata
- \`selectedNFTs\`: Array of NFT data (mint address, metadata)

**UI Components**:
- SolanaCollectionSelectionStep
- SolanaNFTSelectionStep (with manual entry option)
- Search/filter functionality
- Image gallery

#### Step 3: Create Canister
**User Actions**:
- Review canister creation cost (~1 TC)
- Click "Create Canister"
- Wait for canister deployment (10-30 seconds)
- Verify canister address displayed

**Validation**:
- IC authentication active
- Sufficient cycles balance
- Canister created successfully

**State Updates**:
- \`canisterCosts\`: Canister creation cost
- \`canisterAddress\`: New canister principal

**UI Components**:
- SolanaCanisterCostStep
- Cost breakdown
- Creation progress indicator
- Canister address display

**Technical Flow**:
1. Call \`orchestrator.createCkNFTCanister()\`
2. Poll for canister creation status
3. Get canister principal
4. Set user as admin
5. Initialize with collection metadata

#### Step 4: Estimate Costs
**User Actions**:
- View minting cost breakdown
- Review approval requirement (120% buffer)
- Check current orchestrator allowance
- See approval status (sufficient/insufficient)
- Click "Continue to Bridge Execution"

**Validation**:
- Canister address exists
- Mint costs calculated
- (Note: Approval happens in Step 5)

**State Updates**:
- \`mintCosts\`: Total minting cost
- Allowance info displayed (informational)

**UI Components**:
- NFTMintEstimationStep
- Cost calculator
- Approval status indicator
- Allowance checker

**Cost Calculation**:
\\\`\\\`\\\`typescript
// Per-NFT minting cost
const perNFTCost = 0.5 TC;
const totalCost = perNFTCost * selectedNFTs.length;

// Approval requires 120% buffer
const approvalAmount = (totalCost * 120) / 100;
\\\`\\\`\\\`

#### Step 5: Bridge Execution
**User Actions**:
- Review final summary
- Click "Start Bridge"
- Approve cycles (if insufficient allowance)
- Sign Solana burn transaction
- Wait for IC mint confirmation (1-3 minutes)
- Watch progress through checklist

**Automated Flow**:
1. **Check Allowance**: Query current orchestrator allowance
2. **Approve Cycles** (if needed): Call \`cyclesApprove()\` with 120% buffer
3. **Burn on Solana**: 
   - Transfer NFTs to burn address
   - Get transaction signature
4. **Mint on IC**:
   - Call \`orchestrator.mint(burnProof)\`
   - Wait for confirmation
   - Get ckNFT token IDs
5. **Update Progress**: Mark each step complete/failed

**State Updates**:
- Progress steps updated in real-time
- Transaction hashes captured
- Token IDs assigned

**UI Components**:
- SolanaBridgeExecutionStep
- Progress checklist (BridgeChecklist-like)
- Status indicators
- Error messages

**Error Handling**:
- Insufficient allowance → auto-approve
- Burn tx rejected → allow retry
- Mint fails → show error, preserve burn proof
- Timeout → allow status check

#### Step 6: Completion
**Success Display**:
- Green checkmark icon
- "Import Successful!" heading
- Canister address (clickable to IC explorer)
- Token IDs minted
- Solana burn transaction hash
- Buttons: "Import More NFTs", "View ckNFTs", "Close"

**Failure Display**:
- Red X icon
- "Import Failed" heading
- Error message with specifics
- Recovery instructions
- Buttons: "Try Again", "Contact Support", "Close"

**Callbacks**:
- \`onComplete(result)\`: Called with success/failure
- User can restart wizard or close

### Navigation Controls

**Header Bar**:
- Progress steps (1-6) with visual indicators
- Current step highlighted
- Completed steps show checkmark
- Future steps grayed out
- Close button (X icon)

**Footer Buttons**:
- **Back**: Return to previous step
  - Hidden on Step 1
  - Disabled during bridge execution (Step 5)
- **Cancel**: Close wizard
  - Confirmation if work in progress
  - Available all steps except completion
- **Continue**: Proceed to next step
  - Disabled if validation fails
  - Label adapts: "Continue" / "Create Canister" / "Start Bridge"

### Network-Specific Behavior

**Localnet** (http://127.0.0.1:8899):
- Fast operations (200ms confirmation)
- Unlimited test NFTs via local minting
- No faucet needed (airdrop command shown)
- Perfect for rapid testing

**Devnet** (https://api.devnet.solana.com):
- Standard testing environment
- Free test NFTs available
- 1-5 second confirmation
- Faucet links provided

**Testnet** (https://api.testnet.solana.com):
- Alternative testing cluster
- Similar to devnet
- Less commonly used

**Mainnet Beta** (https://api.mainnet-beta.solana.com):
- Real NFTs with value
- 10-20 second confirmation
- Production environment
- Warning about real assets

### Cost Examples

**Single NFT Import to Devnet**:
- Canister creation: ~1 TC (one-time)
- Minting: ~0.5 TC
- Approval buffer: 1.8 TC (120%)
- Total first import: ~1.8 TC
- Subsequent imports: ~0.6 TC (reuse canister)

**5 NFTs Import (New Canister)**:
- Canister creation: ~1 TC
- Minting: 0.5 TC × 5 = 2.5 TC
- Total: 3.5 TC
- Approval: 4.2 TC (120%)

**10 NFTs Import (Existing Canister)**:
- Canister creation: 0 TC (exists)
- Minting: 0.5 TC × 10 = 5 TC
- Approval: 6 TC (120%)

### Common Error Scenarios

**1. Wallet Not Connected**
- **When**: Step 1, trying to continue
- **Display**: Yellow warning banner
- **Resolution**: Connect wallet extension
- **User Action**: Click "Connect Wallet"

**2. No NFTs Owned**
- **When**: Step 2, viewing collection
- **Display**: Empty state with helpful message
- **Resolution**: Acquire NFTs or use manual entry
- **User Action**: Mint test NFT or enter mint address

**3. IC Session Expired**
- **When**: Step 3 or 5, IC calls
- **Display**: "Please authenticate" error
- **Resolution**: Re-authenticate with Internet Identity
- **User Action**: Click "Sign In"

**4. Insufficient Cycles**
- **When**: Step 5, during approval
- **Display**: "Insufficient balance" error with deficit
- **Resolution**: Deposit cycles to account
- **User Action**: Back to deposit, then continue

**5. Burn Transaction Rejected**
- **When**: Step 5, Solana burn
- **Display**: "Transaction rejected by user"
- **Resolution**: Retry burn operation
- **User Action**: Click "Retry", approve in wallet

**6. Mint Operation Failed**
- **When**: Step 5, IC minting
- **Display**: "Minting failed" with orchestrator error
- **Resolution**: Check burn proof, retry mint
- **User Action**: Contact support with burn tx hash

### Technical Implementation

**Metaplex NFT Discovery**:
\\\`\\\`\\\`typescript
// Query NFTs by owner
const nfts = await metaplex
  .nfts()
  .findAllByOwner({ owner: wallet.publicKey });

// Load metadata
const nftWithMetadata = await metaplex
  .nfts()
  .load({ metadata: nft.metadata });
\\\`\\\`\\\`

**Burn Operation**:
\\\`\\\`\\\`typescript
// Transfer to burn address (effectively burning)
const burnAddress = new PublicKey("1nc1n...burn");
const tx = await program.methods
  .transfer(burnAddress)
  .accounts({ nft: nftMint })
  .rpc();

// Signature serves as burn proof
const burnProof = { tx, nftMint: nftMint.toString() };
\\\`\\\`\\\`

**Mint Operation**:
\\\`\\\`\\\`typescript
// Mint ckNFT on IC
const result = await orchestrator.mint({
  burnProof: {
    txHash: burnProof.tx,
    nftMint: burnProof.nftMint,
    network: { Solana: [cluster] },
  },
  canister: canisterPrincipal,
  metadata: {
    name: nft.name,
    image: nft.image,
    attributes: nft.attributes,
  },
});
\\\`\\\`\\\`

### Performance Considerations

- **Lazy Loading**: Metaplex queries paginated
- **Image Optimization**: Thumbnails loaded progressively
- **Metadata Caching**: Reduce redundant RPC calls
- **Parallel Operations**: Batch NFT metadata fetches
- **Polling Intervals**: 5 seconds for status checks
- **Timeout Limits**: 5 minutes for canister creation, minting

### Accessibility

- **Keyboard Navigation**: Full tab/enter support
- **Screen Readers**: ARIA labels throughout
- **Progress Indicators**: Visual + text status
- **Error Announcements**: Clear, actionable messages
- **Loading States**: Spinners with descriptive text
- **Focus Management**: Auto-focus after step transitions

### Testing Strategies

**Unit Testing**:
- Mock Metaplex SDK responses
- Mock Solana wallet interactions
- Mock IC agent calls
- Test step transitions
- Validate cost calculations

**Integration Testing**:
- Use solana-test-validator
- Deploy test NFTs via Metaplex
- Use dfx local replica
- Execute real burn/mint
- Verify canister state

**E2E Testing**:
- Playwright with Phantom extension
- Full workflow from wallet connection to completion
- Error scenario testing (rejection, timeout)
- Multi-NFT batch testing

### Future Enhancements

Potential improvements:
- **Compressed NFT Support**: Handle Metaplex compressed NFTs
- **Batch Optimization**: Combine multiple NFTs in one transaction
- **Cost Prediction**: Better estimation based on metadata size
- **Resume Support**: Save progress, resume later
- **Transaction History**: Show previous imports
- **Collection Templates**: Pre-configured settings for common collections
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onComplete: {
      action: 'import-complete',
      description: 'Callback fired when import completes (success or failure)',
      table: {
        type: { summary: '(result: SolanaImportResult) => void | undefined' },
      },
    },
    onCancel: {
      action: 'wizard-cancelled',
      description: 'Callback fired when wizard is cancelled or closed',
      table: {
        type: { summary: '() => void | undefined' },
      },
    },
    mode: {
      control: 'radio',
      options: ['inline', 'modal'],
      description: 'Display mode: inline (embedded) or modal (full-screen overlay)',
      table: {
        type: { summary: "'inline' | 'modal'" },
        defaultValue: { summary: "'inline'" },
      },
    },
  },
} satisfies Meta<typeof SolanaImportWizard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Default wizard starting at Step 1 (wallet connection). **Complete Flow**: Connect wallet → Select NFTs → Create canister → Estimate costs → Bridge → View result. Requires both Solana wallet and IC authentication.',
      },
    },
  },
};

export const Step1_Connection: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Step 1: Solana Wallet Connection. Connect Phantom, Backpack, or Solflare wallet. Select target cluster (mainnet/devnet/testnet/localnet). Shows RPC endpoint, custom RPC detection. **Validation**: Wallet connected, cluster selected.',
      },
    },
  },
};

export const Step2_NFTSelection: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Step 2: Collection & NFT Selection. Browse owned collections via Metaplex, view NFTs with images/metadata, multi-select NFTs to bridge. **Features**: Search/filter, manual mint address entry, stuck NFT recovery.',
      },
    },
  },
};

export const Step3_CreateCanister: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Step 3: ckNFT Canister Creation. Review canister creation cost (~1 TC), create canister on IC, display canister principal. **One-Time**: Reuse canister for subsequent imports from same collection.',
      },
    },
  },
};

export const Step4_EstimateCosts: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Step 4: Mint Cost Estimation. Calculate minting costs (~0.5 TC per NFT), check orchestrator allowance, show 120% buffer requirement. **Info**: Approval handled automatically in Step 5 if insufficient.',
      },
    },
  },
};

export const Step5_BridgeExecution: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Step 5: Bridge Execution. Approve cycles (if needed), burn NFTs on Solana, mint ckNFTs on IC. Progress checklist shows real-time status. **Duration**: 1-3 minutes for complete operation.',
      },
    },
  },
};

export const SuccessfulImport: Story = {
  args: {},
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Import Successful!</h3>
        <p className="text-gray-600 mb-6">
          Your Solana NFTs have been successfully bridged to Internet Computer.
        </p>
        
        <div className="bg-cyan-50 rounded-lg p-4 text-left max-w-md mx-auto mb-6">
          <h4 className="font-semibold text-gray-900 mb-2">Import Details:</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">ckNFT Canister:</span>
              <div className="font-mono text-xs break-all text-cyan-700">ryjl3-tyaaa-aaaaa-aaaba-cai</div>
            </div>
            <div>
              <span className="text-gray-500">NFTs Imported:</span>
              <div className="font-medium text-gray-900">3 tokens</div>
            </div>
            <div>
              <span className="text-gray-500">Token IDs:</span>
              <div className="font-mono text-xs text-cyan-700">1, 2, 3</div>
            </div>
            <div>
              <span className="text-gray-500">Solana Burn Transaction:</span>
              <div className="font-mono text-xs break-all text-cyan-700">5X7gH2kL9pQ...abc123</div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center space-y-3">
          <button className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors w-64">
            View My ckNFTs
          </button>
          <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors w-64">
            Import More NFTs
          </button>
          <button className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors w-64">
            Close
          </button>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Success completion screen. Green checkmark, import details (canister address, token IDs, burn transaction hash), action buttons. **User Options**: View ckNFTs (explore collection), Import more (restart), Close (exit).',
      },
    },
  },
};

export const FailedImport: Story = {
  args: {},
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Import Failed</h3>
        <p className="text-gray-600 mb-6">
          There was an issue bridging your NFTs to Internet Computer.
        </p>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left max-w-md mx-auto mb-6">
          <h4 className="font-semibold text-red-900 mb-2">Error Details:</h4>
          <p className="text-sm text-red-700 mb-3">
            Minting operation failed: Orchestrator returned error "Insufficient allowance". 
            Your NFTs were burned on Solana but not minted on IC.
          </p>
          <div className="bg-white border border-red-300 rounded p-2 mb-2">
            <p className="text-xs text-gray-600">Burn Transaction (Proof):</p>
            <code className="text-xs font-mono text-red-800 break-all">5X7gH2kL9pQ...abc123</code>
          </div>
          <p className="text-xs text-red-600 font-medium">
            ⚠️ Save this transaction hash. Contact support to complete minting.
          </p>
        </div>
        
        <div className="flex items-center justify-center space-x-4">
          <button className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors">
            Retry Minting
          </button>
          <button className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Failure completion screen. Red X icon, error explanation with burn proof, recovery instructions. **Critical**: Burn tx hash preserved for recovery. **User Options**: Retry minting (with burn proof), Contact support, Close.',
      },
    },
  },
};

export const BackNavigation: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Back navigation demonstration. Footer shows "← Back" button to return to previous step. **Behavior**: Selections preserved, can fix issues and continue. **Disabled**: During Step 5 (bridge execution).',
      },
    },
  },
};

export const CancelFlow: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Cancel flow with confirmation. "Cancel" button in footer or X icon in header. **Confirmation**: If bridge in progress, asks "Are you sure? NFTs may be burned." **Result**: onCancel() fired, wizard closes.',
      },
    },
  },
};

export const ValidationErrors: Story = {
  args: {},
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Wallet Connection</h3>
        
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-yellow-800">Wallet not connected</span>
          </div>
          <p className="text-sm text-yellow-700 mt-1 ml-7">
            Please connect your Solana wallet to continue
          </p>
        </div>
        
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-red-800">No cluster selected</span>
          </div>
          <p className="text-sm text-red-700 mt-1 ml-7">
            Select a Solana cluster (mainnet/devnet/testnet/localnet)
          </p>
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
        story: 'Validation error states. Yellow warnings (wallet not connected), red errors (cluster not selected). **Effect**: Continue button disabled until requirements met. **Clear Guidance**: Specific messages explain needed actions.',
      },
    },
  },
};

export const WalletDisconnect: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Wallet disconnection scenario. If wallet disconnects mid-wizard, shows error banner: "Wallet disconnected. Please reconnect to continue." **Recovery**: User reconnects wallet, wizard resumes at current step with preserved state.',
      },
    },
  },
};

export const InsufficientBalance: Story = {
  args: {},
  render: () => (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h3 className="text-lg font-semibold">Cost Estimation</h3>
      
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center mb-2">
          <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="font-medium text-red-800">Insufficient Cycles Balance</span>
        </div>
        <p className="text-sm text-red-700 ml-7 mb-2">
          You have 2.5 TC but need 4.2 TC (including 120% buffer for 3 NFTs + canister).
        </p>
        <div className="ml-7 p-2 bg-white border border-red-300 rounded text-xs">
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">Canister creation:</span>
            <span className="font-medium">1.0 TC</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">Minting (3 NFTs):</span>
            <span className="font-medium">1.5 TC</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">2.5 TC</span>
          </div>
          <div className="flex justify-between border-t border-red-200 pt-1">
            <span className="text-gray-900 font-semibold">With 120% buffer:</span>
            <span className="font-bold text-red-700">4.2 TC</span>
          </div>
        </div>
        <p className="text-sm text-red-600 font-medium ml-7 mt-2">
          Please deposit 1.7 TC to continue.
        </p>
      </div>
      
      <div className="flex space-x-4">
        <button className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg">
          ← Back
        </button>
        <button disabled className="px-6 py-3 bg-gray-300 text-gray-500 font-semibold rounded-lg cursor-not-allowed flex-1">
          Continue to Bridge
        </button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Insufficient balance error at Step 4. Shows detailed breakdown: canister + minting + buffer. **Resolution**: User must deposit cycles. **Effect**: Continue disabled until balance sufficient.',
      },
    },
  },
};

export const ICAuthFailure: Story = {
  args: {},
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center mb-2">
          <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="font-medium text-red-800">IC Authentication Required</span>
        </div>
        <p className="text-sm text-red-700 ml-7 mb-3">
          Your Internet Identity session has expired. Please sign in again to continue creating the canister.
        </p>
        <button className="ml-7 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-sm">
          Sign In with Internet Identity
        </button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'IC authentication failure at Step 3 or 5. Red error banner explains session expired. **Resolution**: User re-authenticates with Internet Identity or NFID. **Behavior**: Wizard resumes after auth, state preserved.',
      },
    },
  },
};

export const MultipleNFTsImport: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Multiple NFTs selected for import (5 tokens). Step 4 shows scaled costs: canister (1 TC) + minting (0.5 TC × 5 = 2.5 TC) = 3.5 TC base. Approval requires 4.2 TC (120%). **Efficiency**: Single canister, batch mint.',
      },
    },
  },
};

export const Interactive: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Fully interactive wizard demo. Navigate through all 6 steps, interact with components. **Requirements**: Solana wallet for NFT viewing, IC auth for canister creation. **Try**: Connect → Browse NFTs → Create canister → Estimate → (mock) Bridge.',
      },
    },
  },
};

export const InlineMode: Story = {
  args: {
    mode: 'inline',
  },
  parameters: {
    docs: {
      description: {
        story: 'Inline display mode (default). Wizard embedded in page content. White background with shadow, rounded corners. **Use Case**: Dedicated bridge page, embedded in navigation flow.',
      },
    },
  },
};

export const ModalMode: Story = {
  args: {
    mode: 'modal',
  },
  parameters: {
    docs: {
      description: {
        story: 'Modal display mode. Full-screen overlay with dark backdrop, centered content, prominent close button. **Use Case**: Popup import flow from NFT marketplace, overlay on existing UI.',
      },
    },
  },
};

// Responsive variants
export const Mobile: Story = {
  args: {},
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Mobile-optimized wizard view. Steps stack vertically, progress indicator condensed, buttons full-width. NFT grid adapts to single column. Touch-friendly targets throughout.',
      },
    },
  },
};

export const Tablet: Story = {
  args: {},
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story: 'Tablet view with balanced layout. 2-column NFT grid, medium-width containers, comfortable spacing. Progress steps remain horizontal. Optimal for iPad-sized devices.',
      },
    },
  },
};

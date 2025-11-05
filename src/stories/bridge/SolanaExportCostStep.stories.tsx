import type { Meta, StoryObj } from '@storybook/react';
import { SolanaExportCostStep } from '../../components/bridge/SolanaExportCostStep';
import type { SolanaExportCostStepProps, SelectedICNFT, SolanaNetworkInfo } from '../../components/bridge/SolanaExportCostStep';
import type { ContractPointer } from '../../declarations/orchestrator/orchestrator.did';
import { Principal } from '@dfinity/principal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SolanaWalletProvider } from '../../provider/SolanaWalletProvider';
import { IdentityKitProvider } from '@nfid/identitykit/react';
import { IdentityKitAuthType } from '@nfid/identitykit';
import { AgentProvider } from '../../provider/AgentProvider';
import '@nfid/identitykit/react/styles.css';

// Suppress network errors in Storybook
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

// Provider wrapper for Solana components
const withSolanaProviders = (Story: any) => (
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

// Mock data
const mockICNFT: SelectedICNFT = {
  tokenId: '1',
  canisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  owner: Principal.fromText('2vxsx-fae'),
  image: 'https://picsum.photos/seed/icnft1/400/400',
  name: 'IC NFT #1',
  description: 'Test NFT on Internet Computer',
};

const mockMultipleICNFTs: SelectedICNFT[] = Array.from({ length: 5 }, (_, i) => ({
  tokenId: String(i + 1),
  canisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  owner: Principal.fromText('2vxsx-fae'),
  image: `https://picsum.photos/seed/icnft${i + 1}/400/400`,
  name: `IC NFT #${i + 1}`,
  description: `Test NFT ${i + 1} on Internet Computer`,
}));

const mockDevnetNetwork: SolanaNetworkInfo = {
  name: 'devnet',
  endpoint: 'https://api.devnet.solana.com',
  deployed: false,
};

const mockDevnetNetworkWithCollection: SolanaNetworkInfo = {
  name: 'devnet',
  endpoint: 'https://api.devnet.solana.com',
  deployed: true,
  collectionAddress: 'CoLLecTioN...xyz',
};

const mockLocalnetNetwork: SolanaNetworkInfo = {
  name: 'localnet',
  endpoint: 'http://127.0.0.1:8899',
  deployed: false,
};

const mockMainnetNetwork: SolanaNetworkInfo = {
  name: 'mainnet-beta',
  endpoint: 'https://api.mainnet-beta.solana.com',
  deployed: true,
  collectionAddress: 'MainnetCoLLecTioN...abc',
};

const mockSourceContract: ContractPointer = {
  contract: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  network: { IC: [] as [] },
};

const meta = {
  title: 'Bridge/SolanaExportCostStep',
  component: SolanaExportCostStep,
  decorators: [withSolanaProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## SolanaExportCostStep Component

Cost calculation and payment approval interface for exporting NFTs from Internet Computer to Solana. Handles cycles payment, SOL funding, priority fee selection, and optional collection deployment.

### Architecture Overview

Export Flow:
1. Calculate Costs → Query orchestrator + ckNFT canister for accurate costs
2. Approve Cycles → TWO separate approvals (orchestrator + ckNFT canister)
3. Fund SOL → Transfer SOL to funding address for rent + tx fees
4. Deploy Collection → (If new) Create Metaplex collection on Solana
5. Ready to Export → Proceed to execution step

### Key Features

#### 1. Dual Cost Types
- **Cycles Costs** (paid on IC):
  - Collection deployment: Creates Metaplex collection on Solana
  - NFT casting: Mints NFTs to Solana with metadata
  - Paid from user's cycles balance with 120% buffer
  
- **SOL Costs** (paid on Solana):
  - Rent-exempt minimums for on-chain accounts
  - Transaction fees (5000 lamports per signature)
  - Priority fees (optional, for faster confirmation)
  - Paid from canister's Solana funding address

#### 2. Dual Approval System
Export requires TWO separate cycle approvals:

\`\`\`typescript
// Approval 1: Orchestrator (for collection deployment)
if (needsDeployment) {
  approve(orchestrator, deploymentCost * 1.2);
}

// Approval 2: ckNFT Canister (for NFT casting)
approve(ckNFTCanister, castingCost * 1.2);
\`\`\`

Both approvals expire after 24 hours and include 20% buffer.

#### 3. Funding Address Types

**Fresh Export** (NFT never minted to Solana):
- Uses canister's main ICRC99 address
- This address pays for collection + NFT minting
- Check with: \`icrc99_get_address(canister, network)\`

**Re-export** (NFT burned back to IC):
- Uses approval address holding the NFT
- NFT already exists on Solana, just needs transfer
- Check with: \`icrc99_cast_fund_address(canister, tokenId)\`
- Cheaper: no minting, only transfer tx

#### 4. Priority Fee System

Solana priority fees speed up confirmation during congestion:

\`\`\`
Priority Fee = (computeUnitLimit × computeUnitPrice) / 1,000,000 lamports

Presets:
- None: 0 SOL (may be slow during congestion)
- Low: ~0.0002 SOL (minimal priority)
- Medium: ~0.003 SOL (standard priority)  
- High: ~0.015 SOL (fast priority)
\`\`\`

Priority fees are added to base rent costs when funding the address.

#### 5. Cost Calculation

**Accurate Cost Queries**:
\\\`\\\`\\\`typescript
// Collection deployment cost
const deploymentCost = await orchestrator.getRemoteCost({
  pointer: sourceContract,
  network: { Solana: [cluster] }
});

// NFT casting cost (per NFT)
const castCost = await ckNFTCanister.icrc99_cast_cost({
  network: { Solana: [cluster] },
  contract: collectionAddress,
  tokenId: 0n // sample, cost doesn't vary
});
\\\`\\\`\\\`

**SOL Rent Calculation**:
- Mint account: 82 bytes → ~0.0014 SOL
- Token account (ATA): 165 bytes → ~0.002 SOL  
- Metadata PDA: 800 bytes → ~0.006 SOL
- Master Edition: 282 bytes → ~0.002 SOL
- **Per NFT Total: ~0.011 SOL**
- Plus transaction fees (~6 signatures × 5000 lamports)
- Plus 50% safety margin for variations

### Props Interface

\`\`\`typescript
interface SolanaExportCostStepProps {
  selectedNFTs: SelectedICNFT[];              // NFTs to export
  targetNetwork: SolanaNetworkInfo | null;    // Solana network
  sourceContractPointer: ContractPointer | null;
  onCostsCalculated: (costs: bigint) => void;
  onDeploymentComplete?: (address: string) => void;
  onReadyStateChange?: (isReady: boolean) => void;
}

interface SolanaNetworkInfo {
  name: string;                               // mainnet-beta/devnet/testnet/localnet
  endpoint: string;                           // RPC URL
  deployed: boolean;                          // Collection exists?
  collectionAddress?: string;                 // If deployed
}

interface SelectedICNFT {
  tokenId: string;
  canisterId: string;                         // ckNFT canister principal
  owner: Principal;
  image?: string;
  name?: string;
  description?: string;
}
\`\`\`

### User Journey

**Step 1: View Cost Breakdown**
- Collection deployment cost (if new)
- NFT minting costs (per NFT)
- Solana rent + priority fees (in SOL)
- Total cycles required

**Step 2: Select Priority Fee**
- Choose from None/Low/Medium/High presets
- See impact on total SOL required
- Trade-off: cost vs confirmation speed

**Step 3: Approve Cycles Payment**
- Check cycles balance (must be sufficient)
- Click "Approve Payment" → TWO approvals
- Wait for confirmation
- Approval valid for 24 hours

**Step 4: Fund SOL Address**
- View canister's Solana funding address
- Check current SOL balance
- Transfer required SOL (rent + priority fee)
- Options: Direct transfer (if wallet connected), Manual copy/paste, CLI airdrop (localnet)

**Step 5: Deploy Collection** (if needed)
- Click "Deploy Collection" 
- Wait for deployment (30-60 seconds)
- Get collection address from orchestrator
- Enables NFT minting in next step

**Step 6: Ready to Export**
- Green banner shows all requirements met
- Proceed to execution step
- Export operation begins

### Network-Specific Behaviors

**Localnet** (http://127.0.0.1:8899):
- Shows CLI airdrop command
- \`solana airdrop 10 <address> --url http://127.0.0.1:8899\`
- Fast confirmation (200ms slots)
- Free SOL from local validator

**Devnet/Testnet**:
- Shows faucet links (https://faucet.solana.com)
- Free test SOL available
- Confirmation: 1-5 seconds
- Perfect for testing

**Mainnet Beta**:
- Real SOL required (purchase from exchange)
- Shows warning about real value
- Confirmation: 10-20 seconds
- Production use only

### Error States

**Insufficient Cycles Balance**:
- Red warning banner
- Shows deficit amount
- Links to cycles deposit flow
- Blocks approval button

**Insufficient SOL Balance**:
- Red warning at funding section
- Shows exact deficit
- Must fund before proceeding
- Blocks ready state

**Expired Allowance**:
- Orange status indicator
- Shows "Expired" tag
- Re-approval required
- 24-hour expiry window

**Deployment Timeout**:
- 5-minute polling limit
- Shows error after timeout
- Check orchestrator logs
- Retry deployment

### Cost Estimation Examples

**Single NFT to Devnet (New Collection)**:
- Collection deployment: ~50 TC
- NFT minting: ~20 TC  
- Total cycles: ~70 TC
- SOL rent: ~0.055 SOL
- Priority (Medium): +0.003 SOL
- **Total: 70 TC + 0.058 SOL**

**5 NFTs to Devnet (Existing Collection)**:
- Collection deployment: 0 TC (exists)
- NFT minting: 20 TC × 5 = 100 TC
- Total cycles: 100 TC
- SOL rent: ~0.065 SOL (5 NFTs)
- Priority (None): +0 SOL
- **Total: 100 TC + 0.065 SOL**

**Re-export Single NFT**:
- No minting (already on Solana)
- Only transfer transaction
- Very cheap: ~2 TC
- SOL: ~0.0001 SOL (1 tx)
- **Total: 2 TC + 0.0001 SOL**

### Technical Implementation

**Cost Calculation Flow**:
1. Check if collection deployed (\`targetNetwork.deployed\`)
2. If not, query \`orchestrator.getRemoteCost()\` for deployment
3. Get ckNFT canister: \`orchestrator.getCkNFTCanister(sourceContract)\`
4. Query cast cost: \`ckNFT.icrc99_cast_cost(remotePointer)\`
5. Multiply by NFT count
6. Get funding address: \`orchestrator.getICRC99Address()\` or \`getCastFundAddress()\`
7. Check SOL balance via RPC: \`connection.getBalance()\`
8. Calculate rent from RPC: \`connection.getMinimumBalanceForRentExemption()\`
9. Add priority fee from selected preset
10. Display breakdown to user

**Approval Flow**:
1. User clicks "Approve Payment"
2. Check cycles balance >= (total × 1.2)
3. If deployment needed: \`cyclesApprove(orchestrator, deploymentCost × 1.2)\`
4. Always: \`cyclesApprove(ckNFTCanister, castingCost × 1.2)\`
5. Set expiry: now + 24 hours (in nanoseconds)
6. Refetch allowance query to update UI
7. Show green confirmation banner

**Funding Flow**:
1. User selects priority fee preset
2. See total SOL required (rent + priority)
3. If Solana wallet connected:
   - Click "Transfer X SOL from Wallet"
   - Create SystemProgram.transfer() tx
   - Sign with wallet (Phantom/Backpack/Solflare)
   - Wait for confirmation
   - Refresh balance display
4. If no wallet:
   - Click "Copy Address"
   - Use external wallet/exchange
   - Manually transfer SOL
   - Wait for balance update

**Deployment Flow** (if collection not deployed):
1. User clicks "Deploy Collection"
2. Call \`orchestrator.createRemoteContract(pointer, network, gasPrice, gasLimit)\`
3. Returns \`remoteId\` for status tracking
4. Poll every 5 seconds: \`orchestrator.getRemoteStatus(remoteId)\`
5. Wait for \`confirmed: true\` and \`address: string\`
6. Display collection address
7. Notify parent via \`onDeploymentComplete(address)\`
8. Enable "Start Export" button

### Performance Considerations

- **Parallel Queries**: Balance, allowance, and cost queries run in parallel
- **Polling Interval**: 5 seconds for deployment status (prevents spam)
- **Timeout**: 5 minutes max for deployment (60 attempts × 5 sec)
- **Buffer**: 120% allowance ensures approval doesn't run out
- **Safety Margin**: 50% SOL buffer covers account size variations

### Accessibility

- Clear cost breakdown with icons
- Color-coded status indicators (green/red/orange)
- Disabled states with helpful tooltips
- Progress indicators during async operations
- Copy buttons for addresses
- Network-specific help text
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    selectedNFTs: {
      description: 'Array of IC NFTs selected for export to Solana',
      table: {
        type: { summary: 'SelectedICNFT[]' },
      },
    },
    targetNetwork: {
      description: 'Target Solana network configuration with deployment status',
      table: {
        type: { summary: 'SolanaNetworkInfo | null' },
      },
    },
    sourceContractPointer: {
      description: 'Source IC contract pointer (ckNFT canister reference)',
      table: {
        type: { summary: 'ContractPointer | null' },
      },
    },
    onCostsCalculated: {
      action: 'costs-calculated',
      description: 'Callback fired when costs are calculated. Receives total cycles.',
      table: {
        type: { summary: '(costs: bigint) => void' },
      },
    },
    onDeploymentComplete: {
      action: 'deployment-complete',
      description: 'Callback fired when collection deployment finishes. Receives collection address.',
      table: {
        type: { summary: '(address: string) => void | undefined' },
      },
    },
    onReadyStateChange: {
      action: 'ready-state-changed',
      description: 'Callback fired when ready state changes (cycles approved AND SOL funded).',
      table: {
        type: { summary: '(isReady: boolean) => void | undefined' },
      },
    },
  },
} satisfies Meta<typeof SolanaExportCostStep>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Docs: Story = {
  name: '📖 Documentation',
  args: {
    selectedNFTs: mockMultipleICNFTs,
    targetNetwork: mockDevnetNetworkWithCollection,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: (costs) => {
      console.log('Costs calculated:', costs.toString(), 'cycles');
    },
  },
  decorators: [],
  parameters: {
    docs: {
      page: () => (
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">SolanaExportCostStep Component</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              The <code>SolanaExportCostStep</code> component calculates costs and manages payment approvals 
              for exporting NFTs from Internet Computer to Solana networks with dual-currency cost structure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">🎯 Primary Purpose</h2>
              <ul className="space-y-2 text-blue-800">
                <li>• Calculate IC cycles costs</li>
                <li>• Calculate SOL rent + fee costs</li>
                <li>• Handle dual approval system</li>
                <li>• Manage SOL funding addresses</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-3">✨ Key Features</h2>
              <ul className="space-y-2 text-green-800">
                <li>• Priority fee selection</li>
                <li>• Collection deployment logic</li>
                <li>• Re-export optimization</li>
                <li>• 120% cost buffer</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">💰 Dual-Currency Costs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-blue-300">
                <div className="text-center mb-2">
                  <div className="text-2xl mb-1">⚡</div>
                  <div className="font-medium text-gray-900">Cycles (IC)</div>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• Collection deployment</p>
                  <p>• NFT casting operations</p>
                  <p>• 20% buffer included</p>
                  <p>• Paid from cycles ledger</p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-orange-300">
                <div className="text-center mb-2">
                  <div className="text-2xl mb-1">◎</div>
                  <div className="font-medium text-gray-900">SOL (Solana)</div>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• Rent-exempt minimums</p>
                  <p>• Transaction fees (5000 lamports)</p>
                  <p>• Priority fees (optional)</p>
                  <p>• Paid from funding address</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">🔄 Dual Approval System</h2>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="font-medium text-gray-900 mb-2">1️⃣ Orchestrator Approval</div>
                <div className="text-sm text-gray-700">
                  For collection deployment on Solana (if needed)
                  <div className="mt-2 text-xs bg-gray-100 p-2 rounded font-mono">
                    approve(orchestrator, deploymentCost × 1.2)
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="font-medium text-gray-900 mb-2">2️⃣ ckNFT Canister Approval</div>
                <div className="text-sm text-gray-700">
                  For NFT casting to Solana (always required)
                  <div className="mt-2 text-xs bg-gray-100 p-2 rounded font-mono">
                    approve(ckNFTCanister, castingCost × 1.2)
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-purple-800 mt-3">
              <strong>Note:</strong> Both approvals expire after 24 hours and include 20% buffer
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-amber-900 mb-4">🏦 Funding Address Types</h2>
            <div className="space-y-3 text-amber-800">
              <div className="bg-white rounded-lg p-3 border border-amber-300">
                <p><strong>Fresh Export:</strong> Uses canister's main ICRC99 address</p>
                <p className="text-sm mt-1">Query: <code>icrc99_get_address(canister, network)</code></p>
                <p className="text-xs mt-1">Pays for collection + NFT minting</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-amber-300">
                <p><strong>Re-export:</strong> Uses approval address holding the NFT</p>
                <p className="text-sm mt-1">Query: <code>icrc99_cast_fund_address(canister, tokenId)</code></p>
                <p className="text-xs mt-1">Cheaper: NFT exists, only needs transfer</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-900 mb-4">⚡ Priority Fee System</h2>
            <div className="space-y-2 text-yellow-800">
              <p className="text-sm">Priority fees speed up Solana transaction confirmation:</p>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-white rounded p-2 text-sm">
                  <strong>None:</strong> 0 SOL (may be slow)
                </div>
                <div className="bg-white rounded p-2 text-sm">
                  <strong>Low:</strong> ~0.0002 SOL (minimal)
                </div>
                <div className="bg-white rounded p-2 text-sm">
                  <strong>Medium:</strong> ~0.003 SOL (standard)
                </div>
                <div className="bg-white rounded p-2 text-sm">
                  <strong>High:</strong> ~0.015 SOL (fast)
                </div>
              </div>
              <p className="text-xs mt-3">
                Formula: (computeUnitLimit × computeUnitPrice) / 1,000,000 lamports
              </p>
            </div>
          </div>
        </div>
      )
    }
  }
};

export const Default: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockDevnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: (costs) => {
      console.log('Costs calculated:', costs.toString(), 'cycles');
    },
    onDeploymentComplete: (address) => {
      console.log('Collection deployed at:', address);
    },
    onReadyStateChange: (isReady) => {
      console.log('Ready state:', isReady);
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Default state showing cost breakdown for single NFT export to devnet with new collection deployment. Displays cycles costs, SOL rent estimation, priority fee selector, and funding address. **Note**: Requires IC authentication to see full functionality.',
      },
    },
  },
};

export const NewCollectionDeployment: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockDevnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
    onDeploymentComplete: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Export requiring new collection deployment. Shows deployment cost in breakdown (~50 TC). After cycles approval and SOL funding, "Deploy Collection" button becomes enabled. **Use Case**: First export to a new Solana network.',
      },
    },
  },
};

export const ExistingCollectionExport: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockDevnetNetworkWithCollection,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Export to existing collection. No deployment cost shown, only NFT minting costs (~20 TC per NFT). Simpler flow - skip deployment step. **Use Case**: Subsequent exports after collection exists.',
      },
    },
  },
};

export const MultipleNFTsExport: Story = {
  args: {
    selectedNFTs: mockMultipleICNFTs,
    targetNetwork: mockDevnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: '5 NFTs selected for export. Cost breakdown shows: deployment (~50 TC) + minting (20 TC × 5 = 100 TC) = 150 TC total. SOL rent scales with NFT count. **Use Case**: Batch export for gas efficiency.',
      },
    },
  },
};

export const LocalnetExport: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockLocalnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Export to localnet (localhost:8899). Shows blue CLI helper: `solana airdrop 10 <address> --url http://127.0.0.1:8899`. Perfect for local development with solana-test-validator. **Use Case**: Rapid local testing.',
      },
    },
  },
};

export const MainnetExport: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockMainnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Export to mainnet beta. Shows warning about real SOL required. Higher confirmation times (10-20 sec). Production use only. **Warning**: Real value at risk.',
      },
    },
  },
};

export const LoadingCosts: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockDevnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Calculating Solana Export Costs</h3>
        <p className="text-gray-600">
          Estimating costs for 1 NFT and collection deployment...
        </p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Loading state while querying orchestrator and ckNFT canister for accurate costs. Shows spinner with progress message. **Duration**: Typically 2-5 seconds for RPC queries.',
      },
    },
  },
};

export const CostCalculationError: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockDevnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center py-12">
        <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Calculating Costs</h3>
        <p className="text-gray-600 mb-4">Failed to query orchestrator for remote deployment cost</p>
        <button className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700">
          Retry
        </button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Error state when cost calculation fails. Common causes: orchestrator unreachable, network misconfiguration, invalid contract pointer. Shows retry button. **Troubleshooting**: Check network, verify canister IDs.',
      },
    },
  },
};

export const PriorityFeeSelection: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockDevnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows 4 priority fee presets: None (0 SOL), Low (~0.0002 SOL), Medium (~0.003 SOL), High (~0.015 SOL). Selected preset highlighted in cyan. Affects total SOL required. **Trade-off**: Cost vs confirmation speed during congestion.',
      },
    },
  },
};

export const InsufficientCyclesBalance: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockDevnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <h5 className="font-medium text-gray-900">Your Cycles Balance</h5>
          </div>
          <span className="font-medium text-red-600">25.000 TC</span>
        </div>
        <div className="text-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-600">Required (with 120% buffer):</span>
            <span className="text-gray-900">84.000 TC</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Remaining after export:</span>
            <span className="font-medium text-red-600">Insufficient Balance</span>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="font-medium text-red-800">Insufficient cycles balance</span>
        </div>
        <p className="text-sm text-red-700 mt-1">
          You have 25 TC but need 84 TC (including 120% buffer). Please deposit 59 TC.
        </p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Red warning when cycles balance is insufficient. Shows deficit amount clearly. Approval button disabled. **Resolution**: Deposit cycles to user account before proceeding.',
      },
    },
  },
};

export const SufficientCyclesBalance: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockDevnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <h5 className="font-medium text-gray-900">Your Cycles Balance</h5>
          </div>
          <span className="font-medium text-green-600">500.000 TC</span>
        </div>
        <div className="text-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-600">Required (with 120% buffer):</span>
            <span className="text-gray-900">84.000 TC</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Remaining after export:</span>
            <span className="font-medium text-green-600">416.000 TC</span>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Green balance indicator showing sufficient cycles. Remaining balance calculated after export with buffer. Approval button enabled. **Good UX**: Shows user will have plenty left.',
      },
    },
  },
};

export const PaymentApproved: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockDevnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-medium text-green-800">Cycles Approved</span>
        </div>
        <p className="text-sm text-green-700 mt-1">
          <span className="block">✓ Orchestrator approved for collection deployment (60.000 TC)</span>
          <span className="block">✓ ckNFT canister approved for NFT casting (24.000 TC)</span>
        </p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Green confirmation showing both approvals complete. Lists orchestrator (deployment) and ckNFT canister (casting) with amounts. Valid for 24 hours. **Next**: Fund SOL address.',
      },
    },
  },
};

export const ApprovingInProgress: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockDevnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h5 className="font-medium text-gray-900">Approve Cycles Payment</h5>
            <p className="text-sm text-gray-600">Processing approvals...</p>
          </div>
          <button disabled className="px-6 py-2 rounded-md font-medium bg-gray-100 text-gray-400 cursor-not-allowed flex items-center">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
            Approving...
          </button>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Loading state during approval transaction. Button shows spinner and "Approving..." text. TWO sequential calls: orchestrator then ckNFT canister. **Duration**: 3-10 seconds total.',
      },
    },
  },
};

export const FundingAddressDisplay: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockDevnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
        <h4 className="font-medium text-cyan-800 mb-3">
          Canister's Solana Address (Transaction Payer)
        </h4>
        <p className="text-xs text-gray-600 mb-3">
          This is the canister's ICRC99 signing address that will pay for Solana transactions. Fund this address with SOL to enable collection deployment and NFT minting.
        </p>
        <div className="bg-white border border-cyan-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-900">Address Balance</span>
            <span className="text-sm font-medium text-red-600">0.0000 SOL</span>
          </div>
          <p className="text-xs text-gray-600 font-mono break-all mb-2">
            7WkR61EaDmjMyHp5yYjXG6Bunn66i43g7MkCVao6F4z
          </p>
          
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Required for rent:</span>
              <span>0.055000 SOL</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Priority fee:</span>
              <span>0.003000 SOL</span>
            </div>
            <div className="flex justify-between text-xs font-medium text-gray-900 mb-2">
              <span>Total required:</span>
              <span>0.058000 SOL</span>
            </div>
            
            <div className="p-2 bg-red-50 border border-red-200 rounded">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-700 font-medium">Insufficient SOL balance</span>
              </div>
              <p className="text-xs text-red-600 mt-1">Need 0.058000 more SOL</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Cyan box showing funding address with balance check. Breaks down rent + priority fee. Red warning for insufficient balance. Shows exact deficit. **Critical**: Must fund before export.',
      },
    },
  },
};

export const FundingWithWalletConnected: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockDevnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
        <h4 className="font-medium text-cyan-800 mb-3">Fund Address with SOL</h4>
        <div className="bg-white border border-cyan-200 rounded-lg p-3">
          <p className="text-xs text-gray-600 font-mono break-all mb-3">
            7WkR61EaDmjMyHp5yYjXG6Bunn66i43g7MkCVao6F4z
          </p>
          
          <button className="w-full px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 text-sm font-medium mb-2">
            Transfer 0.0580 SOL from Wallet
          </button>
          <p className="text-xs text-gray-500 text-center">
            Connected: 9xQe...7jXm
          </p>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Solana wallet connected state. Shows direct transfer button with exact amount. Displays shortened connected address. **One-click**: Transfer with wallet signature. **Note**: Requires Phantom/Backpack/Solflare.',
      },
    },
  },
};

export const FundingWithoutWallet: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockDevnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
        <h4 className="font-medium text-cyan-800 mb-3">Fund Address with SOL</h4>
        <div className="bg-white border border-cyan-200 rounded-lg p-3">
          <p className="text-xs text-gray-600 font-mono break-all mb-3">
            7WkR61EaDmjMyHp5yYjXG6Bunn66i43g7MkCVao6F4z
          </p>
          
          <button className="w-full px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 text-sm font-medium mb-2">
            Copy Address to Fund
          </button>
          <p className="text-xs text-yellow-600 text-center">
            ⚠️ Connect Solana wallet to transfer directly
          </p>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'No wallet connected state. Shows copy button instead of transfer. Yellow warning prompts wallet connection. **Manual**: Copy address, use external wallet/exchange to fund.',
      },
    },
  },
};

export const LocalnetFundingWithAirdrop: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockLocalnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
        <h4 className="font-medium text-cyan-800 mb-3">Fund Localnet Address</h4>
        <div className="bg-white border border-cyan-200 rounded-lg p-3 space-y-3">
          <p className="text-xs text-gray-600 font-mono break-all">
            7WkR61EaDmjMyHp5yYjXG6Bunn66i43g7MkCVao6F4z
          </p>
          
          <button className="w-full px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 text-sm font-medium">
            Copy Address to Fund
          </button>
          
          <div className="p-2 bg-blue-50 border border-blue-200 rounded">
            <p className="text-xs text-blue-700 font-medium mb-1">Or use CLI:</p>
            <code className="text-xs text-blue-800 font-mono break-all block">
              solana airdrop 10 7WkR61EaDmjMyHp5yYjXG6Bunn66i43g7MkCVao6F4z --url http://127.0.0.1:8899
            </code>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Localnet-specific funding UI. Blue helper box shows CLI airdrop command with full address and URL. **Developer-friendly**: Copy-paste command for instant funding. **Use Case**: Local development.',
      },
    },
  },
};

export const DevnetFundingWithFaucet: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockDevnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
        <h4 className="font-medium text-cyan-800 mb-3">Fund Devnet Address</h4>
        <div className="bg-white border border-cyan-200 rounded-lg p-3 space-y-3">
          <p className="text-xs text-gray-600 font-mono break-all">
            7WkR61EaDmjMyHp5yYjXG6Bunn66i43g7MkCVao6F4z
          </p>
          
          <button className="w-full px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 text-sm font-medium">
            Copy Address to Fund
          </button>
          
          <div className="p-2 bg-blue-50 border border-blue-200 rounded">
            <p className="text-xs text-blue-700 font-medium mb-1">Testnet Funding:</p>
            <p className="text-xs text-blue-800">
              Visit{' '}
              <a href="https://faucet.solana.com" target="_blank" className="underline hover:text-blue-900">
                Solana Faucet
              </a>
              {' '}and paste the address above
            </p>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Devnet/testnet funding UI with faucet link. Blue helper directs to https://faucet.solana.com. **Free SOL**: Get test tokens for development. **Limit**: Usually 1-5 SOL per request.',
      },
    },
  },
};

export const SufficientSOLFunded: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockDevnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
        <h4 className="font-medium text-cyan-800 mb-3">Address Funded</h4>
        <div className="bg-white border border-cyan-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-900">Address Balance</span>
            <span className="text-sm font-medium text-green-600">0.0850 SOL</span>
          </div>
          <p className="text-xs text-gray-600 font-mono break-all mb-2">
            7WkR61EaDmjMyHp5yYjXG6Bunn66i43g7MkCVao6F4z
          </p>
          
          <div className="p-2 bg-green-50 border border-green-200 rounded">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-green-700 font-medium">Sufficient SOL balance</span>
            </div>
            <p className="text-xs text-green-600 mt-1">Ready for rent + priority fee payment</p>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Green confirmation showing sufficient SOL balance. Balance exceeds required amount (0.058 SOL). Ready indicator displayed. **Next**: Deploy collection (if needed) or proceed to export.',
      },
    },
  },
};

export const CollectionDeploymentReady: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockDevnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
    onDeploymentComplete: () => {},
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Collection Deployment</h4>
        
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h5 className="font-medium text-gray-900">Deploy Collection to Solana</h5>
              <p className="text-sm text-gray-600">Create the NFT collection on devnet before minting NFTs</p>
            </div>
            <button className="px-6 py-2 rounded-md font-medium bg-purple-600 text-white hover:bg-purple-700">
              Deploy Collection
            </button>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Ready to deploy collection. Purple "Deploy Collection" button enabled after cycles approved and SOL funded. **Action**: Creates Metaplex collection on Solana with metadata. **Duration**: 30-60 seconds.',
      },
    },
  },
};

export const CollectionDeploying: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockDevnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h5 className="font-medium text-gray-900">Deploying Collection...</h5>
            <p className="text-sm text-gray-600">Creating Metaplex collection on devnet</p>
          </div>
          <button disabled className="px-6 py-2 rounded-md font-medium bg-gray-100 text-gray-400 cursor-not-allowed flex items-center">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
            Deploying...
          </button>
        </div>
        <div className="text-xs text-gray-500">
          Polling for deployment status... (this may take 30-60 seconds)
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Deployment in progress. Button shows spinner. Polls orchestrator every 5 seconds for status. **Wait time**: Typically 30-60 seconds for Solana confirmation. **Timeout**: 5 minutes max.',
      },
    },
  },
};

export const CollectionDeployed: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockDevnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center mb-2">
          <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-medium text-green-800">Collection Deployed</span>
        </div>
        <p className="text-sm text-green-700 mb-2">Collection successfully deployed to Solana</p>
        <div className="bg-white border border-green-200 rounded p-2">
          <p className="text-xs text-gray-600 mb-1">Collection Address:</p>
          <code className="text-xs font-mono text-green-800 break-all">CoLLecTioNAddr3ssABC123xyz789</code>
        </div>
        <div className="bg-white border border-green-200 rounded p-2 mt-2">
          <p className="text-xs text-gray-600 mb-1">Transaction Hash:</p>
          <code className="text-xs font-mono text-green-800 break-all">5X7gH2...kL9pQ</code>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Green success state after deployment. Shows collection address and transaction hash. Both are Solana addresses (base58). **Result**: Collection now exists on-chain, ready for NFT minting.',
      },
    },
  },
};

export const ReadyToExport: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockDevnetNetworkWithCollection,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
    onReadyStateChange: () => {},
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-cyan-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-medium text-cyan-800">Ready to Export</span>
        </div>
        <p className="text-sm text-cyan-700 mt-1">
          All requirements met. Click "Start Export" to begin the Solana bridging process.
        </p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Final ready state. Cyan banner confirms all requirements met: cycles approved, SOL funded, collection ready. **Triggers**: onReadyStateChange(true) callback. **Next**: Execution step begins export.',
      },
    },
  },
};

export const Interactive: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockDevnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
    onDeploymentComplete: () => {},
    onReadyStateChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Fully interactive demo. Select priority fees, approve payment, fund address, deploy collection. All actions logged to console. **Instructions**: 1) Select priority fee, 2) Approve (if authenticated), 3) Check funding section.',
      },
    },
  },
};

// Responsive variants
export const Mobile: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockDevnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Mobile-optimized view. Priority fee grid stacks vertically. Cost breakdown remains readable. All buttons full-width for touch targets.',
      },
    },
  },
};

export const Tablet: Story = {
  args: {
    selectedNFTs: [mockICNFT],
    targetNetwork: mockDevnetNetwork,
    sourceContractPointer: mockSourceContract,
    onCostsCalculated: () => {},
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story: 'Tablet view with 2-column priority fee grid. Balanced layout for medium screens.',
      },
    },
  },
};

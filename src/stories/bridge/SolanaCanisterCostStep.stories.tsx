import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SolanaCanisterCostStep } from '../../components/bridge/SolanaCanisterCostStep';
import type { SelectedSolanaCollection } from '../../components/bridge/SolanaCollectionSelectionStep';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SolanaWalletProvider } from '../../provider/SolanaWalletProvider';
import { IdentityKitProvider } from '@nfid/identitykit/react';
import { IdentityKitAuthType } from '@nfid/identitykit';
import { AgentProvider } from '../../provider/AgentProvider';
import { fn } from '@storybook/test';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity },
  },
});

const withProviders = (Story: any) => (
  <SolanaWalletProvider>
    <IdentityKitProvider authType={IdentityKitAuthType.ACCOUNTS}>
      <AgentProvider network="local">
        <QueryClientProvider client={queryClient}>
          <div className="min-h-screen bg-gray-50 p-8">
            <Story />
          </div>
        </QueryClientProvider>
      </AgentProvider>
    </IdentityKitProvider>
  </SolanaWalletProvider>
);

const meta = {
  title: 'Bridge/SolanaCanisterCostStep',
  component: SolanaCanisterCostStep,
  decorators: [withProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## SolanaCanisterCostStep Component

Cost approval and canister creation step for the Solana import wizard.

### Architecture
- **Cycles Payment**: Uses ICRC-2 approve/transfer-from pattern for paying canister creation costs
- **1:1 Canister Mapping**: Creates one ckNFT canister per Solana collection
- **Cost Calculation**: Real-time cost fetching from orchestrator based on contract pointer
- **Existing Canister Detection**: Checks if canister already exists before creation

### Key Features

#### Cost Display
- Real-time canister creation cost from orchestrator (\`icrc99_get_creation_cost\`)
- User's cycles balance from cycles ledger
- Sufficient balance validation
- ICP equivalent estimation (1 ICP ≈ 1T cycles)

#### Approval Workflow
- **Auto-approval**: Automatically approves cycles during creation if no sufficient allowance exists
- **Manual Pre-approval**: Users can manually approve cycles before creation (110% of required)
- **Allowance Check**: Validates existing allowances to avoid unnecessary approvals
- **Expiration Handling**: Detects expired allowances and requires re-approval

#### Canister Creation
- Creates canister with collection metadata (name, symbol, description)
- Handles network-specific configuration (mainnet, devnet, testnet, localnet)
- Success/error handling with detailed messages
- Notifies parent via \`onCanisterCreated\` callback

#### Existing Canister Handling
- Detects if canister already exists for collection
- Displays canister ID and collection metadata (name, symbol, supply, royalties)
- Shows "no additional costs" message
- Warns if metadata not yet initialized

#### Display Modes
- **Compact Mode**: Simplified display for wizard integration
- **Full Mode**: Detailed cost breakdown, approval status, instructions

#### Error Handling
- Network errors (RPC, orchestrator communication)
- Insufficient balance warnings with top-up instructions
- Approval failures
- Authentication requirements

### State Management

#### Loading States
- Cost calculation
- Balance fetching
- Existing canister check
- Allowance validation
- Approval transaction
- Canister creation

#### Error States
- Cost fetching errors
- Balance query errors
- Existing canister errors
- Approval errors
- Creation errors

### Network Support
- Solana Mainnet Beta
- Solana Devnet
- Solana Testnet
- Local Validator (localnet)

### Authentication
- Requires IC authentication (NFID/Internet Identity)
- Shows authentication warnings when not connected
- Displays costs even when unauthenticated
        `,
      },
    },
  },
  argTypes: {
    selectedCollection: {
      description: 'The Solana collection to create canister for',
      control: { type: 'object' }
    },
    costs: {
      description: 'Current calculated costs in cycles (null = not yet calculated)',
      control: { type: 'text' }
    },
    onCostsCalculated: {
      description: 'Callback when costs are calculated',
      action: 'costs calculated'
    },
    onCanisterCreated: {
      description: 'Callback when canister is created or found',
      action: 'canister created'
    },
    compact: {
      description: 'Use compact display mode',
      control: { type: 'boolean' }
    }
  },
  args: {
    onCostsCalculated: fn(),
    onCanisterCreated: fn()
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SolanaCanisterCostStep>;

export default meta;
type Story = StoryObj<typeof meta>;

// ===== DOCUMENTATION =====

export const Docs: Story = {
  name: '📖 Documentation',
  args: {
    selectedCollection: null,
    onCanisterCreated: fn(),
  },
  decorators: [],
  parameters: {
    docs: {
      page: () => (
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">SolanaCanisterCostStep Component</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              The <code>SolanaCanisterCostStep</code> component handles cycles payment approval and canister 
              creation for the Solana import wizard, establishing the 1:1 collection-to-canister mapping.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">🎯 Primary Purpose</h2>
              <ul className="space-y-2 text-blue-800">
                <li>• Calculate canister creation cost</li>
                <li>• Approve cycles payment (ICRC-2)</li>
                <li>• Create ckNFT canister</li>
                <li>• Detect existing canisters</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-3">✨ Key Features</h2>
              <ul className="space-y-2 text-green-800">
                <li>• Real-time cost fetching</li>
                <li>• Auto-approval workflow</li>
                <li>• Allowance expiration check</li>
                <li>• Balance validation</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">💰 Cost Structure</h2>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900">Canister Creation</div>
                  <div className="text-lg font-bold text-blue-600">~13T cycles</div>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• Fetched from orchestrator: <code>icrc99_get_creation_cost()</code></p>
                  <p>• Includes canister initialization and setup</p>
                  <p>• ICP equivalent: ~$17 (at 1 ICP ≈ 1T cycles, $1.30/ICP)</p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="text-sm text-blue-800">
                  <strong>110% Approval:</strong> System approves 10% extra cycles buffer to account for cost fluctuations
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">🔄 Approval Workflow</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">1️⃣</div>
                <div className="font-medium text-sm text-gray-900">Fetch Cost</div>
                <div className="text-xs text-gray-600 mt-1">From orchestrator</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">2️⃣</div>
                <div className="font-medium text-sm text-gray-900">Check Balance</div>
                <div className="text-xs text-gray-600 mt-1">Cycles ledger</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">3️⃣</div>
                <div className="font-medium text-sm text-gray-900">Approve Cycles</div>
                <div className="text-xs text-gray-600 mt-1">ICRC-2 approval</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">4️⃣</div>
                <div className="font-medium text-sm text-gray-900">Create Canister</div>
                <div className="text-xs text-gray-600 mt-1">With collection metadata</div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-amber-900 mb-4">🏭 Canister Creation</h2>
            <div className="space-y-3 text-amber-800">
              <p><strong>Metadata Passed:</strong> Collection name, symbol, description</p>
              <p><strong>Network Config:</strong> Mainnet, devnet, testnet, or localnet</p>
              <p><strong>Result:</strong> New ICRC-7/ICRC-37 ckNFT canister ID</p>
              <p><strong>Callback:</strong> Notifies parent via <code>onCanisterCreated</code></p>
              <p><strong>One-Time:</strong> Canister persists for all future imports from this collection</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-900 mb-4">♻️ Existing Canister Detection</h2>
            <div className="space-y-3 text-yellow-800">
              <p><strong>Automatic Check:</strong> Queries if canister already exists for collection</p>
              <p><strong>Shows Canister ID:</strong> Displays existing canister principal</p>
              <p><strong>No Additional Cost:</strong> Skips creation, proceeds to next step</p>
              <p><strong>Metadata Display:</strong> Shows collection name, symbol, supply, royalties</p>
              <p><strong>Warning:</strong> Alerts if metadata not yet initialized</p>
            </div>
          </div>
        </div>
      )
    }
  }
};

// Mock collection
const mockCollection: SelectedSolanaCollection = {
  collection: {
    address: '7WkR61EaDmjMyHp5yYjXG6Bunn66i43g7MkCVao6F4z',
    name: 'Degenerate Ape Academy',
    symbol: 'DAPE',
    image: 'https://arweave.net/collection1.png',
    verified: true,
    nftCount: 15,
    nfts: Array(15).fill(null).map((_, i) => ({
      mintAddress: `nft${i}...`,
      tokenAddress: `token${i}...`,
      name: `Ape #${i + 1}`,
      image: `https://arweave.net/ape${i}.png`,
      collectionAddress: '7WkR61EaDmjMyHp5yYjXG6Bunn66i43g7MkCVao6F4z',
    })),
  },
};

// Story: Default - Loading state
export const Default: Story = {
  args: {
    selectedCollection: mockCollection,
    costs: null,
  },
};

// Story: With Calculated Cost
export const WithCalculatedCost: Story = {
  args: {
    selectedCollection: mockCollection,
    costs: BigInt('1000000000000'), // 1 TC (trillion cycles)
  },
};

// Story: Small Cost
export const SmallCost: Story = {
  args: {
    selectedCollection: mockCollection,
    costs: BigInt('100000000000'), // 0.1 TC
  },
};

// Story: Large Cost
export const LargeCost: Story = {
  args: {
    selectedCollection: mockCollection,
    costs: BigInt('5000000000000'), // 5 TC
  },
};

// Story: No Collection Selected
export const NoCollection: Story = {
  args: {
    selectedCollection: null,
    costs: null,
  },
};

// Story: Compact Mode
export const CompactMode: Story = {
  args: {
    selectedCollection: mockCollection,
    costs: BigInt('1000000000000'),
    compact: true,
  },
};

// Story: Compact Mode - Loading
export const CompactModeLoading: Story = {
  args: {
    selectedCollection: mockCollection,
    costs: null,
    compact: true,
  },
};

// Story: Compact Mode - No Collection
export const CompactModeNoCollection: Story = {
  args: {
    selectedCollection: null,
    costs: null,
    compact: true,
  },
};

// Story: Mainnet Network
export const MainnetNetwork: Story = {
  args: {
    selectedCollection: {
      ...mockCollection,
      collection: {
        ...mockCollection.collection,
        name: 'Mainnet Collection',
      }
    },
    costs: BigInt('1000000000000'),
  },
  parameters: {
    solana: {
      cluster: 'mainnet-beta'
    }
  }
};

// Story: Devnet Network
export const DevnetNetwork: Story = {
  args: {
    selectedCollection: {
      ...mockCollection,
      collection: {
        ...mockCollection.collection,
        name: 'Devnet Test Collection',
      }
    },
    costs: BigInt('1000000000000'),
  },
};

// Story: Testnet Network
export const TestnetNetwork: Story = {
  args: {
    selectedCollection: {
      ...mockCollection,
      collection: {
        ...mockCollection.collection,
        name: 'Testnet Collection',
      }
    },
    costs: BigInt('1000000000000'),
  },
  parameters: {
    solana: {
      cluster: 'testnet'
    }
  }
};

// Story: Localnet Network
export const LocalnetNetwork: Story = {
  args: {
    selectedCollection: {
      ...mockCollection,
      collection: {
        ...mockCollection.collection,
        name: 'Local Validator Collection',
      }
    },
    costs: BigInt('1000000000000'),
  },
  parameters: {
    solana: {
      cluster: 'localnet',
      actualRpcEndpoint: 'http://127.0.0.1:8899'
    }
  }
};

// Story: Mobile View
export const Mobile: Story = {
  args: {
    selectedCollection: mockCollection,
    costs: BigInt('1000000000000'),
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1'
    }
  }
};

// Story: Tablet View
export const Tablet: Story = {
  args: {
    selectedCollection: mockCollection,
    costs: BigInt('1000000000000'),
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet'
    }
  }
};

// Story: Interactive - Create Canister Flow
export const InteractiveCreateCanister: Story = {
  args: {
    selectedCollection: mockCollection,
    costs: BigInt('1000000000000'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Simulates the full canister creation workflow with sufficient balance. Click "Create Canister" to test approval and creation flow.'
      }
    }
  }
};

// Story: Multiple Collections (Different Networks)
export const MultipleNetworks: Story = {
  args: {
    selectedCollection: mockCollection,
    costs: BigInt('1000000000000'),
  },
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Mainnet Collection</h3>
        <SolanaCanisterCostStep
          selectedCollection={{
            ...mockCollection,
            collection: {
              ...mockCollection.collection,
              name: 'Mainnet NFTs',
            }
          }}
          costs={BigInt('1200000000000')}
          onCostsCalculated={fn()}
          onCanisterCreated={fn()}
        />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Devnet Collection</h3>
        <SolanaCanisterCostStep
          selectedCollection={{
            ...mockCollection,
            collection: {
              ...mockCollection.collection,
              name: 'Devnet Test NFTs',
              address: 'devnet123...',
            }
          }}
          costs={BigInt('800000000000')}
          onCostsCalculated={fn()}
          onCanisterCreated={fn()}
        />
      </div>
    </div>
  ),
};

// Story: Compact vs Full Comparison
export const CompactVsFull: Story = {
  args: {
    selectedCollection: mockCollection,
    costs: BigInt('1000000000000'),
  },
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Compact Mode</h3>
        <SolanaCanisterCostStep
          selectedCollection={mockCollection}
          costs={BigInt('1000000000000')}
          onCostsCalculated={fn()}
          onCanisterCreated={fn()}
          compact={true}
        />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Full Mode</h3>
        <SolanaCanisterCostStep
          selectedCollection={mockCollection}
          costs={BigInt('1000000000000')}
          onCostsCalculated={fn()}
          onCanisterCreated={fn()}
          compact={false}
        />
      </div>
    </div>
  ),
};

// Story: Cost Range Comparison
export const CostRangeComparison: Story = {
  args: {
    selectedCollection: mockCollection,
    costs: BigInt('1000000000000'),
  },
  render: () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium mb-2">Small Cost (0.1 TC)</h4>
        <SolanaCanisterCostStep
          selectedCollection={mockCollection}
          costs={BigInt('100000000000')}
          onCostsCalculated={fn()}
          onCanisterCreated={fn()}
          compact={true}
        />
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2">Medium Cost (1 TC)</h4>
        <SolanaCanisterCostStep
          selectedCollection={mockCollection}
          costs={BigInt('1000000000000')}
          onCostsCalculated={fn()}
          onCanisterCreated={fn()}
          compact={true}
        />
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2">Large Cost (5 TC)</h4>
        <SolanaCanisterCostStep
          selectedCollection={mockCollection}
          costs={BigInt('5000000000000')}
          onCostsCalculated={fn()}
          onCanisterCreated={fn()}
          compact={true}
        />
      </div>
    </div>
  ),
};

// Story: Documentation - Cycles Explanation
export const CyclesExplanation: Story = {
  args: {
    selectedCollection: mockCollection,
    costs: BigInt('1000000000000'),
  },
  parameters: {
    docs: {
      description: {
        story: `
### Understanding Cycles Costs

**What are cycles?**
Cycles are the unit of payment for computation and storage on the Internet Computer. 
1 ICP ≈ 1 trillion cycles (1 TC).

**Canister Creation Costs:**
- Cost covers creating a new ckNFT canister
- Canister stores bridged NFTs and manages collection metadata
- One-time payment per collection (1:1 relationship)
- Additional cycles may be needed for operations (transfers, approvals)

**Payment Flow:**
1. Query real-time cost from orchestrator (\`icrc99_get_creation_cost\`)
2. Check user's cycles balance from cycles ledger
3. Auto-approve cycles for orchestrator (ICRC-2 approve)
4. Create canister via \`icrc99_create_canister\`
5. Orchestrator uses transfer-from to pay creation costs

**Cost Optimization:**
- Pre-approve cycles to reduce transaction count
- Reuse existing canisters when bridging multiple NFTs from same collection
- Allowances expire after 24 hours for security
        `
      }
    }
  }
};

// Story: Documentation - Approval Workflow
export const ApprovalWorkflow: Story = {
  args: {
    selectedCollection: mockCollection,
    costs: BigInt('1000000000000'),
  },
  parameters: {
    docs: {
      description: {
        story: `
### Cycles Approval Workflow

**Automatic Approval (Default):**
- Component checks for sufficient existing allowance
- If insufficient or expired, auto-approves 120% of required cycles
- Approval happens during canister creation transaction
- No separate approval transaction needed

**Manual Pre-Approval:**
- Users can click "Pre-approve Cycles" button
- Approves 110% of required amount
- Creates ICRC-2 allowance valid for 24 hours
- Useful for batching multiple operations
- Orchestrator can use \`transfer_from\` without additional prompts

**Allowance Validation:**
- Checks current allowance amount (\`icrc2_allowance\`)
- Validates expiration timestamp
- Shows allowance status (approved/insufficient/expired)
- Prevents unnecessary duplicate approvals

**Security:**
- Allowances expire after 24 hours
- Orchestrator can only spend approved amount
- Each approval requires user confirmation
- Failed approvals show detailed error messages
        `
      }
    }
  }
};

// Story: Documentation - Existing Canister Detection
export const ExistingCanisterDetection: Story = {
  args: {
    selectedCollection: mockCollection,
    costs: BigInt('1000000000000'),
  },
  parameters: {
    docs: {
      description: {
        story: `
### Existing Canister Detection

**How Detection Works:**
1. Creates contract pointer from collection address + network
2. Queries orchestrator with \`icrc99_get_existing_canister\`
3. Returns \`[Principal]\` if exists, \`[]\` if none
4. Fetches collection metadata from existing canister

**When Canister Exists:**
- Shows success message with canister ID
- Displays collection metadata (name, symbol, supply, royalties)
- Shows "no additional costs" message
- Allows user to proceed directly to next step
- Warns if metadata not yet initialized

**Metadata Display:**
- Name (e.g., "ckNFT: Degenerate Ape Academy")
- Symbol (e.g., "DAPE")
- Description (network info, collection details)
- Total Supply (number of bridged NFTs)
- Supply Cap (max allowed NFTs)
- Royalties (percentage for creators)

**When Canister Doesn't Exist:**
- Shows cost calculation and creation form
- Validates balance and allowances
- Enables creation button when ready
- Creates new canister with provided defaults
        `
      }
    }
  }
};

// Story: Documentation - Network Configuration
export const NetworkConfiguration: Story = {
  args: {
    selectedCollection: mockCollection,
    costs: BigInt('1000000000000'),
  },
  parameters: {
    docs: {
      description: {
        story: `
### Network Configuration

**Supported Networks:**
- **Mainnet Beta**: Production Solana network
- **Devnet**: Development network with free SOL from faucets
- **Testnet**: Testing network (less stable than devnet)
- **Localnet**: Local validator (127.0.0.1:8899)

**Network Detection:**
- Reads from \`useSolana\` hook (\`cluster\` and \`actualRpcEndpoint\`)
- Auto-detects localhost connections as localnet
- Creates Candid network variant for contract pointer
- Displays human-readable network name in UI

**Network-Specific Behavior:**
- Contract pointers include network variant
- Canisters are network-specific (one per collection per network)
- Can bridge same collection from different networks to different canisters
- Description metadata includes network name

**Example Contract Pointers:**
\`\`\`typescript
// Mainnet
{ contract: "7WkR61EaDm...", network: { Solana: { Mainnet: null } } }

// Devnet
{ contract: "7WkR61EaDm...", network: { Solana: { Devnet: null } } }

// Localnet
{ contract: "7WkR61EaDm...", network: { Solana: { Localnet: null } } }
\`\`\`
        `
      }
    }
  }
};

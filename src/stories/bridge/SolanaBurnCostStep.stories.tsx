import type { Meta, StoryObj } from '@storybook/react';
import { SolanaBurnCostStep } from '../../components/bridge/solana/SolanaBurnCostStep';
import type { SolanaBurnCosts } from '../../components/bridge/solana/SolanaBurnCostStep';
import type { SelectedSolanaBurnNFT } from '../../components/bridge/SolanaBurnNFTSelectionStep';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SolanaWalletProvider } from '../../provider/SolanaWalletProvider';
import { IdentityKitProvider } from '@nfid/identitykit/react';
import { IdentityKitAuthType } from '@nfid/identitykit';
import { AgentProvider } from '../../provider/AgentProvider';
import { Principal } from '@dfinity/principal';
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

const LAMPORTS_PER_SOL = 1_000_000_000n;

const mockNFT: SelectedSolanaBurnNFT = {
  mintAddress: '8Rt3bfKKHcKbSZK9v7UPVC6ZQcLJhJR7DmV6RZfFqNW5',
  collectionAddress: 'J1S9H3QjnRtBbbuD4HjPV6RpRhwuk4zKbxsnCHuTgh9w',
  cluster: 'devnet',
  name: 'Mad Lad #1234',
  image: 'https://madlads.s3.us-west-2.amazonaws.com/images/1234.png',
  isRecovery: false
};

const mockCosts: SolanaBurnCosts = {
  solTransferFee: 5000n, // ~0.000005 SOL
  solAtaCreationFee: 2_040_000n, // ~0.00204 SOL
  totalSolCost: 2_045_000n, // ~0.002045 SOL
  icMintCost: 100_000_000_000n, // 100B cycles
  approvalAddress: 'ApproveXYZ123456789abcdefghijklmnopqrstuvwxyz',
  userSolBalance: 100_000_000n, // 0.1 SOL
  hasInsufficientSolBalance: false,
  ckNFTCanisterId: Principal.fromText('bd3sg-teaaa-aaaaa-qaaba-cai'),
  nftMintAddress: '8Rt3bfKKHcKbSZK9v7UPVC6ZQcLJhJR7DmV6RZfFqNW5'
};

const meta = {
  title: 'Bridge/SolanaBurnCostStep',
  component: SolanaBurnCostStep,
  decorators: [withProviders],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## SolanaBurnCostStep Component

Displays and handles costs for burning Solana NFT to create ckNFT.

### Cost Breakdown

**SOL Costs** (Solana blockchain):
- Transfer fee: ~0.000005 SOL per signature
- ATA creation: ~0.00204 SOL (if needed, rent-exempt)

**Cycles Costs** (IC):
- Orchestrator mint: ~100B cycles

### Approval Workflow

1. **Calculate Costs** - Fetch approval address, estimate fees
2. **Check Balances** - SOL balance + cycles allowance
3. **Approve Payment** - Authorize orchestrator to spend cycles
4. **Fund Approval Address** - Send SOL for transaction fees

### Balance States

- ✅ **Sufficient**: Both SOL + cycles available
- ⚠️ **Low SOL**: Need more SOL for blockchain fees
- ⚠️ **Low Cycles**: Need cycles allowance for mint
- ❌ **Insufficient**: Cannot proceed without funding
        `,
      },
    },
  },
  argTypes: {
    selectedNFT: {
      description: 'Single NFT to burn',
      control: { type: 'object' }
    },
    costs: {
      description: 'Calculated costs',
      control: { type: 'object' }
    },
    onCostsCalculated: {
      description: 'Callback when costs calculated',
      action: 'costs calculated'
    },
    compact: {
      description: 'Compact display mode',
      control: { type: 'boolean' }
    },
    isConnected: {
      description: 'Solana wallet connected',
      control: { type: 'boolean' }
    },
    walletPublicKey: {
      description: 'Solana wallet public key',
      control: { type: 'text' }
    }
  },
  args: {
    onCostsCalculated: fn(),
    compact: false,
    isConnected: true,
    walletPublicKey: '9Xy5AAAA1234567890abcdefghijklmnopqrstuvwxyz123'
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SolanaBurnCostStep>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    selectedNFT: mockNFT,
    costs: null
  },
};

export const WithCalculatedCosts: Story = {
  args: {
    selectedNFT: mockNFT,
    costs: mockCosts
  },
};

export const SmallCost: Story = {
  args: {
    selectedNFT: mockNFT,
    costs: {
      ...mockCosts,
      solTransferFee: 5000n,
      solAtaCreationFee: 0n, // ATA already exists
      totalSolCost: 5000n,
      icMintCost: 50_000_000_000n // 50B cycles
    }
  }
};

export const LargeCost: Story = {
  args: {
    selectedNFT: mockNFT,
    costs: {
      ...mockCosts,
      solTransferFee: 10_000n,
      solAtaCreationFee: 2_040_000n,
      totalSolCost: 2_050_000n,
      icMintCost: 500_000_000_000n // 500B cycles
    }
  }
};

export const InsufficientSolBalance: Story = {
  args: {
    selectedNFT: mockNFT,
    costs: {
      ...mockCosts,
      userSolBalance: 1_000_000n, // 0.001 SOL
      hasInsufficientSolBalance: true
    }
  }
};

export const NoATA: Story = {
  args: {
    selectedNFT: mockNFT,
    costs: {
      ...mockCosts,
      solAtaCreationFee: 2_040_000n,
      totalSolCost: 2_045_000n
    }
  }
};

export const ExistingATA: Story = {
  args: {
    selectedNFT: mockNFT,
    costs: {
      ...mockCosts,
      solAtaCreationFee: 0n,
      totalSolCost: 5000n
    }
  }
};

export const CompactMode: Story = {
  args: {
    selectedNFT: mockNFT,
    costs: mockCosts,
    compact: true
  }
};

export const NotConnected: Story = {
  args: {
    selectedNFT: mockNFT,
    costs: null,
    isConnected: false,
    walletPublicKey: null
  }
};

export const NoNFTSelected: Story = {
  args: {
    selectedNFT: null,
    costs: null
  }
};

// ===== DOCUMENTATION =====

export const Docs: Story = {
  name: '📖 Documentation',
  args: {
    selectedNFT: mockNFT,
    costs: mockCosts,
    isConnected: true,
    walletPublicKey: '9Xy5AAAA1234567890abcdefghijklmnopqrstuvwxyz123'
  },
  decorators: [],
  parameters: {
    docs: {
      page: () => (
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">SolanaBurnCostStep Component</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              The <code>SolanaBurnCostStep</code> component calculates and displays costs for burning a Solana NFT 
              to create a ckNFT on the Internet Computer, managing both SOL and cycles payment flows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">🎯 Primary Purpose</h2>
              <ul className="space-y-2 text-blue-800">
                <li>• Calculate SOL costs for NFT transfer and ATA creation</li>
                <li>• Estimate IC cycles for orchestrator mint operation</li>
                <li>• Manage cycles approval for orchestrator canister</li>
                <li>• Validate user has sufficient balances (SOL + cycles)</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-3">✨ Key Features</h2>
              <ul className="space-y-2 text-green-800">
                <li>• Dual-currency cost calculation (SOL + cycles)</li>
                <li>• Solana wallet integration</li>
                <li>• ICRC-2 cycles approval workflow</li>
                <li>• Real-time balance validation</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🚀 Burn & Mint Flow</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="text-2xl mb-2">1️⃣</div>
                <div className="font-medium text-gray-900">Calculate</div>
                <div className="text-sm text-gray-600">Costs estimate</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="text-2xl mb-2">2️⃣</div>
                <div className="font-medium text-gray-900">Approve</div>
                <div className="text-sm text-gray-600">Cycles payment</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="text-2xl mb-2">3️⃣</div>
                <div className="font-medium text-gray-900">Transfer</div>
                <div className="text-sm text-gray-600">NFT to bridge</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="text-2xl mb-2">4️⃣</div>
                <div className="font-medium text-gray-900">Mint</div>
                <div className="text-sm text-gray-600">ckNFT on IC</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-purple-900 mb-3">💰 SOL Costs</h2>
              <div className="space-y-2 text-purple-800">
                <p><strong>Transfer Fee:</strong> ~0.000005 SOL per signature</p>
                <p><strong>ATA Creation:</strong> ~0.00204 SOL (rent-exempt)</p>
                <p><strong>Total:</strong> ~0.002045 SOL (~$0.20 @ $100/SOL)</p>
                <p className="text-sm text-purple-600 mt-2">
                  ATA fee only charged if associated token account doesn't exist
                </p>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-orange-900 mb-3">⚙️ IC Cycles Costs</h2>
              <div className="space-y-2 text-orange-800">
                <p><strong>Orchestrator Mint:</strong> ~100B cycles</p>
                <p><strong>Cost:</strong> ~$0.13 @ 1T=$1.30</p>
                <p><strong>Payment:</strong> ICRC-2 approval required</p>
                <p className="text-sm text-orange-600 mt-2">
                  User approves orchestrator to spend cycles from cycles ledger
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-yellow-900 mb-4">🔍 Cost Calculation Process</h2>
            <div className="space-y-3 text-yellow-800">
              <p><strong>1. Get Approval Address:</strong> Query orchestrator for user-specific Solana address</p>
              <p><strong>2. Check ATA Status:</strong> Determine if associated token account exists</p>
              <p><strong>3. Query SOL Balance:</strong> Check user's wallet SOL balance</p>
              <p><strong>4. Estimate Costs:</strong> Calculate transfer + ATA creation fees</p>
              <p><strong>5. Query Cycles:</strong> Get orchestrator mint cost estimate</p>
              <p><strong>6. Check Allowance:</strong> Verify cycles approval status</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-4">⚠️ Balance Requirements</h2>
            <div className="space-y-3 text-red-800">
              <p><strong>SOL Balance:</strong> User must have sufficient SOL in connected wallet</p>
              <p><strong>Cycles Balance:</strong> User must have cycles in their IC account</p>
              <p><strong>Cycles Allowance:</strong> Must approve orchestrator to spend cycles</p>
              <p className="text-sm text-red-600 mt-2">
                Component validates all requirements before allowing burn operation to proceed
              </p>
            </div>
          </div>
        </div>
      )
    }
  }
};

export const Mobile: Story = {
  args: {
    selectedNFT: mockNFT,
    costs: mockCosts
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' }
  }
};

export const Tablet: Story = {
  args: {
    selectedNFT: mockNFT,
    costs: mockCosts
  },
  parameters: {
    viewport: { defaultViewport: 'tablet' }
  }
};

// Documentation Stories

export const CostBreakdown: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Cost Breakdown Example</h3>
      
      <div className="space-y-2">
        <h4 className="font-medium">SOL Costs (Solana Blockchain)</h4>
        <ul className="list-disc pl-6 space-y-1">
          <li>Transfer Fee: ~0.000005 SOL (~$0.0005 @ $100/SOL)</li>
          <li>ATA Creation: ~0.00204 SOL (~$0.20 @ $100/SOL, one-time)</li>
          <li>Total: ~0.002045 SOL (~$0.20 @ $100/SOL)</li>
        </ul>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Cycles Costs (IC)</h4>
        <ul className="list-disc pl-6 space-y-1">
          <li>Orchestrator Mint: ~100B cycles (~$0.13 @ 1T=$1.30)</li>
        </ul>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Total Estimated Cost</h4>
        <ul className="list-disc pl-6 space-y-1">
          <li>SOL: ~$0.20</li>
          <li>Cycles: ~$0.13</li>
          <li><strong>Grand Total: ~$0.33</strong></li>
        </ul>
      </div>
    </div>
  ),
  args: {
    selectedNFT: mockNFT,
    costs: mockCosts
  }
};

export const ApprovalWorkflow: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Approval Workflow</h3>
      
      <div className="space-y-3">
        <div>
          <h4 className="font-medium">1. Calculate Costs</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Fetch approval address from orchestrator</li>
            <li>Estimate SOL transfer + ATA creation fees</li>
            <li>Query cycles cost from orchestrator</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium">2. Check Balances</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Query user SOL balance from Solana</li>
            <li>Query cycles allowance from cycles ledger</li>
            <li>Show warnings if insufficient</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium">3. Approve Payment</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>User calls icrc2_approve for cycles</li>
            <li>Authorizes orchestrator to spend cycles</li>
            <li>Sets amount to mint cost</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium">4. Fund Approval Address</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Optional: Send SOL to approval address</li>
            <li>Ensures address has funds for transfer</li>
            <li>Only needed if approval address has low balance</li>
          </ul>
        </div>
      </div>
    </div>
  ),
  args: {
    selectedNFT: mockNFT,
    costs: mockCosts
  }
};

export const BalanceStates: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Balance State Examples</h3>
      
      <div className="space-y-3">
        <div className="border p-3 rounded">
          <h4 className="font-medium text-green-700">✅ Sufficient Balance</h4>
          <p className="text-sm">User has 0.1 SOL and 500B cycles allowance. Can proceed immediately.</p>
        </div>

        <div className="border p-3 rounded">
          <h4 className="font-medium text-yellow-700">⚠️ Low SOL Balance</h4>
          <p className="text-sm">User has 0.001 SOL but needs 0.002 SOL. Must add SOL to wallet.</p>
        </div>

        <div className="border p-3 rounded">
          <h4 className="font-medium text-yellow-700">⚠️ Low Cycles Allowance</h4>
          <p className="text-sm">User has 50B cycles allowance but needs 100B. Must approve more cycles.</p>
        </div>

        <div className="border p-3 rounded">
          <h4 className="font-medium text-red-700">❌ Insufficient Both</h4>
          <p className="text-sm">User lacks both SOL and cycles. Must fund wallet AND approve cycles.</p>
        </div>
      </div>
    </div>
  ),
  args: {
    selectedNFT: mockNFT,
    costs: mockCosts
  }
};

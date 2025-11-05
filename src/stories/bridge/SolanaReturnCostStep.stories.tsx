import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SolanaReturnCostStep } from '../../components/bridge/solana/SolanaReturnCostStep';
import type { SolanaReturnCosts, SelectedICNFT } from '../../components/bridge/solana/SolanaReturnCostStep';
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

const mockICNFT: SelectedICNFT = {
  canisterId: 'bd3sg-teaaa-aaaaa-qaaba-cai',
  tokenId: 12345n,
  metadata: [
    ['icrc7:name', { Text: 'Mad Lad #1234' }],
    ['icrc7:symbol', { Text: 'MADLAD' }],
    ['icrc7:description', { Text: 'A Mad Lad from Solana' }]
  ]
};

const mockCosts: SolanaReturnCosts = {
  castCycleCost: 2_500_000_000_000n, // 2.5T cycles
  solanaTransferFee: 5000n, // ~0.000005 SOL
  castSignerFundingRequired: 10_000_000n, // 0.01 SOL
  totalSolCost: 10_005_000n, // ~0.010005 SOL
  castSignerAddress: 'CastSignXYZ123456789abcdefghijklmnopqrstuvwxyz',
  castSignerBalance: 0n, // Needs funding
  needsCastSignerFunding: true,
  ckNFTCanisterId: Principal.fromText('bd3sg-teaaa-aaaaa-qaaba-cai'),
  tokenId: 12345n,
  nativeChain: { Solana: [{ Devnet: null }] },
  nativeContract: 'J1S9H3QjnRtBbbuD4HjPV6RpRhwuk4zKbxsnCHuTgh9w'
};

const meta = {
  title: 'Bridge/SolanaReturnCostStep',
  component: SolanaReturnCostStep,
  decorators: [withProviders],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## SolanaReturnCostStep Component

Displays and handles costs for returning ckNFT back to Solana.

### Dual Approval System

**Cycles Approval** (IC):
- Cast operation: ~2.5T cycles (~$3.25)
- Approve via icrc2_approve on cycles ledger
- Authorizes ckNFT canister to spend cycles

**SOL Approval** (Solana):
- Transfer fee: ~0.000005 SOL (~$0.0005)
- Cast signer funding: ~0.01 SOL (~$1.00, one-time)
- Total: ~0.010005 SOL (~$1.00 @ $100/SOL)

### Cast Signer

Special Solana address controlled by orchestrator:
- Executes Solana transaction on user's behalf
- Must be funded with SOL for transaction fees
- Receives NFT from custody, transfers to user
- Funding is one-time per cast signer

### Workflow

1. **Calculate Costs** - Query cast cost, check cast signer balance
2. **Check Balances** - SOL + cycles allowance
3. **Approve Cycles** - icrc2_approve for cast cost
4. **Fund Cast Signer** - Send SOL to cast signer address (if needed)
5. **Ready to Execute** - Both approvals complete
        `,
      },
    },
  },
  argTypes: {
    selectedNFT: {
      description: 'ckNFT to return to Solana',
      control: { type: 'object' }
    },
    costs: {
      description: 'Calculated return costs',
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
    },
    targetSolanaAddress: {
      description: 'Destination Solana address',
      control: { type: 'text' }
    }
  },
  args: {
    onCostsCalculated: fn(),
    compact: false,
    isConnected: true,
    walletPublicKey: '9Xy5AAAA1234567890abcdefghijklmnopqrstuvwxyz123',
    targetSolanaAddress: '9Xy5AAAA1234567890abcdefghijklmnopqrstuvwxyz123'
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SolanaReturnCostStep>;

export default meta;
type Story = StoryObj<typeof meta>;

// ===== DOCUMENTATION =====

export const Docs: Story = {
  name: '📖 Documentation',
  args: {
    selectedNFT: mockICNFT,
    costs: mockCosts
  },
  decorators: [],
  parameters: {
    docs: {
      page: () => (
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">SolanaReturnCostStep Component</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              The <code>SolanaReturnCostStep</code> component displays and handles costs for returning ckNFTs 
              back to Solana with a dual approval system (cycles + SOL).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">🎯 Primary Purpose</h2>
              <ul className="space-y-2 text-blue-800">
                <li>• Calculate cast operation costs</li>
                <li>• Approve cycles payment</li>
                <li>• Fund cast signer address</li>
                <li>• Validate balances (SOL + cycles)</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-3">✨ Key Features</h2>
              <ul className="space-y-2 text-green-800">
                <li>• Dual approval system</li>
                <li>• Cast signer management</li>
                <li>• One-time SOL funding</li>
                <li>• Balance verification</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">💰 Dual Cost Structure</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-blue-300">
                <div className="text-center mb-2">
                  <div className="text-2xl mb-1">⚡</div>
                  <div className="font-medium text-gray-900">Cycles (IC)</div>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Cast Operation:</strong> ~2.5T cycles</p>
                  <p><strong>USD Equivalent:</strong> ~$3.25</p>
                  <p><strong>Approval:</strong> icrc2_approve on cycles ledger</p>
                  <p><strong>Authorized:</strong> ckNFT canister to spend</p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-orange-300">
                <div className="text-center mb-2">
                  <div className="text-2xl mb-1">◎</div>
                  <div className="font-medium text-gray-900">SOL (Solana)</div>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Transfer Fee:</strong> ~0.000005 SOL (~$0.0005)</p>
                  <p><strong>Cast Signer Funding:</strong> ~0.01 SOL (one-time)</p>
                  <p><strong>Total SOL:</strong> ~0.010005 SOL (~$1.00)</p>
                  <p><strong>Destination:</strong> Cast signer address</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">🤖 Cast Signer Explained</h2>
            <div className="space-y-3 text-purple-800">
              <p><strong>What is it?</strong> Special Solana address controlled by orchestrator</p>
              <p><strong>Purpose:</strong> Executes Solana transaction on user's behalf</p>
              <p><strong>Process:</strong> Receives NFT from custody, transfers to user</p>
              <p><strong>Funding:</strong> One-time per cast signer (~0.01 SOL)</p>
              <p><strong>Why?</strong> User's IC identity cannot directly sign Solana transactions</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-amber-900 mb-4">🔄 Approval Workflow</h2>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">1️⃣</div>
                <div className="font-medium text-sm text-gray-900">Calculate</div>
                <div className="text-xs text-gray-600 mt-1">Cast cost + signer balance</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">2️⃣</div>
                <div className="font-medium text-sm text-gray-900">Check</div>
                <div className="text-xs text-gray-600 mt-1">SOL + cycles allowance</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">3️⃣</div>
                <div className="font-medium text-sm text-gray-900">Approve</div>
                <div className="text-xs text-gray-600 mt-1">Cycles for cast</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">4️⃣</div>
                <div className="font-medium text-sm text-gray-900">Fund</div>
                <div className="text-xs text-gray-600 mt-1">SOL to cast signer</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">✅</div>
                <div className="font-medium text-sm text-gray-900">Ready</div>
                <div className="text-xs text-gray-600 mt-1">Execute return</div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-900 mb-4">💡 Important Notes</h2>
            <div className="space-y-3 text-yellow-800">
              <p><strong>One-Time Funding:</strong> Cast signer only needs funding once - reused for future returns</p>
              <p><strong>Balance Check:</strong> Component automatically detects if cast signer already funded</p>
              <p><strong>Approval Reuse:</strong> If sufficient cycles allowance exists, skips re-approval</p>
              <p><strong>Network Specific:</strong> Different cast signer per network (mainnet vs devnet)</p>
            </div>
          </div>
        </div>
      )
    }
  }
};

export const Default: Story = {
  args: {
    selectedNFT: mockICNFT,
    costs: null
  },
};

export const WithCalculatedCosts: Story = {
  args: {
    selectedNFT: mockICNFT,
    costs: mockCosts
  },
};

export const CastSignerFunded: Story = {
  args: {
    selectedNFT: mockICNFT,
    costs: {
      ...mockCosts,
      castSignerBalance: 20_000_000n, // 0.02 SOL
      needsCastSignerFunding: false,
      castSignerFundingRequired: 0n,
      totalSolCost: 5000n // Just transfer fee
    }
  }
};

export const LowCastSignerBalance: Story = {
  args: {
    selectedNFT: mockICNFT,
    costs: {
      ...mockCosts,
      castSignerBalance: 5_000_000n, // 0.005 SOL (low)
      needsCastSignerFunding: true,
      castSignerFundingRequired: 5_000_000n // Top up with 0.005 SOL
    }
  }
};

export const HighCastCost: Story = {
  args: {
    selectedNFT: mockICNFT,
    costs: {
      ...mockCosts,
      castCycleCost: 5_000_000_000_000n, // 5T cycles
    }
  }
};

export const MainnetNetwork: Story = {
  args: {
    selectedNFT: mockICNFT,
    costs: {
      ...mockCosts,
      nativeChain: { Solana: [{ Mainnet: null }] }
    }
  }
};

export const TestnetNetwork: Story = {
  args: {
    selectedNFT: mockICNFT,
    costs: {
      ...mockCosts,
      nativeChain: { Solana: [{ Testnet: null }] }
    }
  }
};

export const CompactMode: Story = {
  args: {
    selectedNFT: mockICNFT,
    costs: mockCosts,
    compact: true
  }
};

export const NotConnected: Story = {
  args: {
    selectedNFT: mockICNFT,
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

export const Mobile: Story = {
  args: {
    selectedNFT: mockICNFT,
    costs: mockCosts
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' }
  }
};

export const Tablet: Story = {
  args: {
    selectedNFT: mockICNFT,
    costs: mockCosts
  },
  parameters: {
    viewport: { defaultViewport: 'tablet' }
  }
};

// Documentation Stories

export const DualApprovalSystem: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Dual Approval System</h3>
      
      <div className="space-y-3">
        <div className="border p-3 rounded">
          <h4 className="font-medium text-blue-700">Cycles Approval (IC)</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
            <li>Cast operation cost: ~2.5T cycles (~$3.25 @ 1T=$1.30)</li>
            <li>User calls icrc2_approve on cycles ledger</li>
            <li>Authorizes ckNFT canister to spend cycles</li>
            <li>Amount must match cast cost exactly</li>
          </ul>
        </div>

        <div className="border p-3 rounded">
          <h4 className="font-medium text-orange-700">SOL Approval (Solana)</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
            <li>Transfer fee: ~0.000005 SOL (~$0.0005 @ $100/SOL)</li>
            <li>Cast signer funding: ~0.01 SOL (~$1.00, one-time)</li>
            <li>User sends SOL to cast signer address</li>
            <li>Cast signer uses SOL to execute Solana transaction</li>
          </ul>
        </div>

        <div className="bg-gray-100 p-3 rounded">
          <p className="text-sm font-medium">Total Estimated Cost: ~$4.25</p>
          <p className="text-xs text-gray-600 mt-1">Cycles: $3.25 + SOL: $1.00</p>
        </div>
      </div>
    </div>
  ),
  args: {
    selectedNFT: mockICNFT,
    costs: mockCosts
  }
};

export const CastSignerExplainer: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Cast Signer Architecture</h3>
      
      <div className="space-y-2">
        <h4 className="font-medium">What is a Cast Signer?</h4>
        <p className="text-sm">
          A Solana address controlled by the orchestrator that executes Solana transactions 
          on behalf of the user during the return (cast) process.
        </p>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Why is it needed?</h4>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>IC canisters cannot directly sign Solana transactions</li>
          <li>Orchestrator derives cast signer from user principal + NFT data</li>
          <li>Cast signer receives NFT from custody address</li>
          <li>Cast signer transfers NFT to user's Solana wallet</li>
        </ul>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Funding Requirements</h4>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>Cast signer needs SOL for transaction fees</li>
          <li>One-time funding of ~0.01 SOL per cast signer</li>
          <li>If balance exists, no additional funding needed</li>
          <li>Leftover SOL stays with cast signer (can't be withdrawn)</li>
        </ul>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Security Model</h4>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>Cast signer is derived deterministically (no private key storage)</li>
          <li>Only orchestrator can control cast signer</li>
          <li>User funds cast signer, orchestrator executes transaction</li>
          <li>NFT custody → cast signer → user wallet</li>
        </ul>
      </div>
    </div>
  ),
  args: {
    selectedNFT: mockICNFT,
    costs: mockCosts
  }
};

export const ReturnWorkflow: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Return Workflow Steps</h3>
      
      <div className="space-y-3">
        <div>
          <h4 className="font-medium">1. Calculate Costs</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Query icrc99_cast_cost from ckNFT canister</li>
            <li>Fetch cast signer address from orchestrator</li>
            <li>Check cast signer SOL balance</li>
            <li>Estimate Solana transaction fees</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium">2. Check Balances</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Query user SOL balance from Solana</li>
            <li>Query cycles allowance from cycles ledger</li>
            <li>Display warnings if insufficient</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium">3. Approve Cycles</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>User calls icrc2_approve on cycles ledger</li>
            <li>Spender: ckNFT canister</li>
            <li>Amount: cast cost (e.g., 2.5T cycles)</li>
            <li>Expiration: 5 minutes from now</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium">4. Fund Cast Signer</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>User sends SOL to cast signer address</li>
            <li>Amount: 0.01 SOL (or top-up if low)</li>
            <li>Ensures cast signer can execute transaction</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium">5. Ready to Execute</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Both approvals complete</li>
            <li>Proceed to SolanaReturnExecutionStep</li>
            <li>Execute icrc99_cast call</li>
          </ul>
        </div>
      </div>
    </div>
  ),
  args: {
    selectedNFT: mockICNFT,
    costs: mockCosts
  }
};

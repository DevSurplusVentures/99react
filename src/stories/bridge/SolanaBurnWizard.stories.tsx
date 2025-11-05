import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SolanaBurnWizard } from '../../components/bridge/solana/SolanaBurnWizard';
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
  title: 'Bridge/SolanaBurnWizard',
  component: SolanaBurnWizard,
  decorators: [withProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## SolanaBurnWizard Component

Complete multi-step wizard for burning Solana NFTs and returning them to Internet Computer.

### Wizard Steps

1. **Connect** - Connect Solana wallet
2. **Select NFT** - Choose ONE NFT to burn (from orchestrator-controlled collections)
3. **Costs** - Review SOL costs and approve
4. **Burn** - Execute burn transaction
5. **Complete** - Show results and transaction IDs

### Architecture

**Burn Flow**: Solana NFT → Transfer to Approval Address → IC Orchestrator Mint → ckNFT Returned

**Key Differences from Import**:
- Single-select only (one NFT per burn)
- Only shows orchestrator-controlled collections
- Burns existing NFT rather than bridging new one
- Returns to existing ckNFT canister

### Features

- Step-by-step guided process
- Validation at each step
- Recovery mode for incomplete burns
- Cost estimation and approval
- Transaction monitoring
- Success/failure handling
        `,
      },
    },
  },
  argTypes: {
    cluster: {
      description: 'Solana network cluster',
      control: { type: 'select' },
      options: ['mainnet-beta', 'devnet', 'testnet', 'localnet']
    },
    sourceMintAddress: {
      description: 'Pre-selected NFT mint address',
      control: { type: 'text' }
    },
    sourceCollectionAddress: {
      description: 'Pre-selected collection address',
      control: { type: 'text' }
    },
    onComplete: {
      description: 'Callback when burn completes',
      action: 'burn complete'
    },
    onCancel: {
      description: 'Callback when wizard cancelled',
      action: 'wizard cancelled'
    },
    modal: {
      description: 'Show wizard in modal',
      control: { type: 'boolean' }
    }
  },
  args: {
    onComplete: fn(),
    onCancel: fn()
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SolanaBurnWizard>;

export default meta;
type Story = StoryObj<typeof meta>;

// ===== DOCUMENTATION =====

export const Docs: Story = {
  name: '📖 Documentation',
  args: {
    cluster: 'devnet',
  },
  decorators: [],
  parameters: {
    docs: {
      page: () => (
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">SolanaBurnWizard Component</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              The <code>SolanaBurnWizard</code> component provides a complete multi-step workflow for burning 
              Solana NFTs and re-minting them as ckNFTs on Internet Computer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">🎯 Primary Purpose</h2>
              <ul className="space-y-2 text-blue-800">
                <li>• Guide users through burn workflow</li>
                <li>• Orchestrate 4-step process</li>
                <li>• Handle cost calculations & approvals</li>
                <li>• Execute irreversible burn operation</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-3">✨ Key Features</h2>
              <ul className="space-y-2 text-green-800">
                <li>• Multi-step progress tracking</li>
                <li>• Wallet connection integration</li>
                <li>• Cost approval workflows</li>
                <li>• Comprehensive error handling</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🔄 4-Step Burn Workflow</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-4 text-center border border-blue-300">
                <div className="text-2xl mb-2">1️⃣</div>
                <div className="font-medium text-sm text-gray-900">Connect Wallet</div>
                <div className="text-xs text-gray-600 mt-1">Phantom/Backpack on devnet</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border border-purple-300">
                <div className="text-2xl mb-2">2️⃣</div>
                <div className="font-medium text-sm text-gray-900">Select NFT</div>
                <div className="text-xs text-gray-600 mt-1">Single NFT to burn</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border border-orange-300">
                <div className="text-2xl mb-2">3️⃣</div>
                <div className="font-medium text-sm text-gray-900">Calculate Costs</div>
                <div className="text-xs text-gray-600 mt-1">SOL + Cycles required</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border border-red-300">
                <div className="text-2xl mb-2">4️⃣</div>
                <div className="font-medium text-sm text-gray-900">Execute Burn</div>
                <div className="text-xs text-gray-600 mt-1">Permanent destruction</div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">⚠️ Burn vs Import Wizard</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-red-300">
                <div className="font-medium text-gray-900 mb-2">🔥 Burn Wizard (This)</div>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>Process:</strong> Destroys original NFT</p>
                  <p><strong>Result:</strong> Only ckNFT exists</p>
                  <p><strong>Reversible:</strong> ❌ No (permanent)</p>
                  <p><strong>Use Case:</strong> Full migration</p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-green-300">
                <div className="font-medium text-gray-900 mb-2">🔄 Import Wizard</div>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>Process:</strong> Locks in custody</p>
                  <p><strong>Result:</strong> Both NFT + ckNFT</p>
                  <p><strong>Reversible:</strong> ✅ Yes (can return)</p>
                  <p><strong>Use Case:</strong> Temporary bridge</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-amber-900 mb-4">🏛️ Wizard Architecture</h2>
            <div className="space-y-3 text-amber-800">
              <p><strong>State Management:</strong> Tracks current step, selected NFT, costs, approvals</p>
              <p><strong>Navigation:</strong> Forward/back buttons with validation at each step</p>
              <p><strong>Error Handling:</strong> Per-step error states with recovery options</p>
              <p><strong>Persistence:</strong> Saves progress to localStorage for refresh recovery</p>
              <p><strong>Completion:</strong> Shows success summary with transaction links</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-900 mb-4">💰 Cost Summary</h2>
            <div className="space-y-2 text-yellow-800">
              <div className="bg-white rounded p-3 text-sm">
                <strong>SOL (Solana):</strong> ~0.005 SOL - Transfer + burn tx fees
              </div>
              <div className="bg-white rounded p-3 text-sm">
                <strong>Cycles (IC):</strong> ~100B cycles - ckNFT minting cost
              </div>
              <p className="text-xs mt-3">
                <strong>Total:</strong> ~$0.50 in SOL + ~$0.13 in cycles = ~$0.63 per NFT burn
              </p>
              <p className="text-xs text-red-700 mt-2">
                <strong>Warning:</strong> Original Solana NFT is permanently destroyed - cannot be recovered!
              </p>
            </div>
          </div>
        </div>
      )
    }
  }
};

// Story: Default
export const Default: Story = {
  args: {
    cluster: 'devnet',
  },
};

// Story: Mainnet
export const Mainnet: Story = {
  args: {
    cluster: 'mainnet-beta',
  },
};

// Story: With Pre-selected NFT
export const PreSelectedNFT: Story = {
  args: {
    cluster: 'devnet',
    sourceMintAddress: '7WkR61EaDmjMyHp5yYjXG6Bunn66i43g7MkCVao6F4z',
  },
};

// Story: Modal Mode
export const ModalMode: Story = {
  args: {
    cluster: 'devnet',
    modal: true,
  },
};

// Story: Success Result
export const SuccessResult: Story = {
  args: {
    cluster: 'devnet',
    mockBurnResult: {
      success: true,
      solanaSignature: 'abc123signature...',
      icTransactionHash: 'def456hash...',
      ckNFTCanisterId: 'bd3sg-teaaa-aaaaa-qaaba-cai',
      tokenId: '12345',
    },
  },
};

// Story: Failed Result
export const FailedResult: Story = {
  args: {
    cluster: 'devnet',
    mockBurnResult: {
      success: false,
      error: 'Insufficient SOL for transaction fees',
    },
  },
};

// Story: Mobile
export const Mobile: Story = {
  args: {
    cluster: 'devnet',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1'
    }
  }
};

// Story: Tablet
export const Tablet: Story = {
  args: {
    cluster: 'devnet',
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet'
    }
  }
};

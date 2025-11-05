import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SolanaReturnWizard } from '../../components/bridge/solana/SolanaReturnWizard';
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
  title: 'Bridge/SolanaReturnWizard',
  component: SolanaReturnWizard,
  decorators: [withProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## SolanaReturnWizard Component

Complete wizard for returning ckNFTs from IC back to Solana.

### Wizard Steps

1. **Connect IC** - Connect Internet Identity/NFID
2. **Select ckNFT** - Choose ONE ckNFT to return
3. **Connect Solana** - Connect Solana wallet
4. **Costs** - Review cycles + SOL costs
5. **Return** - Execute icrc99_cast call
6. **Complete** - Show results

### Architecture

**Return Flow**: IC ckNFT → icrc99_cast → Solana NFT Created

Uses orchestrator's \`icrc99_cast\` to create Solana NFT from ckNFT.
        `,
      },
    },
  },
  argTypes: {
    ckNFTCanisterId: {
      description: 'Pre-selected ckNFT canister',
      control: { type: 'text' }
    },
    tokenId: {
      description: 'Pre-selected token ID',
      control: { type: 'text' }
    },
    onComplete: {
      description: 'Callback when return completes',
      action: 'return complete'
    },
    onCancel: {
      description: 'Callback when cancelled',
      action: 'wizard cancelled'
    },
    modal: {
      description: 'Show in modal',
      control: { type: 'boolean' }
    }
  },
  args: {
    onComplete: fn(),
    onCancel: fn()
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SolanaReturnWizard>;

export default meta;
type Story = StoryObj<typeof meta>;

// ===== DOCUMENTATION =====

export const Docs: Story = {
  name: '📖 Documentation',
  decorators: [],
  parameters: {
    docs: {
      page: () => (
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">SolanaReturnWizard Component</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              The <code>SolanaReturnWizard</code> component provides a complete multi-step workflow for returning 
              ckNFTs back to Solana networks with cycle approvals and cast signer operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">🎯 Primary Purpose</h2>
              <ul className="space-y-2 text-blue-800">
                <li>• Guide users through return workflow</li>
                <li>• Select ckNFT to return to Solana</li>
                <li>• Calculate and approve costs</li>
                <li>• Execute cast operation</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-3">✨ Key Features</h2>
              <ul className="space-y-2 text-green-800">
                <li>• 3-step guided workflow</li>
                <li>• IC authentication required</li>
                <li>• Dual approval (Cycles + SOL)</li>
                <li>• Cast signer management</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🔄 3-Step Return Workflow</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-4 text-center border border-blue-300">
                <div className="text-2xl mb-2">1️⃣</div>
                <div className="font-medium text-sm text-gray-900">Select ckNFT</div>
                <div className="text-xs text-gray-600 mt-1">Choose NFT from IC wallet</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border border-purple-300">
                <div className="text-2xl mb-2">2️⃣</div>
                <div className="font-medium text-sm text-gray-900">Calculate Costs</div>
                <div className="text-xs text-gray-600 mt-1">Cast + signer funding</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border border-green-300">
                <div className="text-2xl mb-2">3️⃣</div>
                <div className="font-medium text-sm text-gray-900">Execute Return</div>
                <div className="text-xs text-gray-600 mt-1">Transfer back to Solana</div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">🎯 Return Requirements</h2>
            <div className="space-y-3 text-purple-800">
              <p><strong>ckNFT Ownership:</strong> Must own ckNFT in IC wallet (ICRC-7 token)</p>
              <p><strong>Original Exists:</strong> Original Solana NFT must be in custody (not burned)</p>
              <p><strong>IC Authentication:</strong> Connected to Internet Identity or NFID</p>
              <p><strong>Solana Wallet:</strong> Connected Phantom/Backpack for receiving</p>
              <p><strong>Funds:</strong> Sufficient cycles (IC) + SOL (Solana)</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-amber-900 mb-4">🤖 Cast Signer Process</h2>
            <div className="space-y-3 text-amber-800">
              <p><strong>What it does:</strong> Orchestrator-controlled Solana address executes transfer on your behalf</p>
              <p><strong>Why needed:</strong> Your IC principal cannot directly sign Solana transactions</p>
              <p><strong>One-time funding:</strong> ~0.01 SOL for transaction fees (reused for future returns)</p>
              <p><strong>NFT path:</strong> Custody → Cast Signer → Your Solana Wallet</p>
              <p><strong>Security:</strong> Orchestrator only has permission to transfer your approved NFTs</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-900 mb-4">💰 Cost Breakdown</h2>
            <div className="space-y-2 text-yellow-800">
              <div className="bg-white rounded p-3 text-sm">
                <strong>Cycles (IC):</strong> ~2.5T cycles (~$3.25) - Cast operation cost
              </div>
              <div className="bg-white rounded p-3 text-sm">
                <strong>SOL (Solana):</strong> ~0.010005 SOL (~$1.00) - Cast signer + transfer fees
              </div>
              <p className="text-xs mt-3">
                <strong>Total:</strong> ~$4.25 to return ckNFT back to Solana
              </p>
              <p className="text-xs mt-2">
                <strong>Note:</strong> Cast signer funding is one-time - subsequent returns only pay cycles + transfer fee
              </p>
            </div>
          </div>
        </div>
      )
    }
  }
};

export const Default: Story = {
  args: {},
};

export const PreSelectedNFT: Story = {
  args: {
    ckNFTCanisterId: 'bd3sg-teaaa-aaaaa-qaaba-cai',
    tokenId: '12345',
  },
};

export const ModalMode: Story = {
  args: {
    modal: true,
  },
};

export const Mobile: Story = {
  args: {},
  parameters: {
    viewport: { defaultViewport: 'mobile1' }
  }
};

export const Tablet: Story = {
  args: {},
  parameters: {
    viewport: { defaultViewport: 'tablet' }
  }
};

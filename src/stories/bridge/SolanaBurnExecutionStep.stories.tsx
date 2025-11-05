import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SolanaBurnExecutionStep } from '../../components/bridge/solana/SolanaBurnExecutionStep';
import type { SolanaBurnCosts } from '../../components/bridge/solana/SolanaBurnCostStep';
import type { SelectedSolanaBurnNFT } from '../../components/bridge/SolanaBurnNFTSelectionStep';
import type { BridgeProgress } from '../../lib/bridgeProgress';
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

const mockNFT: SelectedSolanaBurnNFT = {
  mintAddress: '8Rt3bfKKHcKbSZK9v7UPVC6ZQcLJhJR7DmV6RZfFqNW5',
  collectionAddress: 'J1S9H3QjnRtBbbuD4HjPV6RpRhwuk4zKbxsnCHuTgh9w',
  cluster: 'devnet',
  name: 'Mad Lad #1234',
  image: 'https://madlads.s3.us-west-2.amazonaws.com/images/1234.png',
  isRecovery: false
};

const mockCosts: SolanaBurnCosts = {
  solTransferFee: 5000n,
  solAtaCreationFee: 0n,
  totalSolCost: 5000n,
  icMintCost: 100_000_000_000n,
  approvalAddress: 'ApproveXYZ123456789abcdefghijklmnopqrstuvwxyz',
  userSolBalance: 100_000_000n,
  hasInsufficientSolBalance: false,
  ckNFTCanisterId: Principal.fromText('bd3sg-teaaa-aaaaa-qaaba-cai'),
  nftMintAddress: '8Rt3bfKKHcKbSZK9v7UPVC6ZQcLJhJR7DmV6RZfFqNW5'
};

const mockProgress: BridgeProgress = {
  id: 'burn-progress-1',
  direction: 'evm-to-ic' as const,
  currentStep: 1,
  totalSteps: 2,
  isComplete: false,
  startTime: Date.now(),
  stages: [],
  steps: [
    {
      id: 'transfer-to-approval',
      title: 'Transfer to Approval Address',
      status: 'pending',
      description: 'Transferring NFT to approval address on Solana',
      stage: 'burn'
    },
    {
      id: 'mint-cknft',
      title: 'Mint ckNFT',
      status: 'pending',
      description: 'Minting ckNFT on Internet Computer',
      stage: 'burn'
    },
  ],
};

const meta = {
  title: 'Bridge/SolanaBurnExecutionStep',
  component: SolanaBurnExecutionStep,
  decorators: [withProviders],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## SolanaBurnExecutionStep Component

Executes the burn process: transfer Solana NFT → mint ckNFT.

### Execution Flow

**Stage 1: Transfer to Approval Address**
- User signs Solana transaction
- Transfers NFT to orchestrator-controlled address
- Confirms transaction on Solana blockchain

**Stage 2: Orchestrator Mint**
- Orchestrator detects NFT transfer
- Calls icrc99_mint on ckNFT canister
- Creates ckNFT on IC for user

### Progress Tracking

- Real-time status updates
- Transaction signatures captured
- Error handling with recovery guidance
- Automatic retry on temporary failures
        `,
      },
    },
  },
  argTypes: {
    selectedNFT: {
      description: 'NFT to burn',
      control: { type: 'object' }
    },
    burnCosts: {
      description: 'Calculated burn costs',
      control: { type: 'object' }
    },
    progress: {
      description: 'Progress state',
      control: { type: 'object' }
    },
    onProgressUpdate: {
      description: 'Progress update callback',
      action: 'progress updated'
    },
    onTransactionComplete: {
      description: 'Completion callback',
      action: 'transaction complete'
    },
    onError: {
      description: 'Error callback',
      action: 'error occurred'
    }
  },
  args: {
    onProgressUpdate: fn(),
    onTransactionComplete: fn(),
    onError: fn()
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SolanaBurnExecutionStep>;

export default meta;
type Story = StoryObj<typeof meta>;

// ===== DOCUMENTATION =====

export const Docs: Story = {
  name: '📖 Documentation',
  args: {
    selectedNFT: mockNFT,
    burnCosts: mockCosts,
    progress: mockProgress
  },
  decorators: [],
  parameters: {
    docs: {
      page: () => (
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">SolanaBurnExecutionStep Component</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              The <code>SolanaBurnExecutionStep</code> component executes the burn-and-mint workflow for 
              bringing Solana NFTs to IC by burning them on Solana and re-minting as ckNFTs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">🎯 Primary Purpose</h2>
              <ul className="space-y-2 text-blue-800">
                <li>• Transfer NFT to approval address</li>
                <li>• Execute Solana burn transaction</li>
                <li>• Approve IC cycles payment</li>
                <li>• Mint ckNFT on Internet Computer</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-3">✨ Key Features</h2>
              <ul className="space-y-2 text-green-800">
                <li>• SPL Token burn operation</li>
                <li>• Progress tracking (2 stages)</li>
                <li>• Transaction signature recording</li>
                <li>• Error recovery support</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🔥 Burn & Mint Workflow</h2>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-orange-300">
                <div className="font-medium text-gray-900 mb-2">1️⃣ Transfer to Approval Address</div>
                <div className="text-sm text-gray-700">
                  Send NFT from user's wallet to orchestrator-controlled approval address on Solana
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-red-300">
                <div className="font-medium text-gray-900 mb-2">2️⃣ Burn NFT (Destructive!)</div>
                <div className="text-sm text-gray-700">
                  Permanently destroy the NFT on Solana - cannot be reversed!
                  <div className="mt-2 text-xs bg-red-50 p-2 rounded">
                    <strong>Warning:</strong> Original Solana NFT is permanently burned. Only ckNFT remains.
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-purple-300">
                <div className="font-medium text-gray-900 mb-2">3️⃣ Approve Cycles</div>
                <div className="text-sm text-gray-700">
                  ICRC-2 approval for ckNFT canister to spend cycles for minting
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-green-300">
                <div className="font-medium text-gray-900 mb-2">4️⃣ Mint ckNFT on IC</div>
                <div className="text-sm text-gray-700">
                  Call orchestrator to mint ckNFT with metadata from burned Solana NFT
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">🆚 Burn vs Import</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-orange-300">
                <div className="font-medium text-gray-900 mb-2">🔥 Burn (This Component)</div>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>• Destroys original Solana NFT</p>
                  <p>• Only ckNFT exists after</p>
                  <p>• Use Case: Full migration to IC</p>
                  <p>• Irreversible operation</p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-300">
                <div className="font-medium text-gray-900 mb-2">🔄 Import (Standard)</div>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>• Locks original in custody</p>
                  <p>• Both NFT + ckNFT exist</p>
                  <p>• Use Case: Temporary bridging</p>
                  <p>• Reversible (can return)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-amber-900 mb-4">⚠️ Important Warnings</h2>
            <div className="space-y-3 text-amber-800">
              <p><strong>Irreversible:</strong> Burn operation permanently destroys the original Solana NFT</p>
              <p><strong>No Return:</strong> Cannot bridge back to Solana (no original to return)</p>
              <p><strong>Metadata Preservation:</strong> All metadata copied to ckNFT before burning</p>
              <p><strong>Recovery Scenarios:</strong> If mint fails after burn, recovery possible via approval address</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-900 mb-4">📊 Progress Stages</h2>
            <div className="space-y-2 text-yellow-800">
              <div className="bg-white rounded p-3 text-sm">
                <strong>Stage 1:</strong> Transfer to Approval + Burn (Solana operations)
              </div>
              <div className="bg-white rounded p-3 text-sm">
                <strong>Stage 2:</strong> Approve Cycles + Mint ckNFT (IC operations)
              </div>
              <p className="text-xs mt-3">
                Each stage displays real-time status with transaction links to Solscan and IC Dashboard
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
    selectedNFT: mockNFT,
    burnCosts: mockCosts,
    progress: mockProgress
  },
};

export const TransferringStage: Story = {
  args: {
    selectedNFT: mockNFT,
    burnCosts: mockCosts,
    progress: {
      ...mockProgress,
      steps: [
        {
          id: 'transfer-to-approval',
          title: 'Transfer to Approval Address',
          status: 'loading',
          description: 'Transferring NFT to approval address on Solana',
          stage: 'burn'
        },
        {
          id: 'mint-cknft',
          title: 'Mint ckNFT',
          status: 'pending',
          description: 'Minting ckNFT on Internet Computer',
          stage: 'burn'
        },
      ],
    }
  }
};

export const MintingStage: Story = {
  args: {
    selectedNFT: mockNFT,
    burnCosts: mockCosts,
    progress: {
      ...mockProgress,
      currentStep: 2,
      steps: [
        {
          id: 'transfer-to-approval',
          title: 'Transfer to Approval Address',
          status: 'completed',
          description: 'Transferred to approval address',
          txHash: '4ZxH...',
          stage: 'burn'
        },
        {
          id: 'mint-cknft',
          title: 'Mint ckNFT',
          status: 'loading',
          description: 'Minting ckNFT on Internet Computer',
          stage: 'burn'
        },
      ],
    }
  }
};

export const CompletedSuccess: Story = {
  args: {
    selectedNFT: mockNFT,
    burnCosts: mockCosts,
    progress: {
      ...mockProgress,
      currentStep: 2,
      isComplete: true,
      steps: [
        {
          id: 'transfer-to-approval',
          title: 'Transfer to Approval Address',
          status: 'completed',
          description: 'Transferred successfully',
          txHash: '4ZxH2Vq...',
          stage: 'burn'
        },
        {
          id: 'mint-cknft',
          title: 'Mint ckNFT',
          status: 'completed',
          description: 'ckNFT minted successfully',
          txHash: '0x12345',
          stage: 'burn'
        },
      ],
    }
  }
};

export const TransferError: Story = {
  args: {
    selectedNFT: mockNFT,
    burnCosts: mockCosts,
    progress: {
      ...mockProgress,
      steps: [
        {
          id: 'transfer-to-approval',
          title: 'Transfer to Approval Address',
          status: 'failed',
          description: 'Failed to transfer NFT',
          error: 'User rejected transaction',
          stage: 'burn'
        },
        {
          id: 'mint-cknft',
          title: 'Mint ckNFT',
          status: 'pending',
          description: 'Waiting for transfer',
          stage: 'burn'
        },
      ],
    }
  }
};

export const MintError: Story = {
  args: {
    selectedNFT: mockNFT,
    burnCosts: mockCosts,
    progress: {
      ...mockProgress,
      currentStep: 2,
      steps: [
        {
          id: 'transfer-to-approval',
          title: 'Transfer to Approval Address',
          status: 'completed',
          description: 'Transferred successfully',
          txHash: '4ZxH2Vq...',
          stage: 'burn'
        },
        {
          id: 'mint-cknft',
          title: 'Mint ckNFT',
          status: 'failed',
          description: 'Failed to mint ckNFT',
          error: 'Insufficient cycles allowance',
          stage: 'burn'
        },
      ],
    }
  }
};

export const RecoveryMode: Story = {
  args: {
    selectedNFT: {
      ...mockNFT,
      isRecovery: true
    },
    burnCosts: mockCosts,
    progress: {
      ...mockProgress,
      currentStep: 2,
      steps: [
        {
          id: 'transfer-to-approval',
          title: 'Transfer to Approval Address',
          status: 'skipped',
          description: 'NFT already at approval address',
          txHash: '(previous)',
          stage: 'burn'
        },
        {
          id: 'mint-cknft',
          title: 'Mint ckNFT',
          status: 'loading',
          description: 'Minting ckNFT on Internet Computer',
          stage: 'burn'
        },
      ],
    }
  }
};

export const Mobile: Story = {
  args: {
    selectedNFT: mockNFT,
    burnCosts: mockCosts,
    progress: mockProgress
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' }
  }
};

export const Tablet: Story = {
  args: {
    selectedNFT: mockNFT,
    burnCosts: mockCosts,
    progress: mockProgress
  },
  parameters: {
    viewport: { defaultViewport: 'tablet' }
  }
};

// Documentation Stories

export const ExecutionFlow: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Burn Execution Flow</h3>
      
      <div className="space-y-3">
        <div className="border-l-4 border-blue-500 pl-4">
          <h4 className="font-medium">Stage 1: Transfer to Approval Address</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
            <li>User wallet signs Solana transaction</li>
            <li>Transfers NFT from user to orchestrator-controlled address</li>
            <li>Transaction confirmed on Solana blockchain</li>
            <li>Solana signature captured for reference</li>
          </ul>
        </div>

        <div className="border-l-4 border-green-500 pl-4">
          <h4 className="font-medium">Stage 2: Orchestrator Mint</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
            <li>Orchestrator detects NFT at approval address</li>
            <li>Calls icrc99_mint on ckNFT canister</li>
            <li>Spends user's cycles allowance</li>
            <li>Mints ckNFT to user's IC principal</li>
            <li>IC transaction hash captured</li>
          </ul>
        </div>
      </div>
    </div>
  ),
  args: {
    selectedNFT: mockNFT,
    burnCosts: mockCosts,
    progress: mockProgress
  }
};

export const ErrorHandling: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Error Handling & Recovery</h3>
      
      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-red-700">Transfer Failures</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
            <li><strong>User Rejection</strong>: User cancels wallet prompt → Retry transfer</li>
            <li><strong>Insufficient SOL</strong>: Not enough for fees → Add SOL, retry</li>
            <li><strong>Network Error</strong>: RPC timeout → Wait, retry</li>
            <li><strong>Invalid NFT</strong>: Wrong collection → Select correct NFT</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium text-red-700">Mint Failures</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
            <li><strong>Insufficient Cycles</strong>: Allowance expired → Re-approve cycles</li>
            <li><strong>Orchestrator Error</strong>: Canister trapped → Contact support</li>
            <li><strong>Network Congestion</strong>: IC subnet busy → Wait, retry</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium text-blue-700">Recovery Mode</h4>
          <p className="text-sm mt-2">
            If NFT transferred but mint failed, use recovery mode:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm mt-1">
            <li>Enter NFT mint address manually</li>
            <li>Skip transfer step (NFT already at approval address)</li>
            <li>Retry mint operation only</li>
          </ul>
        </div>
      </div>
    </div>
  ),
  args: {
    selectedNFT: mockNFT,
    burnCosts: mockCosts,
    progress: mockProgress
  }
};

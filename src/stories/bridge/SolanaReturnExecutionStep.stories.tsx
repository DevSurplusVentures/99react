import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SolanaReturnExecutionStep } from '../../components/bridge/solana/SolanaReturnExecutionStep';
import type { SolanaReturnCosts } from '../../components/bridge/solana/SolanaReturnCostStep';
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

const mockNFT = {
  canisterId: 'bd3sg-teaaa-aaaaa-qaaba-cai',
  tokenId: 12345n
};

const mockCosts: SolanaReturnCosts = {
  castCycleCost: 2_500_000_000_000n,
  solanaTransferFee: 5000n,
  castSignerFundingRequired: 0n,
  totalSolCost: 5000n,
  castSignerAddress: 'CastSignXYZ123456789abcdefghijklmnopqrstuvwxyz',
  castSignerBalance: 20_000_000n,
  needsCastSignerFunding: false,
  ckNFTCanisterId: Principal.fromText('bd3sg-teaaa-aaaaa-qaaba-cai'),
  tokenId: 12345n,
  nativeChain: { Solana: [{ Devnet: null }] },
  nativeContract: 'J1S9H3QjnRtBbbuD4HjPV6RpRhwuk4zKbxsnCHuTgh9w'
};

const mockProgress: BridgeProgress = {
  id: 'return-progress-1',
  direction: 'ic-to-evm' as const,
  currentStep: 1,
  totalSteps: 2,
  isComplete: false,
  startTime: Date.now(),
  stages: [],
  steps: [
    {
      id: 'cast-cknft',
      title: 'Cast ckNFT',
      status: 'pending',
      description: 'Calling icrc99_cast on ckNFT canister',
      stage: 'return'
    },
    {
      id: 'transfer-on-solana',
      title: 'Transfer on Solana',
      status: 'pending',
      description: 'Transferring NFT from cast signer to user wallet',
      stage: 'return'
    },
  ],
};

const meta = {
  title: 'Bridge/SolanaReturnExecutionStep',
  component: SolanaReturnExecutionStep,
  decorators: [withProviders],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## SolanaReturnExecutionStep Component

Executes the return (cast) process: ckNFT → Solana NFT.

### Execution Flow

**Stage 1: Cast ckNFT**
- User calls icrc99_cast on ckNFT canister
- Spends approved cycles (~2.5T)
- Canister instructs orchestrator to create Solana NFT

**Stage 2: Solana Transfer**
- Orchestrator's cast signer executes Solana transaction
- Creates/transfers NFT to user's Solana wallet
- Transaction confirmed on Solana blockchain

### Dual Transaction Model

Unlike burn (user signs Solana), return has:
1. **IC Transaction**: User calls icrc99_cast
2. **Solana Transaction**: Orchestrator signs (cast signer)

User only signs IC transaction. Orchestrator handles Solana.
        `,
      },
    },
  },
  argTypes: {
    selectedNFT: {
      description: 'ckNFT to return',
      control: { type: 'object' }
    },
    returnCosts: {
      description: 'Calculated return costs',
      control: { type: 'object' }
    },
    targetSolanaAddress: {
      description: 'Destination Solana address',
      control: { type: 'text' }
    },
    progress: {
      description: 'Progress state',
      control: { type: 'object' }
    },
    onProgressUpdate: {
      description: 'Progress update callback',
      action: 'progress updated'
    },
    onComplete: {
      description: 'Completion callback',
      action: 'return complete'
    },
    onError: {
      description: 'Error callback',
      action: 'error occurred'
    }
  },
  args: {
    targetSolanaAddress: '9Xy5AAAA1234567890abcdefghijklmnopqrstuvwxyz123',
    onProgressUpdate: fn(),
    onComplete: fn(),
    onError: fn()
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SolanaReturnExecutionStep>;

export default meta;
type Story = StoryObj<typeof meta>;

// ===== DOCUMENTATION =====

export const Docs: Story = {
  name: '📖 Documentation',
  args: {
    selectedNFT: mockNFT,
    returnCosts: mockCosts,
    progress: mockProgress
  },
  decorators: [],
  parameters: {
    docs: {
      page: () => (
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">SolanaReturnExecutionStep Component</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              The <code>SolanaReturnExecutionStep</code> executes the return workflow for sending ckNFTs 
              back to Solana with cycles approval and cast signer operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">🎯 Primary Purpose</h2>
              <ul className="space-y-2 text-blue-800">
                <li>• Approve cycles for cast operation</li>
                <li>• Fund cast signer with SOL</li>
                <li>• Execute IC cast transaction</li>
                <li>• Transfer NFT back to user on Solana</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-3">✨ Key Features</h2>
              <ul className="space-y-2 text-green-800">
                <li>• Cast signer funding detection</li>
                <li>• Real-time progress tracking</li>
                <li>• Transaction link generation</li>
                <li>• Error recovery support</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🔄 Return Workflow</h2>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-purple-300">
                <div className="font-medium text-gray-900 mb-2">1️⃣ Approve Cycles</div>
                <div className="text-sm text-gray-700">
                  ICRC-2 approval (~2.5T cycles) for ckNFT canister to execute cast
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-orange-300">
                <div className="font-medium text-gray-900 mb-2">2️⃣ Fund Cast Signer</div>
                <div className="text-sm text-gray-700">
                  One-time SOL funding (~0.01 SOL) to cast signer address for Solana tx fees
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-blue-300">
                <div className="font-medium text-gray-900 mb-2">3️⃣ Execute Cast</div>
                <div className="text-sm text-gray-700">
                  ckNFT canister calls orchestrator to transfer NFT from custody to user on Solana
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-green-300">
                <div className="font-medium text-gray-900 mb-2">4️⃣ Complete</div>
                <div className="text-sm text-gray-700">
                  NFT back in user's Solana wallet, ckNFT burned/locked on IC
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">🤖 Cast Signer Role</h2>
            <div className="space-y-3 text-purple-800">
              <p><strong>Purpose:</strong> Orchestrator-controlled Solana address that executes transfer</p>
              <p><strong>Receives:</strong> NFT from custody (approval address)</p>
              <p><strong>Transfers To:</strong> User's Solana wallet address</p>
              <p><strong>Funding:</strong> One-time ~0.01 SOL for transaction fees</p>
              <p><strong>Reuse:</strong> Same cast signer can be reused for future returns</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-amber-900 mb-4">💰 Cost Breakdown</h2>
            <div className="space-y-3 text-amber-800">
              <div className="bg-white rounded p-3">
                <strong>Cycles (IC):</strong> ~2.5T cycles (~$3.25) - Cast operation cost
              </div>
              <div className="bg-white rounded p-3">
                <strong>SOL (Solana):</strong> ~0.010005 SOL (~$1.00) - Cast signer + transfer fees
              </div>
              <p className="text-sm mt-2">
                Total: ~$4.25 to return ckNFT back to Solana (cheaper than initial import due to no collection deployment)
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
    returnCosts: mockCosts,
    progress: mockProgress
  },
};

export const CastingStage: Story = {
  args: {
    selectedNFT: mockNFT,
    returnCosts: mockCosts,
    progress: {
      ...mockProgress,
      steps: [
        {
          id: 'cast-cknft',
          title: 'Cast ckNFT',
          status: 'loading',
          description: 'Calling icrc99_cast on ckNFT canister',
          stage: 'return'
        },
        {
          id: 'transfer-on-solana',
          title: 'Transfer on Solana',
          status: 'pending',
          description: 'Waiting for cast to complete',
          stage: 'return'
        },
      ],
    }
  }
};

export const TransferringStage: Story = {
  args: {
    selectedNFT: mockNFT,
    returnCosts: mockCosts,
    progress: {
      ...mockProgress,
      currentStep: 2,
      steps: [
        {
          id: 'cast-cknft',
          title: 'Cast ckNFT',
          status: 'completed',
          description: 'Cast successful',
          txHash: '0xIC123...',
          stage: 'return'
        },
        {
          id: 'transfer-on-solana',
          title: 'Transfer on Solana',
          status: 'loading',
          description: 'Transferring NFT from cast signer to user wallet',
          stage: 'return'
        },
      ],
    }
  }
};

export const CompletedSuccess: Story = {
  args: {
    selectedNFT: mockNFT,
    returnCosts: mockCosts,
    progress: {
      ...mockProgress,
      currentStep: 2,
      isComplete: true,
      steps: [
        {
          id: 'cast-cknft',
          title: 'Cast ckNFT',
          status: 'completed',
          description: 'Cast successful',
          txHash: '0xIC123...',
          stage: 'return'
        },
        {
          id: 'transfer-on-solana',
          title: 'Transfer on Solana',
          status: 'completed',
          description: 'NFT transferred to user wallet',
          txHash: '4ZxH2Vq...',
          stage: 'return'
        },
      ],
    }
  }
};

export const CastError: Story = {
  args: {
    selectedNFT: mockNFT,
    returnCosts: mockCosts,
    progress: {
      ...mockProgress,
      steps: [
        {
          id: 'cast-cknft',
          title: 'Cast ckNFT',
          status: 'failed',
          description: 'Failed to cast ckNFT',
          error: 'Insufficient cycles allowance',
          stage: 'return'
        },
        {
          id: 'transfer-on-solana',
          title: 'Transfer on Solana',
          status: 'pending',
          description: 'Waiting for cast',
          stage: 'return'
        },
      ],
    }
  }
};

export const TransferError: Story = {
  args: {
    selectedNFT: mockNFT,
    returnCosts: mockCosts,
    progress: {
      ...mockProgress,
      currentStep: 2,
      steps: [
        {
          id: 'cast-cknft',
          title: 'Cast ckNFT',
          status: 'completed',
          description: 'Cast successful',
          txHash: '0xIC123...',
          stage: 'return'
        },
        {
          id: 'transfer-on-solana',
          title: 'Transfer on Solana',
          status: 'failed',
          description: 'Failed to transfer on Solana',
          error: 'Cast signer insufficient funds',
          stage: 'return'
        },
      ],
    }
  }
};

export const HighCycleCost: Story = {
  args: {
    selectedNFT: mockNFT,
    returnCosts: {
      ...mockCosts,
      castCycleCost: 5_000_000_000_000n // 5T cycles
    },
    progress: mockProgress
  }
};

export const Mobile: Story = {
  args: {
    selectedNFT: mockNFT,
    returnCosts: mockCosts,
    progress: mockProgress
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' }
  }
};

export const Tablet: Story = {
  args: {
    selectedNFT: mockNFT,
    returnCosts: mockCosts,
    progress: mockProgress
  },
  parameters: {
    viewport: { defaultViewport: 'tablet' }
  }
};

// Documentation Stories

export const DualTransactionModel: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Dual Transaction Model</h3>
      
      <div className="space-y-3">
        <div className="border-l-4 border-blue-500 pl-4">
          <h4 className="font-medium">IC Transaction (User Signs)</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
            <li>User calls icrc99_cast on ckNFT canister</li>
            <li>Spends approved cycles (~2.5T cycles)</li>
            <li>Provides target Solana address</li>
            <li>Canister instructs orchestrator to create Solana NFT</li>
            <li>Transaction confirmed on IC (~2 seconds)</li>
          </ul>
        </div>

        <div className="border-l-4 border-orange-500 pl-4">
          <h4 className="font-medium">Solana Transaction (Orchestrator Signs)</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
            <li>Orchestrator's cast signer executes Solana transaction</li>
            <li>Creates NFT or transfers from custody</li>
            <li>Sends to user's Solana wallet</li>
            <li>Uses pre-funded SOL from cast signer balance</li>
            <li>Transaction confirmed on Solana (~1 second)</li>
          </ul>
        </div>

        <div className="bg-gray-100 p-3 rounded">
          <p className="text-sm font-medium">Key Difference from Burn</p>
          <p className="text-xs text-gray-600 mt-1">
            Burn: User signs Solana transaction<br/>
            Return: Orchestrator signs Solana transaction (cast signer)
          </p>
        </div>
      </div>
    </div>
  ),
  args: {
    selectedNFT: mockNFT,
    returnCosts: mockCosts,
    progress: mockProgress
  }
};

export const ErrorHandling: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Error Handling & Recovery</h3>
      
      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-red-700">Cast Failures (IC Side)</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
            <li><strong>Insufficient Cycles</strong>: Allowance expired → Re-approve cycles</li>
            <li><strong>Invalid NFT</strong>: Token not found → Verify canister + tokenId</li>
            <li><strong>Not Owner</strong>: User doesn't own ckNFT → Check ownership</li>
            <li><strong>Network Error</strong>: IC subnet busy → Wait, retry</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium text-red-700">Transfer Failures (Solana Side)</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
            <li><strong>Cast Signer Low Balance</strong>: Insufficient SOL → Fund cast signer</li>
            <li><strong>Network Congestion</strong>: RPC timeout → Orchestrator retries</li>
            <li><strong>Invalid Address</strong>: Malformed Solana address → Verify target</li>
            <li><strong>Orchestrator Error</strong>: Canister trapped → Contact support</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium text-yellow-700">Partial Completion</h4>
          <p className="text-sm mt-2">
            If cast succeeds but Solana transfer fails:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm mt-1">
            <li>ckNFT already burned on IC (cannot reverse)</li>
            <li>Orchestrator retries Solana transfer automatically</li>
            <li>Monitor transaction via cast signer address</li>
            <li>Contact support if retries fail</li>
          </ul>
        </div>
      </div>
    </div>
  ),
  args: {
    selectedNFT: mockNFT,
    returnCosts: mockCosts,
    progress: mockProgress
  }
};

export const ExecutionFlow: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Return Execution Flow</h3>
      
      <div className="space-y-3">
        <div>
          <h4 className="font-medium">1. Prepare Cast Request</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Create ckNFT actor with authenticated agent</li>
            <li>Build cast request with target Solana address</li>
            <li>Verify cycles allowance is sufficient</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium">2. Execute icrc99_cast</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>User calls icrc99_cast on ckNFT canister</li>
            <li>Canister burns ckNFT (or marks as cast)</li>
            <li>Spends user's cycles allowance (~2.5T)</li>
            <li>Notifies orchestrator to create Solana NFT</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium">3. Orchestrator Cast Execution</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Orchestrator receives cast notification</li>
            <li>Cast signer derives keypair deterministically</li>
            <li>Creates Solana transaction (transfer or mint)</li>
            <li>Signs with cast signer private key</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium">4. Solana Blockchain Confirmation</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Transaction broadcasted to Solana network</li>
            <li>NFT appears in user's Solana wallet</li>
            <li>Transaction signature returned to IC</li>
            <li>User notified of completion</li>
          </ul>
        </div>
      </div>
    </div>
  ),
  args: {
    selectedNFT: mockNFT,
    returnCosts: mockCosts,
    progress: mockProgress
  }
};

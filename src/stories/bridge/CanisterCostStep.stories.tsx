import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { CanisterCostStep } from '../../components/bridge/CanisterCostStep';
import type { SelectedNFT } from '../../components/bridge/NFTSelectionStep';
import type { Network } from '../../declarations/orchestrator/orchestrator.did';
import { Principal } from '@dfinity/principal';

// Mock providers for context
import { IdentityKitProvider } from '@nfid/identitykit/react';
import { IdentityKitAuthType } from '@nfid/identitykit';
import { AgentProvider } from '../../provider/AgentProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@nfid/identitykit/react/styles.css';

// Mock data
const mockSelectedNFTs: SelectedNFT[] = [
  {
    tokenId: '123',
    contractAddress: '0x1234567890123456789012345678901234567890',
    name: 'Cool Ape #123',
    description: 'A very cool ape NFT',
    image: 'https://picsum.photos/400/400?random=123',
    network: 'Ethereum' as Network,
    metadata: {
      name: 'Cool Ape #123',
      description: 'A very cool ape NFT',
      image: 'https://picsum.photos/400/400?random=123',
      attributes: [
        { trait_type: 'Background', value: 'Blue' },
        { trait_type: 'Eyes', value: 'Laser' }
      ]
    }
  }
];

const mockMultipleNFTs: SelectedNFT[] = [
  ...mockSelectedNFTs,
  {
    tokenId: '456',
    contractAddress: '0x1234567890123456789012345678901234567890',
    name: 'Cool Ape #456',
    description: 'Another very cool ape NFT',
    image: 'https://picsum.photos/400/400?random=456',
    network: 'Ethereum' as Network,
    metadata: {
      name: 'Cool Ape #456',
      description: 'Another very cool ape NFT',
      image: 'https://picsum.photos/400/400?random=456',
      attributes: [
        { trait_type: 'Background', value: 'Red' },
        { trait_type: 'Eyes', value: 'Normal' }
      ]
    }
  }
];

// Mock providers wrapper
const MockProviders = ({ children }: { 
  children: React.ReactNode;
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <IdentityKitProvider authType={IdentityKitAuthType.ACCOUNTS}>
        <AgentProvider network="local">
          <div className="max-w-2xl mx-auto p-6 bg-white">
            {children}
          </div>
        </AgentProvider>
      </IdentityKitProvider>
    </QueryClientProvider>
  );
};

const meta: Meta<typeof CanisterCostStep> = {
  title: 'Bridge/CanisterCostStep',
  component: CanisterCostStep,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**CanisterCostStep** handles canister creation costs and management for bridging NFTs to the Internet Computer.

This component manages the complete canister lifecycle including cost estimation, balance verification, approval management, and canister creation. It serves as a critical step in the bridging process by ensuring users have the necessary ckNFT canisters to store their bridged assets.

**Key Features:**
- **Cost Calculation**: Real-time estimation of cycles needed for canister creation
- **Balance Verification**: Checks user's cycles balance against required costs
- **Canister Detection**: Identifies existing canisters to avoid duplicate creation
- **Approval Management**: Handles cycles approval for the orchestrator canister
- **Canister Creation**: Creates new ckNFT canisters with proper metadata setup
- **Metadata Display**: Shows collection information for existing canisters
- **Compact Mode**: Optional condensed view for embedded use cases

**Canister Economics:**
Canisters on the Internet Computer require cycles for computation and storage. This component calculates the exact cost needed to create a ckNFT canister that will store and manage bridged NFTs. Costs are displayed in both cycles and approximate ICP equivalent.

**Usage Flow:**
1. User selects NFTs to bridge
2. Component calculates canister creation costs
3. Checks if canister already exists for the contract
4. Verifies user's cycles balance and existing approvals
5. Guides user through approval process if needed
6. Creates canister with proper collection metadata
7. Provides success confirmation and canister details

**Integration Context:**
Typically used after NFT selection but before actual bridging operations. Integrates with cycles ledger for balance checks, orchestrator for canister creation, and metadata services for collection information.
        `
      }
    }
  },
  decorators: [
    (Story) => (
      <MockProviders>
        <Story />
      </MockProviders>
    ),
  ],
  argTypes: {
    selectedNFTs: {
      description: 'Array of NFTs selected for bridging that determine canister requirements',
      control: { type: 'object' }
    },
    costs: {
      description: 'Current calculated costs in cycles (null when not yet calculated)',
      control: { type: 'object' }
    },
    compact: {
      description: 'Whether to use compact view for cleaner embedded display',
      control: { type: 'boolean' }
    },
    onCostsCalculated: {
      description: 'Callback fired when costs are calculated or updated',
      action: 'costsCalculated'
    }
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CanisterCostStep>;

// ===== DOCUMENTATION =====

export const Docs: Story = {
  name: '📖 Documentation',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetCanisterId: Principal.fromText('2223e-iaaaa-aaaac-awyra-cai'),
    onCostCalculated: (cost) => console.log('Cost calculated:', cost)
  },
  parameters: {
    docs: {
      page: () => (
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">CanisterCostStep Component</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              The <code>CanisterCostStep</code> component manages canister cost calculation and payment approval 
              for NFT bridging operations between EVM networks and Internet Computer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">🎯 Primary Purpose</h2>
              <ul className="space-y-2 text-blue-800">
                <li>• Calculate canister creation and management costs</li>
                <li>• Handle payment approval for cycles spending</li>
                <li>• Validate sufficient balance before operations</li>
                <li>• Provide real-time cost estimates</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-3">✨ Key Features</h2>
              <ul className="space-y-2 text-green-800">
                <li>• Dynamic cost calculation based on NFT count</li>
                <li>• Cycles balance verification</li>
                <li>• Payment approval workflow</li>
                <li>• Error handling and retry mechanisms</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🔄 Integration Flow</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="text-2xl mb-2">1️⃣</div>
                <div className="font-medium text-gray-900">Calculate</div>
                <div className="text-sm text-gray-600">Estimate costs</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="text-2xl mb-2">2️⃣</div>
                <div className="font-medium text-gray-900">Validate</div>
                <div className="text-sm text-gray-600">Check balance</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="text-2xl mb-2">3️⃣</div>
                <div className="font-medium text-gray-900">Approve</div>
                <div className="text-sm text-gray-600">Payment auth</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="text-2xl mb-2">4️⃣</div>
                <div className="font-medium text-gray-900">Proceed</div>
                <div className="text-sm text-gray-600">Ready to bridge</div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-900 mb-4">💡 Usage Tips</h2>
            <div className="space-y-3 text-yellow-800">
              <p><strong>Cost Calculation:</strong> Costs are calculated based on the number of NFTs being bridged and current IC network conditions.</p>
              <p><strong>Balance Management:</strong> Ensure sufficient cycles balance before starting the bridging process.</p>
              <p><strong>Payment Approval:</strong> The component handles ICRC-2 approval transactions for cycles spending.</p>
              <p><strong>Error Recovery:</strong> Built-in retry mechanisms handle temporary network issues gracefully.</p>
            </div>
          </div>
        </div>
      )
    }
  }
};

// ===== BASIC STATES =====

export const Default: Story = {
  name: '🏦 Cost Calculation (Single NFT)',
  args: {
    selectedNFTs: mockSelectedNFTs,
    costs: null, // Will be calculated by the component
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs),
    compact: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Default state showing cost calculation for creating a canister for a single NFT collection.'
      }
    }
  }
};

export const MultipleNFTs: Story = {
  name: '🏦 Cost Calculation (Multiple NFTs)',
  args: {
    selectedNFTs: mockMultipleNFTs,
    costs: null,
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs),
    compact: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Cost calculation for multiple NFTs from the same collection (same canister required).'
      }
    }
  }
};

export const CompactView: Story = {
  name: '📱 Compact Status View',
  args: {
    selectedNFTs: mockSelectedNFTs,
    costs: BigInt('5000000000000'), // 5 trillion cycles
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs),
    compact: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact view for embedded use cases with condensed status display.'
      }
    }
  }
};

// ===== LOADING STATES =====

export const LoadingCalculation: Story = {
  name: '⏳ Loading Cost Calculation',
  args: {
    selectedNFTs: mockSelectedNFTs,
    costs: null,
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs),
    compact: false
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Canister Costs</h3>
          <p className="text-gray-600">
            Review the costs for creating your NFT canisters on the Internet Computer.
          </p>
        </div>

        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading canister information and your balance...</p>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state while calculating costs, checking balance, and querying existing canisters.'
      }
    }
  }
};

// ===== COST DISPLAY STATES =====

export const CostEstimated: Story = {
  name: '💰 Cost Estimated (Sufficient Balance)',
  args: {
    selectedNFTs: mockSelectedNFTs,
    costs: BigInt('5000000000000'), // 5 trillion cycles
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs),
    compact: false
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Canister Costs</h3>
          <p className="text-gray-600">
            Review the costs for creating your NFT canisters on the Internet Computer.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Canister Creation Cost</span>
                <div className="text-right">
                  <span className="font-medium">5.000 TC Cycles</span>
                  <p className="text-xs text-gray-500">≈ 0.005000 ICP</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center border-t pt-3">
                <span className="text-gray-700">Your Cycles Balance</span>
                <div className="text-right">
                  <span className="font-medium text-green-600">10.000 TC Cycles</span>
                  <p className="text-xs text-gray-500">≈ 0.010000 ICP</p>
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="flex items-center text-green-700">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Sufficient balance available</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Existing Approval</span>
                <div className="text-right">
                  <div className="flex items-center text-amber-600">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">Insufficient</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <button className="w-full px-3 py-2 text-sm rounded-md font-medium transition-colors bg-amber-600 text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2">
                  Pre-approve Cycles
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  This will approve 110% of the required amount for future canister creations.
                </p>
              </div>
            </div>
          </div>

          <button className="w-full px-4 py-3 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            Create ckNFT Canister (5.000 TC Cycles)
          </button>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>What are cycles?</strong> Cycles are the unit of payment for computation and storage on the Internet Computer.
              This cost covers creating your NFT canister where your bridged NFTs will be securely stored and managed on-chain.
            </p>
          </div>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Estimated costs displayed with sufficient balance but requiring approval for canister creation.'
      }
    }
  }
};

export const InsufficientBalance: Story = {
  name: '❌ Insufficient Cycles Balance',
  args: {
    selectedNFTs: mockSelectedNFTs,
    costs: BigInt('5000000000000'), // 5 trillion cycles
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs),
    compact: false
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Canister Costs</h3>
          <p className="text-gray-600">
            Review the costs for creating your NFT canisters on the Internet Computer.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Canister Creation Cost</span>
                <div className="text-right">
                  <span className="font-medium">5.000 TC Cycles</span>
                  <p className="text-xs text-gray-500">≈ 0.005000 ICP</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center border-t pt-3">
                <span className="text-gray-700">Your Cycles Balance</span>
                <div className="text-right">
                  <span className="font-medium text-red-600">2.000 TC Cycles</span>
                  <p className="text-xs text-gray-500">≈ 0.002000 ICP</p>
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="space-y-2">
                  <div className="flex items-center text-red-700">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">
                      Insufficient balance (need 3.000 TC more cycles)
                    </span>
                  </div>
                  <p className="text-xs text-red-600">
                    You need to top up your cycles balance before proceeding.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 mb-2">
              <strong>Need more cycles?</strong> You can top up your cycles balance by:
            </p>
            <ul className="text-xs text-amber-700 space-y-1 ml-4">
              <li>• Converting ICP to cycles through the NNS</li>
              <li>• Using a cycles wallet or faucet</li>
              <li>• Having someone transfer cycles to your account</li>
            </ul>
          </div>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'State when user has insufficient cycles balance with guidance on how to top up.'
      }
    }
  }
};

// ===== APPROVAL STATES =====

export const ApprovalRequired: Story = {
  name: '✋ Approval Required',
  args: {
    selectedNFTs: mockSelectedNFTs,
    costs: BigInt('5000000000000'),
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs),
    compact: false
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Canister Costs</h3>
          <p className="text-gray-600">
            Review the costs for creating your NFT canisters on the Internet Computer.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Existing Approval</span>
                <div className="text-right">
                  <div className="flex items-center text-red-600">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">None</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <button className="w-full px-3 py-2 text-sm rounded-md font-medium transition-colors bg-amber-600 text-white hover:bg-amber-700">
                  Pre-approve Cycles
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  This will approve 110% of the required amount for future canister creations.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Approval Required:</strong> You need to approve the orchestrator to spend cycles on your behalf 
              before creating the canister. This is a one-time setup for multiple canister creations.
            </p>
          </div>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'State showing required approval step before canister creation can proceed.'
      }
    }
  }
};

export const ApprovalInProgress: Story = {
  name: '⏳ Processing Approval',
  args: {
    selectedNFTs: mockSelectedNFTs,
    costs: BigInt('5000000000000'),
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs),
    compact: false
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Canister Costs</h3>
          <p className="text-gray-600">
            Review the costs for creating your NFT canisters on the Internet Computer.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Existing Approval</span>
                <div className="text-right">
                  <span className="text-gray-500">Processing...</span>
                </div>
              </div>

              <div className="border-t pt-3">
                <button 
                  disabled 
                  className="w-full px-3 py-2 text-sm rounded-md font-medium transition-colors bg-gray-300 text-gray-500 cursor-not-allowed"
                >
                  Approving...
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  Processing approval transaction...
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Processing Approval:</strong> Please wait while the approval transaction is confirmed on the blockchain.
              This may take a few moments.
            </p>
          </div>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'State during approval transaction processing with disabled interface.'
      }
    }
  }
};

export const ApprovalApproved: Story = {
  name: '✅ Cycles Approved',
  args: {
    selectedNFTs: mockSelectedNFTs,
    costs: BigInt('5000000000000'),
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs),
    compact: false
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Canister Costs</h3>
          <p className="text-gray-600">
            Review the costs for creating your NFT canisters on the Internet Computer.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Existing Approval</span>
                <div className="text-right">
                  <div className="flex items-center text-green-600">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">Approved</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-600 border-t pt-2">
                <div className="flex justify-between">
                  <span>Current Allowance:</span>
                  <span className="font-mono">5.500 TC Cycles</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Expires:</span>
                  <span className="font-mono">12/25/2024, 2:30:15 PM</span>
                </div>
              </div>
            </div>
          </div>

          <button className="w-full px-4 py-3 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700">
            Create ckNFT Canister (5.000 TC Cycles)
          </button>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'State with successful approval showing allowance details and ready to create canister.'
      }
    }
  }
};

// ===== CANISTER STATES =====

export const CanisterExists: Story = {
  name: '✅ Canister Already Exists',
  args: {
    selectedNFTs: mockSelectedNFTs,
    costs: BigInt('5000000000000'),
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs),
    compact: false
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Canister Costs</h3>
          <p className="text-gray-600">
            Review the costs for creating your NFT canisters on the Internet Computer.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-green-800 mb-1">
                  ckNFT Canister Already Exists
                </h4>
                <p className="text-sm text-green-700 mb-2">
                  A canister for this contract already exists on the Internet Computer.
                </p>
                <p className="text-xs text-green-600 font-mono mb-3">
                  Canister ID: 2223e-iaaaa-aaaac-awyra-cai
                </p>
                
                <div className="mt-2 p-3 bg-green-100 border border-green-200 rounded text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <span className="font-medium text-green-800">Name:</span>
                      <span className="ml-1 text-green-700">Cool Apes Collection</span>
                    </div>
                    <div>
                      <span className="font-medium text-green-800">Symbol:</span>
                      <span className="ml-1 text-green-700">COOLAPES</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-medium text-green-800">Description:</span>
                      <p className="ml-1 text-green-700 text-xs mt-1">A collection of cool apes bridged from Ethereum</p>
                    </div>
                    <div>
                      <span className="font-medium text-green-800">Total Supply:</span>
                      <span className="ml-1 text-green-700">1,234</span>
                    </div>
                    <div>
                      <span className="font-medium text-green-800">Supply Cap:</span>
                      <span className="ml-1 text-green-700">10,000</span>
                    </div>
                    <div>
                      <span className="font-medium text-green-800">Royalties:</span>
                      <span className="ml-1 text-green-700">2.50%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>No additional costs required!</strong> Since the canister already exists, 
              you can proceed directly to bridge your NFTs without paying canister creation fees.
            </p>
          </div>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'State when canister already exists showing collection metadata and no additional costs required.'
      }
    }
  }
};

export const CanisterExistsNoMetadata: Story = {
  name: '⚠️ Canister Exists (No Metadata)',
  args: {
    selectedNFTs: mockSelectedNFTs,
    costs: BigInt('5000000000000'),
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs),
    compact: false
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Canister Costs</h3>
          <p className="text-gray-600">
            Review the costs for creating your NFT canisters on the Internet Computer.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-green-800 mb-1">
                  ckNFT Canister Already Exists
                </h4>
                <p className="text-sm text-green-700 mb-2">
                  A canister for this contract already exists on the Internet Computer.
                </p>
                <p className="text-xs text-green-600 font-mono mb-3">
                  Canister ID: 2223e-iaaaa-aaaac-awyra-cai
                </p>
                
                <div className="mt-2 p-3 bg-green-100 border border-green-200 rounded text-sm">
                  <div className="text-sm text-amber-700 mb-2">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">Canister Metadata Not Yet Initialized</span>
                    </div>
                    <p className="text-xs text-amber-600 mt-1 ml-6">
                      This canister exists but its collection metadata hasn't been set up yet. 
                      The metadata will be populated during the first NFT bridging operation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'State when canister exists but metadata has not been initialized yet.'
      }
    }
  }
};

// ===== CREATION STATES =====

export const CreatingCanister: Story = {
  name: '⏳ Creating Canister',
  args: {
    selectedNFTs: mockSelectedNFTs,
    costs: BigInt('5000000000000'),
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs),
    compact: false
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Canister Costs</h3>
          <p className="text-gray-600">
            Review the costs for creating your NFT canisters on the Internet Computer.
          </p>
        </div>

        <div className="space-y-4">
          <button 
            disabled 
            className="w-full px-4 py-3 rounded-lg font-medium transition-colors bg-gray-300 text-gray-500 cursor-not-allowed"
          >
            <div className="flex items-center justify-center">
              <div className="animate-spin w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full mr-2"></div>
              Creating Canister...
            </div>
          </button>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Creating Canister:</strong> Your ckNFT canister is being created on the Internet Computer. 
              This process may take a few moments to complete.
            </p>
          </div>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'State during canister creation process with disabled interface and progress indication.'
      }
    }
  }
};

export const CanisterCreated: Story = {
  name: '🎉 Canister Created Successfully',
  args: {
    selectedNFTs: mockSelectedNFTs,
    costs: BigInt('5000000000000'),
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs),
    compact: false
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Canister Costs</h3>
          <p className="text-gray-600">
            Review the costs for creating your NFT canisters on the Internet Computer.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✅ Canister created successfully! Refreshing canister information...
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Success!</strong> Your ckNFT canister has been created and is ready to receive bridged NFTs.
              The canister will automatically be configured with your collection metadata.
            </p>
          </div>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Success state immediately after canister creation showing confirmation message.'
      }
    }
  }
};

// ===== ERROR STATES =====

export const CreationError: Story = {
  name: '❌ Canister Creation Failed',
  args: {
    selectedNFTs: mockSelectedNFTs,
    costs: BigInt('5000000000000'),
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs),
    compact: false
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Canister Costs</h3>
          <p className="text-gray-600">
            Review the costs for creating your NFT canisters on the Internet Computer.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              Canister creation failed: Insufficient cycles in account after fee deduction
            </p>
          </div>

          <button className="w-full px-4 py-3 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700">
            Retry Create ckNFT Canister (5.000 TC Cycles)
          </button>
          
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 mb-2">
              <strong>Creation failed:</strong> This can happen if your cycles balance changed during the creation process 
              or if network fees were higher than estimated.
            </p>
            <p className="text-xs text-amber-700">
              Please check your balance and try again. You may need to approve additional cycles.
            </p>
          </div>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when canister creation fails with specific error message and retry option.'
      }
    }
  }
};

export const LoadingError: Story = {
  name: '⚠️ Cost Calculation Error',
  args: {
    selectedNFTs: mockSelectedNFTs,
    costs: null,
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs),
    compact: false
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Canister Costs</h3>
          <p className="text-gray-600">
            Review the costs for creating your NFT canisters on the Internet Computer.
          </p>
        </div>

        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            Error loading information: Failed to fetch canister creation costs from orchestrator
          </p>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800 mb-2">
            <strong>Unable to calculate costs:</strong> There was an error connecting to the orchestrator service.
          </p>
          <p className="text-xs text-amber-700">
            Please check your connection and try refreshing the page. If the problem persists, 
            the service may be temporarily unavailable.
          </p>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when cost calculation fails with network or service issues.'
      }
    }
  }
};

// ===== EMPTY STATES =====

export const NoNFTsSelected: Story = {
  name: '📋 No NFTs Selected',
  args: {
    selectedNFTs: [],
    costs: null,
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs),
    compact: false
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Canister Costs</h3>
          <p className="text-gray-600">
            Review the costs for creating your NFT canisters on the Internet Computer.
          </p>
        </div>

        <div className="p-6 text-center border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">Select NFTs to see canister creation costs</p>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state when no NFTs are selected for bridging.'
      }
    }
  }
};

// ===== COMPACT STATES =====

export const CompactExistingCanister: Story = {
  name: '📱 Compact: Canister Ready',
  args: {
    selectedNFTs: mockSelectedNFTs,
    costs: BigInt('5000000000000'),
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs),
    compact: true
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Canister Status</h3>
          <p className="text-gray-600">
            Current status of your NFT canister on the Internet Computer.
          </p>
        </div>

        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-green-800">
                ✅ ckNFT Canister Ready
              </h4>
              <p className="text-xs text-green-600 font-mono mt-1">
                2223e-iaaaa-aaaac-awyra-cai
              </p>
            </div>
          </div>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact view showing canister ready state with minimal information.'
      }
    }
  }
};

export const CompactCreationNeeded: Story = {
  name: '📱 Compact: Creation Needed',
  args: {
    selectedNFTs: mockSelectedNFTs,
    costs: BigInt('5000000000000'),
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs),
    compact: true
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Canister Status</h3>
          <p className="text-gray-600">
            Current status of your NFT canister on the Internet Computer.
          </p>
        </div>

        <div className="space-y-3">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Canister Creation</span>
              <div className="text-right">
                <span className="text-sm font-medium">5.000 TC</span>
                <p className="text-xs text-gray-500">≈ 0.005000 ICP</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-2 pt-2 border-t">
              <span className="text-sm text-gray-700">Your Balance</span>
              <div className="text-right">
                <span className="text-sm font-medium text-green-600">10.000 TC</span>
                <p className="text-xs text-gray-500">≈ 0.010000 ICP</p>
              </div>
            </div>
          </div>

          <button className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700">
            Create Canister (5.000 TC)
          </button>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact view showing canister creation needed with costs and balance.'
      }
    }
  }
};
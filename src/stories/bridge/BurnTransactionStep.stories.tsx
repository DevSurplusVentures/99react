import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { BurnTransactionStep } from '../../components/bridge/BurnTransactionStep';
import type { SelectedNFT } from '../../components/bridge/NFTSelectionStep';
import type { BurnCosts } from '../../components/bridge/BurnCostStep';
import type { Network } from '../../declarations/orchestrator/orchestrator.did';
import { Principal } from '@dfinity/principal';

// Mock providers for context
import { IdentityKitProvider } from '@nfid/identitykit/react';
import { IdentityKitAuthType } from '@nfid/identitykit';
import { AgentProvider } from '../../provider/AgentProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@nfid/identitykit/react/styles.css';

// Mock data
const mockPrincipal = Principal.fromText('2223e-iaaaa-aaaac-awyra-cai');

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
  },
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

const mockBurnCosts: BurnCosts = {
  cyclesCost: BigInt('5000000000000'), // 5T cycles
  ethCost: BigInt('50000000000000000'), // 0.05 ETH
  gasEstimate: BigInt('300000'),
  userEthBalance: BigInt('100000000000000000'), // 0.1 ETH (sufficient)
  hasInsufficientEthBalance: false,
  nftDetails: [
    {
      nft: mockSelectedNFTs[0],
      cyclesCost: BigInt('2500000000000'), // 2.5T cycles
      burnFundingAddress: '0xdead000000000000000000000000000000000001'
    },
    {
      nft: mockSelectedNFTs[1],
      cyclesCost: BigInt('2500000000000'), // 2.5T cycles
      burnFundingAddress: '0xdead000000000000000000000000000000000002'
    }
  ]
};

const mockBurnCostsInsufficientEth: BurnCosts = {
  ...mockBurnCosts,
  userEthBalance: BigInt('10000000000000000'), // 0.01 ETH (insufficient)
  hasInsufficientEthBalance: true
};

const mockTargetNetwork: Network = 'Internet Computer' as Network;

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

const meta: Meta<typeof BurnTransactionStep> = {
  title: 'Bridge/BurnTransactionStep',
  component: BurnTransactionStep,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**BurnTransactionStep** handles the complete burn process execution for bridging NFTs from EVM chains to the Internet Computer.

This component manages a complex multi-step transaction flow:
1. **EVM Transfer Phase**: Transfers cast NFTs to burn addresses on the remote EVM chain
2. **IC Remint Phase**: Mints corresponding ckNFTs on the Internet Computer
3. **Progress Tracking**: Real-time progress with status indicators and transaction links
4. **Error Recovery**: Comprehensive error handling with troubleshooting guidance

**Key Features:**
- Multi-NFT batch processing with individual progress tracking
- Real-time transaction monitoring with explorer links
- Gas estimation and balance validation
- Comprehensive error handling and recovery options
- Irreversible burn warning and confirmation flow
- Integration with MetaMask for EVM operations and IC mutations for minting

**Transaction Flow:**
1. User confirms burn execution with cost breakdown
2. Component transfers each NFT to its calculated burn address
3. Waits for EVM transaction confirmations
4. Executes IC remint operations for each burned NFT
5. Provides completion summary with transaction references

**Usage Context:**
This is typically the final step in the burn flow, following cost calculation and approval. It requires authenticated users, connected MetaMask wallets, and pre-approved cycles for IC operations.
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
      description: 'Array of NFTs selected for burning',
      control: { type: 'object' }
    },
    targetNetwork: {
      description: 'Target network for the bridge operation',
      control: { type: 'select' },
      options: ['Internet Computer', 'Ethereum', 'Polygon']
    },
    costs: {
      description: 'Calculated burn costs and gas estimates',
      control: { type: 'object' }
    },
    onTransactionComplete: {
      description: 'Callback fired when transaction completes successfully',
      action: 'transactionComplete'
    },
    onTransactionError: {
      description: 'Callback fired when transaction fails',
      action: 'transactionError'
    },
    onBack: {
      description: 'Optional callback for back navigation',
      action: 'back'
    }
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof BurnTransactionStep>;

// ===== DOCUMENTATION =====

export const Docs: Story = {
  name: '📖 Documentation',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    targetCanisterId: mockPrincipal,
    burnCosts: mockBurnCosts,
    onBurnComplete: (results) => console.log('Burn complete:', results),
    onBack: () => console.log('Back to previous step')
  },
  parameters: {
    docs: {
      page: () => (
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">BurnTransactionStep Component</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              The <code>BurnTransactionStep</code> component manages the execution of burn transactions 
              for transferring NFTs from EVM networks to Internet Computer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">🎯 Primary Purpose</h2>
              <ul className="space-y-2 text-blue-800">
                <li>• Execute NFT burn transactions on EVM networks</li>
                <li>• Monitor transaction progress and confirmations</li>
                <li>• Handle transaction failures and retries</li>
                <li>• Provide real-time status updates to users</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-3">✨ Key Features</h2>
              <ul className="space-y-2 text-green-800">
                <li>• Multi-NFT batch transaction support</li>
                <li>• Real-time transaction monitoring</li>
                <li>• Network-specific gas optimization</li>
                <li>• Comprehensive error handling</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🔥 Transaction Flow</h2>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-center">
              <div className="bg-white rounded-lg p-3 border border-gray-300">
                <div className="text-xl mb-1">1️⃣</div>
                <div className="text-sm font-medium text-gray-900">Prepare</div>
                <div className="text-xs text-gray-600">Setup transaction</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-300">
                <div className="text-xl mb-1">2️⃣</div>
                <div className="text-sm font-medium text-gray-900">Execute</div>
                <div className="text-xs text-gray-600">Submit to network</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-300">
                <div className="text-xl mb-1">3️⃣</div>
                <div className="text-sm font-medium text-gray-900">Monitor</div>
                <div className="text-xs text-gray-600">Track confirmations</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-300">
                <div className="text-xl mb-1">4️⃣</div>
                <div className="text-sm font-medium text-gray-900">Verify</div>
                <div className="text-xs text-gray-600">Confirm burn</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-300">
                <div className="text-xl mb-1">5️⃣</div>
                <div className="text-sm font-medium text-gray-900">Complete</div>
                <div className="text-xs text-gray-600">Ready for IC mint</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-red-900 mb-3">🔥 Burn Process</h2>
              <div className="space-y-2 text-red-800">
                <p><strong>Transaction Execution:</strong> NFTs are burned on the source EVM network</p>
                <p><strong>Proof Generation:</strong> Transaction receipt provides burn proof</p>
                <p><strong>Cross-Chain Signal:</strong> Burn event triggers IC minting process</p>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h2 className="text-xl font-semibent text-purple-900 mb-3">📊 Progress Tracking</h2>
              <div className="space-y-2 text-purple-800">
                <p><strong>Real-Time Updates:</strong> Live transaction status monitoring</p>
                <p><strong>Confirmation Counts:</strong> Track network confirmations</p>
                <p><strong>Error Recovery:</strong> Automatic retry mechanisms</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-900 mb-4">💡 Usage Context</h2>
            <div className="space-y-3 text-yellow-800">
              <p><strong>Bridge Integration:</strong> Final step in EVM to IC bridging process</p>
              <p><strong>Batch Operations:</strong> Supports burning multiple NFTs in single transaction</p>
              <p><strong>Network Support:</strong> Works with all major EVM networks (Ethereum, Polygon, BSC, etc.)</p>
              <p><strong>Error Handling:</strong> Comprehensive error states with user-friendly recovery options</p>
            </div>
          </div>
        </div>
      )
    }
  }
};

// ===== BASIC STATES =====

export const Default: Story = {
  name: '🔥 Ready to Execute (Single NFT)',
  args: {
    selectedNFTs: [mockSelectedNFTs[0]],
    targetNetwork: mockTargetNetwork,
    costs: {
      ...mockBurnCosts,
      nftDetails: mockBurnCosts.nftDetails ? [mockBurnCosts.nftDetails[0]] : undefined
    },
    onTransactionComplete: (txHash) => console.log('Transaction completed:', txHash),
    onTransactionError: (error) => console.error('Transaction error:', error),
    onBack: () => console.log('Back to costs')
  },
  parameters: {
    docs: {
      description: {
        story: 'Ready state for executing a single NFT burn with all costs calculated and approved.'
      }
    }
  }
};

export const MultipleNFTs: Story = {
  name: '🔥 Ready to Execute (Multiple NFTs)',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    costs: mockBurnCosts,
    onTransactionComplete: (txHash) => console.log('Transaction completed:', txHash),
    onTransactionError: (error) => console.error('Transaction error:', error),
    onBack: () => console.log('Back to costs')
  },
  parameters: {
    docs: {
      description: {
        story: 'Ready state for executing multiple NFT burns in a batch operation.'
      }
    }
  }
};

export const InsufficientBalance: Story = {
  name: '❌ Insufficient ETH Balance',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    costs: mockBurnCostsInsufficientEth,
    onTransactionComplete: (txHash) => console.log('Transaction completed:', txHash),
    onTransactionError: (error) => console.error('Transaction error:', error),
    onBack: () => console.log('Back to costs')
  },
  parameters: {
    docs: {
      description: {
        story: 'Blocked state when user has insufficient ETH balance for gas fees.'
      }
    }
  }
};

// ===== TRANSACTION PROGRESS STATES =====

export const TransferringFirst: Story = {
  name: '⏳ Transferring First NFT',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    costs: mockBurnCosts,
    onTransactionComplete: (txHash) => console.log('Transaction completed:', txHash),
    onTransactionError: (error) => console.error('Transaction error:', error),
    onBack: () => console.log('Back to costs')
  },
  render: (args) => {
    // Create component with preset state
    const Component = () => {
      const [mockState] = React.useState({
        status: 'transferring' as const,
        currentStep: 'Transferring NFT 1/2 to burn address...',
        evmTxHashes: [],
        mintResults: [],
        currentNFTIndex: 0,
        totalNFTs: 2
      });

      // Mock the component's internal state by using a wrapper
      return (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Execute Complete Burn Process</h3>
            <p className="text-gray-600">
              Transfer your cast NFTs to burn addresses and remint them as ckNFTs on the Internet Computer.
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center mb-3">
              <div className="w-5 h-5 animate-spin border-2 border-blue-600 border-t-transparent rounded-full mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">
                  Processing NFT {mockState.currentNFTIndex + 1} of {mockState.totalNFTs}
                </p>
                <p className="text-xs text-blue-600">{mockState.currentStep}</p>
              </div>
            </div>
            
            <div className="w-full bg-blue-100 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(mockState.currentNFTIndex / mockState.totalNFTs) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>⚠️ Important:</strong> This process will permanently transfer your cast NFTs to burn addresses 
              on the remote EVM chain and remint them as ckNFTs on the Internet Computer.
            </p>
          </div>
        </div>
      );
    };

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Active state showing first NFT being transferred to burn address with progress indicator.'
      }
    }
  }
};

export const ConfirmingTransactions: Story = {
  name: '⏳ Confirming EVM Transactions',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    costs: mockBurnCosts,
    onTransactionComplete: (txHash) => console.log('Transaction completed:', txHash),
    onTransactionError: (error) => console.error('Transaction error:', error),
    onBack: () => console.log('Back to costs')
  },
  render: (args) => {
    const Component = () => {
      const mockTxHashes = [
        '0xa1b2c3d4e5f6789012345678901234567890abcdef123456789012345678901234',
        '0xb2c3d4e5f6789012345678901234567890abcdef123456789012345678901234a'
      ];

      return (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Execute Complete Burn Process</h3>
            <p className="text-gray-600">
              Transfer your cast NFTs to burn addresses and remint them as ckNFTs on the Internet Computer.
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center mb-3">
              <div className="w-5 h-5 animate-spin border-2 border-blue-600 border-t-transparent rounded-full mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">
                  Processing NFT 2 of 2
                </p>
                <p className="text-xs text-blue-600">Waiting for NFT 2/2 transfer confirmation...</p>
              </div>
            </div>
            
            <div className="w-full bg-blue-100 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: '85%' }} />
            </div>
            
            <div className="mt-3">
              <p className="text-xs text-blue-700 mb-1">EVM Transactions:</p>
              <div className="space-y-1">
                {mockTxHashes.map((txHash, index) => (
                  <a
                    key={txHash}
                    href={`https://etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-xs text-blue-700 hover:text-blue-800"
                  >
                    NFT {index + 1}: {txHash.slice(0, 8)}...{txHash.slice(-6)}
                    <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    };

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Confirmation phase showing EVM transactions waiting for blockchain confirmation with explorer links.'
      }
    }
  }
};

export const RemintingOnIC: Story = {
  name: '⏳ Reminting on Internet Computer',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    costs: mockBurnCosts,
    onTransactionComplete: (txHash) => console.log('Transaction completed:', txHash),
    onTransactionError: (error) => console.error('Transaction error:', error),
    onBack: () => console.log('Back to costs')
  },
  render: (args) => {
    const Component = () => {
      const mockTxHashes = [
        '0xa1b2c3d4e5f6789012345678901234567890abcdef123456789012345678901234',
        '0xb2c3d4e5f6789012345678901234567890abcdef123456789012345678901234a'
      ];

      return (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Execute Complete Burn Process</h3>
            <p className="text-gray-600">
              Transfer your cast NFTs to burn addresses and remint them as ckNFTs on the Internet Computer.
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center mb-3">
              <div className="w-5 h-5 animate-spin border-2 border-blue-600 border-t-transparent rounded-full mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">
                  Processing NFT 2 of 2
                </p>
                <p className="text-xs text-blue-600">Reminting ckNFT 2/2 on IC...</p>
              </div>
            </div>
            
            <div className="w-full bg-blue-100 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: '95%' }} />
            </div>
            
            <div className="mt-3">
              <p className="text-xs text-blue-700 mb-1">EVM Transactions:</p>
              <div className="space-y-1">
                {mockTxHashes.map((txHash, index) => (
                  <a
                    key={txHash}
                    href={`https://etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-xs text-blue-700 hover:text-blue-800"
                  >
                    NFT {index + 1}: {txHash.slice(0, 8)}...{txHash.slice(-6)} ✅
                    <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    };

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Final phase showing IC remint operations in progress after successful EVM transfers.'
      }
    }
  }
};

// ===== COMPLETION STATES =====

export const Completed: Story = {
  name: '✅ Burn Process Completed',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    costs: mockBurnCosts,
    onTransactionComplete: (txHash) => console.log('Transaction completed:', txHash),
    onTransactionError: (error) => console.error('Transaction error:', error),
    onBack: () => console.log('Back to costs')
  },
  render: (args) => {
    const Component = () => {
      const mockTxHashes = [
        '0xa1b2c3d4e5f6789012345678901234567890abcdef123456789012345678901234',
        '0xb2c3d4e5f6789012345678901234567890abcdef123456789012345678901234a'
      ];

      return (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Execute Complete Burn Process</h3>
            <p className="text-gray-600">
              Transfer your cast NFTs to burn addresses and remint them as ckNFTs on the Internet Computer.
            </p>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center mb-3">
              <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-800">🎉 Burn Process Completed Successfully!</p>
                <p className="text-xs text-green-600">
                  All 2 NFTs burned and reminted as ckNFTs on IC
                </p>
              </div>
            </div>
            
            <div className="mt-3 space-y-2">
              <p className="text-xs text-green-700 font-medium">Process Summary:</p>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-green-600">EVM Transfers:</span>
                  <span className="ml-1 text-green-800">2 completed</span>
                </div>
                <div>
                  <span className="text-green-600">IC Remints:</span>
                  <span className="ml-1 text-green-800">2 completed</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <button className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Costs
            </button>

            <a
              href={`https://etherscan.io/tx/${mockTxHashes[0]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              View on Etherscan
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      );
    };

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Success state showing completed burn process with summary and transaction explorer link.'
      }
    }
  }
};

// ===== ERROR STATES =====

export const TransactionRejected: Story = {
  name: '❌ User Rejected Transaction',
  args: {
    selectedNFTs: [mockSelectedNFTs[0]],
    targetNetwork: mockTargetNetwork,
    costs: {
      ...mockBurnCosts,
      nftDetails: mockBurnCosts.nftDetails ? [mockBurnCosts.nftDetails[0]] : undefined
    },
    onTransactionComplete: (txHash) => console.log('Transaction completed:', txHash),
    onTransactionError: (error) => console.error('Transaction error:', error),
    onBack: () => console.log('Back to costs')
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Execute Complete Burn Process</h3>
          <p className="text-gray-600">
            Transfer your cast NFTs to burn addresses and remint them as ckNFTs on the Internet Computer.
          </p>
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L5.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Burn Process Failed</p>
                <p className="text-xs text-red-600 mt-1">Transaction rejected by user</p>
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-800 mb-2">Troubleshooting Tips:</p>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li>Check if you have sufficient ETH for gas fees in your wallet</li>
              <li>Verify that your cycles allowance hasn't expired</li>
              <li>Ensure MetaMask is connected and on the correct network</li>
              <li>Try refreshing costs if gas prices have changed significantly</li>
              <li>Check if the NFT is still in your wallet (not already transferred)</li>
            </ul>
            <p className="text-xs text-blue-600 mt-2">
              Use the "Back to Costs" button to recalculate costs or approve new allowances.
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <button className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Costs
          </button>

          <div className="flex space-x-2">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              Back to Costs
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium">
              Retry Burn
            </button>
          </div>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when user rejects the MetaMask transaction with recovery options.'
      }
    }
  }
};

export const InsufficientGas: Story = {
  name: '❌ Insufficient Gas Fees',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    costs: mockBurnCosts,
    onTransactionComplete: (txHash) => console.log('Transaction completed:', txHash),
    onTransactionError: (error) => console.error('Transaction error:', error),
    onBack: () => console.log('Back to costs')
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Execute Complete Burn Process</h3>
          <p className="text-gray-600">
            Transfer your cast NFTs to burn addresses and remint them as ckNFTs on the Internet Computer.
          </p>
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L5.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Burn Process Failed</p>
                <p className="text-xs text-red-600 mt-1">Insufficient funds for gas fees</p>
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-800 mb-2">Troubleshooting Tips:</p>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li><strong>Add more ETH to your wallet to cover gas fees</strong></li>
              <li>Current gas estimate requires ~0.05 ETH for 2 NFT transfers</li>
              <li>Consider transferring fewer NFTs to reduce gas costs</li>
              <li>Wait for lower network congestion to reduce gas prices</li>
              <li>Check your wallet balance before retrying</li>
            </ul>
            <p className="text-xs text-blue-600 mt-2">
              Use the "Back to Costs" button to recalculate costs with current gas prices.
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <button className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Costs
          </button>

          <div className="flex space-x-2">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              Back to Costs
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium">
              Retry Burn
            </button>
          </div>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when transaction fails due to insufficient gas fees with specific guidance.'
      }
    }
  }
};

export const ContractError: Story = {
  name: '❌ Contract Execution Failed',
  args: {
    selectedNFTs: [mockSelectedNFTs[0]],
    targetNetwork: mockTargetNetwork,
    costs: {
      ...mockBurnCosts,
      nftDetails: mockBurnCosts.nftDetails ? [mockBurnCosts.nftDetails[0]] : undefined
    },
    onTransactionComplete: (txHash) => console.log('Transaction completed:', txHash),
    onTransactionError: (error) => console.error('Transaction error:', error),
    onBack: () => console.log('Back to costs')
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Execute Complete Burn Process</h3>
          <p className="text-gray-600">
            Transfer your cast NFTs to burn addresses and remint them as ckNFTs on the Internet Computer.
          </p>
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L5.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Burn Process Failed</p>
                <p className="text-xs text-red-600 mt-1">Transaction reverted. NFT may not be owned by your address or already transferred.</p>
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-800 mb-2">Troubleshooting Tips:</p>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li><strong>Verify NFT ownership in your wallet</strong></li>
              <li>Check if the NFT was already transferred or sold</li>
              <li>Ensure the contract supports the required transfer method</li>
              <li>Verify that your wallet is approved to transfer this NFT</li>
              <li>Try refreshing the NFT selection step to reload ownership data</li>
            </ul>
            <p className="text-xs text-blue-600 mt-2">
              Use the "Back to Costs" button to verify ownership and recalculate.
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <button className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Costs
          </button>

          <div className="flex space-x-2">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              Back to Costs
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium">
              Retry Burn
            </button>
          </div>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when contract execution fails, possibly due to ownership issues or contract problems.'
      }
    }
  }
};

// ===== CONTEXT STATES =====

export const NoWalletConnection: Story = {
  name: '🔌 No MetaMask Connection',
  args: {
    selectedNFTs: [mockSelectedNFTs[0]],
    targetNetwork: mockTargetNetwork,
    costs: {
      ...mockBurnCosts,
      nftDetails: mockBurnCosts.nftDetails ? [mockBurnCosts.nftDetails[0]] : undefined
    },
    onTransactionComplete: (txHash) => console.log('Transaction completed:', txHash),
    onTransactionError: (error) => console.error('Transaction error:', error),
    onBack: () => console.log('Back to costs')
  },
  parameters: {
    docs: {
      description: {
        story: 'Component behavior when MetaMask is not connected - typically should not reach this state in normal flow.'
      }
    }
  }
};

export const NoAuthentication: Story = {
  name: '🔐 No IC Authentication',
  args: {
    selectedNFTs: [mockSelectedNFTs[0]],
    targetNetwork: mockTargetNetwork,
    costs: {
      ...mockBurnCosts,
      nftDetails: mockBurnCosts.nftDetails ? [mockBurnCosts.nftDetails[0]] : undefined
    },
    onTransactionComplete: (txHash) => console.log('Transaction completed:', txHash),
    onTransactionError: (error) => console.error('Transaction error:', error),
    onBack: () => console.log('Back to costs')
  },
  parameters: {
    docs: {
      description: {
        story: 'Component behavior when user is not authenticated with IC - typically should not reach this state in normal flow.'
      }
    }
  }
};

// ===== NETWORK-SPECIFIC STATES =====

export const PolygonNetwork: Story = {
  name: '🔗 Polygon Network Transaction',
  args: {
    selectedNFTs: [{
      ...mockSelectedNFTs[0],
      network: 'Polygon' as Network
    }],
    targetNetwork: mockTargetNetwork,
    costs: {
      ...mockBurnCosts,
      ethCost: BigInt('5000000000000000'), // Lower gas costs on Polygon
      nftDetails: mockBurnCosts.nftDetails ? [{
        ...mockBurnCosts.nftDetails[0],
        nft: {
          ...mockBurnCosts.nftDetails[0].nft,
          network: 'Polygon' as Network
        }
      }] : undefined
    },
    onTransactionComplete: (txHash) => console.log('Transaction completed:', txHash),
    onTransactionError: (error) => console.error('Transaction error:', error),
    onBack: () => console.log('Back to costs')
  },
  parameters: {
    docs: {
      description: {
        story: 'Burn execution configured for Polygon network with lower gas costs.'
      }
    }
  }
};

export const LargeNFTBatch: Story = {
  name: '📦 Large NFT Batch (5 NFTs)',
  args: {
    selectedNFTs: Array.from({ length: 5 }, (_, i) => ({
      ...mockSelectedNFTs[0],
      tokenId: `${100 + i}`,
      name: `Batch NFT #${100 + i}`,
      image: `https://picsum.photos/400/400?random=${100 + i}`
    })),
    targetNetwork: mockTargetNetwork,
    costs: {
      ...mockBurnCosts,
      cyclesCost: BigInt('12500000000000'), // 12.5T cycles for 5 NFTs
      ethCost: BigInt('125000000000000000'), // 0.125 ETH for 5 NFTs
      gasEstimate: BigInt('750000'), // Higher gas for 5 transfers
      nftDetails: Array.from({ length: 5 }, (_, i) => ({
        nft: {
          ...mockSelectedNFTs[0],
          tokenId: `${100 + i}`,
          name: `Batch NFT #${100 + i}`
        },
        cyclesCost: BigInt('2500000000000'), // 2.5T cycles each
        burnFundingAddress: `0xdead00000000000000000000000000000000000${i + 1}`
      }))
    },
    onTransactionComplete: (txHash) => console.log('Transaction completed:', txHash),
    onTransactionError: (error) => console.error('Transaction error:', error),
    onBack: () => console.log('Back to costs')
  },
  parameters: {
    docs: {
      description: {
        story: 'Burn execution for a large batch of NFTs showing higher costs and multiple burn addresses.'
      }
    }
  }
};

// ===== EDGE CASES =====

export const NoBackNavigation: Story = {
  name: '🚫 No Back Navigation',
  args: {
    selectedNFTs: [mockSelectedNFTs[0]],
    targetNetwork: mockTargetNetwork,
    costs: {
      ...mockBurnCosts,
      nftDetails: mockBurnCosts.nftDetails ? [mockBurnCosts.nftDetails[0]] : undefined
    },
    onTransactionComplete: (txHash) => console.log('Transaction completed:', txHash),
    onTransactionError: (error) => console.error('Transaction error:', error)
    // No onBack provided
  },
  parameters: {
    docs: {
      description: {
        story: 'Component without back navigation - back button will not be shown.'
      }
    }
  }
};

export const MissingCostData: Story = {
  name: '⚠️ Missing Cost Data',
  args: {
    selectedNFTs: [mockSelectedNFTs[0]],
    targetNetwork: mockTargetNetwork,
    costs: null, // No cost data
    onTransactionComplete: (txHash) => console.log('Transaction completed:', txHash),
    onTransactionError: (error) => console.error('Transaction error:', error),
    onBack: () => console.log('Back to costs')
  },
  parameters: {
    docs: {
      description: {
        story: 'Component behavior when cost calculation data is missing - execution should be blocked.'
      }
    }
  }
};

export const EmptyNFTSelection: Story = {
  name: '⚠️ Empty NFT Selection',
  args: {
    selectedNFTs: [], // Empty selection
    targetNetwork: mockTargetNetwork,
    costs: {
      ...mockBurnCosts,
      nftDetails: []
    },
    onTransactionComplete: (txHash) => console.log('Transaction completed:', txHash),
    onTransactionError: (error) => console.error('Transaction error:', error),
    onBack: () => console.log('Back to costs')
  },
  parameters: {
    docs: {
      description: {
        story: 'Component behavior with empty NFT selection - execution should be blocked.'
      }
    }
  }
};
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ExportCostsStep } from '../../components/bridge/ExportCostsStep';
import type { SelectedICNFT, RemoteContractInfo } from '../../components/bridge/EVMExportWizard';
import type { Network, ContractPointer } from '../../declarations/orchestrator/orchestrator.did';

// Mock providers for context
import { IdentityKitProvider } from '@nfid/identitykit/react';
import { IdentityKitAuthType } from '@nfid/identitykit';
import { AgentProvider } from '../../provider/AgentProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@nfid/identitykit/react/styles.css';

// Mock data
const mockSelectedNFTs: SelectedICNFT[] = [
  {
    canisterId: '2223e-iaaaa-aaaac-awyra-cai',
    tokenId: '123',
    name: 'Cool Ape #123',
    description: 'A very cool ape NFT',
    image: 'https://picsum.photos/400/400?random=123',
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
    canisterId: '2223e-iaaaa-aaaac-awyra-cai',
    tokenId: '456',
    name: 'Cool Ape #456',
    description: 'Another very cool ape NFT',
    image: 'https://picsum.photos/400/400?random=456',
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

const mockTargetNetwork: Network = { Ethereum: [BigInt(1)] };

const mockDeployedRemoteContract: RemoteContractInfo = {
  address: '0x9876543210987654321098765432109876543210',
  network: mockTargetNetwork,
  deployed: true
};

const mockUndeployedRemoteContract: RemoteContractInfo = {
  network: mockTargetNetwork,
  deployed: false
};

const mockSourceContractPointer: ContractPointer = {
  contract: '0x1234567890123456789012345678901234567890',
  network: { Ethereum: [BigInt(1)] }
};

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
          <div className="max-w-4xl mx-auto p-6 bg-white">
            {children}
          </div>
        </AgentProvider>
      </IdentityKitProvider>
    </QueryClientProvider>
  );
};

const meta: Meta<typeof ExportCostsStep> = {
  title: 'Bridge/ExportCostsStep',
  component: ExportCostsStep,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**ExportCostsStep** provides comprehensive cost calculation and payment approval for NFT export operations.

This component serves as the final checkpoint before export execution, calculating all costs across both Internet Computer and EVM networks, verifying balances, and managing payment approvals. It integrates with multiple services to provide real-time cost estimates and ensure users have sufficient funds.

**Key Features:**
- **Dual-Chain Cost Calculation**: Computes cycles for IC operations and ETH for EVM gas
- **Real-Time Gas Estimation**: Fetches current network gas prices and estimates fees
- **Balance Verification**: Checks both cycles and ETH balances across networks
- **Payment Approval**: Manages ICRC2 cycles approval for orchestrator spending
- **Funding Address Management**: Shows and monitors ETH funding addresses for gas payments
- **Smart Cost Optimization**: Adjusts estimates based on contract deployment status

**Cost Breakdown Components:**
1. **Cast Operations**: Cycles needed to bridge each NFT from IC to EVM
2. **Contract Deployment**: Additional cycles if new remote contract needed
3. **EVM Gas Fees**: ETH required for gas on target network (deployment + mints)

**Payment Flow:**
1. Calculate total costs including all operations
2. Verify user has sufficient cycles balance
3. Check ETH funding address has adequate balance for gas
4. User approves cycles spending for orchestrator
5. System monitors allowances and expiration
6. Ready to proceed when all requirements met

**Integration Context:**
Used as the final step before export execution, typically after RemoteContractStep. Integrates with cycles ledger for balance/approval management, orchestrator for cost calculation, and MetaMask for gas estimation.

**Supported Networks:**
All major EVM networks with real-time gas price fetching and network-specific optimization.
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
      description: 'Array of IC NFTs selected for export operation',
      control: { type: 'object' }
    },
    targetNetwork: {
      description: 'Target EVM network for export operation',
      control: { type: 'object' }
    },
    remoteContractInfo: {
      description: 'Information about remote contract deployment status',
      control: { type: 'object' }
    },
    sourceContractPointer: {
      description: 'Source contract pointer from ICRC-99 metadata',
      control: { type: 'object' }
    },
    onCostsCalculated: {
      description: 'Callback fired when total costs are calculated',
      action: 'costsCalculated'
    }
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ExportCostsStep>;

// ===== DOCUMENTATION =====

export const Docs: Story = {
  name: '📖 Documentation',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    remoteContractInfo: mockDeployedRemoteContract,
    sourceContractPointer: mockSourceContractPointer,
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs)
  },
  parameters: {
    docs: {
      page: () => (
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">ExportCostsStep Component</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              The <code>ExportCostsStep</code> component provides comprehensive cost calculation and payment approval 
              for NFT export operations from Internet Computer to EVM networks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">🎯 Primary Purpose</h2>
              <ul className="space-y-2 text-blue-800">
                <li>• Calculate total export costs (IC + EVM)</li>
                <li>• Verify cycles and ETH balances</li>
                <li>• Handle payment approvals</li>
                <li>• Manage funding address operations</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-3">✨ Key Features</h2>
              <ul className="space-y-2 text-green-800">
                <li>• Dual-chain cost calculation</li>
                <li>• Real-time gas estimation</li>
                <li>• Balance verification</li>
                <li>• ICRC2 payment approval</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">💰 Cost Breakdown</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="text-center mb-2">
                  <div className="text-2xl mb-1">⚡</div>
                  <div className="font-medium text-gray-900">Cast Operations</div>
                </div>
                <div className="text-sm text-gray-600">Cycles needed to bridge each NFT from IC to EVM</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="text-center mb-2">
                  <div className="text-2xl mb-1">🚀</div>
                  <div className="font-medium text-gray-900">Contract Deploy</div>
                </div>
                <div className="text-sm text-gray-600">Additional cycles if new remote contract needed</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="text-center mb-2">
                  <div className="text-2xl mb-1">⛽</div>
                  <div className="font-medium text-gray-900">EVM Gas</div>
                </div>
                <div className="text-sm text-gray-600">ETH required for gas on target network</div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-900 mb-4">🔄 Payment Flow</h2>
            <div className="space-y-3 text-yellow-800">
              <p><strong>1. Cost Calculation:</strong> Total costs calculated including all operations</p>
              <p><strong>2. Balance Verification:</strong> Check user has sufficient cycles and ETH</p>
              <p><strong>3. Payment Approval:</strong> User approves cycles spending for orchestrator</p>
              <p><strong>4. Allowance Monitoring:</strong> System monitors allowances and expiration</p>
              <p><strong>5. Ready State:</strong> Proceed when all requirements are met</p>
            </div>
          </div>
        </div>
      )
    }
  }
};

// ===== BASIC STATES =====

export const Default: Story = {
  name: '💰 Calculating Export Costs',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    remoteContractInfo: mockDeployedRemoteContract,
    sourceContractPointer: mockSourceContractPointer,
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs)
  },
  parameters: {
    docs: {
      description: {
        story: 'Default state showing cost calculation process for existing remote contract.'
      }
    }
  }
};

export const NewContractDeployment: Story = {
  name: '🚀 New Contract Deployment',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    remoteContractInfo: mockUndeployedRemoteContract,
    sourceContractPointer: mockSourceContractPointer,
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs)
  },
  parameters: {
    docs: {
      description: {
        story: 'Cost calculation including additional remote contract deployment costs.'
      }
    }
  }
};

// ===== LOADING STATES =====

export const CalculatingCosts: Story = {
  name: '⏳ Calculating Costs',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    remoteContractInfo: mockDeployedRemoteContract,
    sourceContractPointer: mockSourceContractPointer,
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs)
  },
  render: (args) => {
    const Component = () => (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Calculating Export Costs</h3>
        <p className="text-gray-600">
          Estimating cycles needed for 2 NFTs and contract deployment...
        </p>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state while calculating costs from orchestrator and estimating gas fees.'
      }
    }
  }
};

// ===== COST BREAKDOWN STATES =====

export const CostsCalculated: Story = {
  name: '💰 Costs Calculated (Existing Contract)',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    remoteContractInfo: mockDeployedRemoteContract,
    sourceContractPointer: mockSourceContractPointer,
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Export Costs</h3>
          <p className="text-gray-600">
            Review the costs for exporting your 2 NFTs to Ethereum.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-3">Export Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-600">NFTs:</span>
              <span className="ml-2 font-medium text-blue-800">2 tokens</span>
            </div>
            <div>
              <span className="text-blue-600">Target Network:</span>
              <span className="ml-2 font-medium text-blue-800">Ethereum</span>
            </div>
            <div>
              <span className="text-blue-600">Contract:</span>
              <span className="ml-2 font-medium text-blue-800">Existing</span>
            </div>
            <div>
              <span className="text-blue-600">Operation:</span>
              <span className="ml-2 font-medium text-blue-800">Cast to EVM</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Cost Breakdown</h4>
          
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                <div>
                  <h5 className="font-medium text-gray-900">Cast Operations</h5>
                  <p className="text-sm text-gray-600">Bridge 2 NFTs to Ethereum</p>
                </div>
              </div>
              <span className="font-medium text-gray-900">8.500 TC</span>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-orange-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <div>
                  <h5 className="font-medium text-gray-900">EVM Gas Fees</h5>
                  <p className="text-sm text-gray-600">Estimated gas costs on Ethereum</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Balance: 0.0500 ETH (0xabcd...ef12)
                    <span className="text-green-600 ml-1">✓ Sufficient</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-medium text-gray-900">0.025 ETH</span>
                <p className="text-xs text-gray-500">~32.0 gwei</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 mb-2">Current Gas Prices</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-yellow-600">Network:</span>
              <span className="ml-2 font-medium text-yellow-800">Ethereum</span>
            </div>
            <div>
              <span className="text-yellow-600">Gas Price:</span>
              <span className="ml-2 font-medium text-yellow-800">32.0 gwei</span>
            </div>
            <div>
              <span className="text-yellow-600">USD Est.:</span>
              <span className="ml-2 font-medium text-yellow-800">$12.50</span>
            </div>
            <div>
              <span className="text-yellow-600">Confirmation:</span>
              <span className="ml-2 font-medium text-yellow-800">2-5 minutes</span>
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
        story: 'Complete cost breakdown for existing contract with gas price information.'
      }
    }
  }
};

export const CostsWithDeployment: Story = {
  name: '🚀 Costs Including Deployment',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    remoteContractInfo: mockUndeployedRemoteContract,
    sourceContractPointer: mockSourceContractPointer,
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Export Costs</h3>
          <p className="text-gray-600">
            Review the costs for exporting your 2 NFTs to Ethereum.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-3">Export Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-600">NFTs:</span>
              <span className="ml-2 font-medium text-blue-800">2 tokens</span>
            </div>
            <div>
              <span className="text-blue-600">Target Network:</span>
              <span className="ml-2 font-medium text-blue-800">Ethereum</span>
            </div>
            <div>
              <span className="text-blue-600">Contract:</span>
              <span className="ml-2 font-medium text-blue-800">New Deployment</span>
            </div>
            <div>
              <span className="text-blue-600">Operation:</span>
              <span className="ml-2 font-medium text-blue-800">Cast to EVM</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Cost Breakdown</h4>
          
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                <div>
                  <h5 className="font-medium text-gray-900">Cast Operations</h5>
                  <p className="text-sm text-gray-600">Bridge 2 NFTs to Ethereum</p>
                </div>
              </div>
              <span className="font-medium text-gray-900">8.500 TC</span>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
                <div>
                  <h5 className="font-medium text-gray-900">Contract Deployment</h5>
                  <p className="text-sm text-gray-600">Deploy new ERC-721 contract on Ethereum</p>
                </div>
              </div>
              <span className="font-medium text-gray-900">5.000 TC</span>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-orange-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <div>
                  <h5 className="font-medium text-gray-900">EVM Gas Fees</h5>
                  <p className="text-sm text-gray-600">Estimated gas costs on Ethereum</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Balance: 0.0500 ETH (0xabcd...ef12)
                    <span className="text-green-600 ml-1">✓ Sufficient</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-medium text-gray-900">0.045 ETH</span>
                <p className="text-xs text-gray-500">~32.0 gwei</p>
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
        story: 'Cost breakdown including additional contract deployment fees.'
      }
    }
  }
};

// ===== FUNDING ADDRESS STATES =====

export const FundingAddressLoaded: Story = {
  name: '💳 ETH Funding Address',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    remoteContractInfo: mockDeployedRemoteContract,
    sourceContractPointer: mockSourceContractPointer,
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-3">ETH Funding Address</h4>
          <div className="bg-white border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">Address Balance</span>
              <span className="text-sm font-medium text-green-600">0.0500 ETH</span>
            </div>
            <p className="text-xs text-gray-600 font-mono break-all mb-2">
              0xabcdef1234567890abcdef1234567890abcdef12
            </p>
            
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Required for gas:</span>
                <span>0.0250 ETH</span>
              </div>
              
              <div className="p-2 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-green-700 font-medium">
                    Sufficient ETH balance
                  </span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Ready for gas fee payment
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-3 text-xs text-blue-600">
            <p className="mb-1">💡 About the funding address:</p>
            <p>• This address pays for EVM gas fees during the export</p>
            <p>• Managed by the ckNFT canister on Internet Computer</p>
            <p>• Balance is checked automatically before export</p>
            <p className="mt-1 text-green-600">✓ Address retrieved successfully</p>
          </div>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Funding address loaded with sufficient ETH balance for gas fees.'
      }
    }
  }
};

export const InsufficientETHBalance: Story = {
  name: '⚠️ Insufficient ETH Balance',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    remoteContractInfo: mockDeployedRemoteContract,
    sourceContractPointer: mockSourceContractPointer,
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-3">ETH Funding Address</h4>
          <div className="bg-white border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">Address Balance</span>
              <span className="text-sm font-medium text-red-600">0.0100 ETH</span>
            </div>
            <p className="text-xs text-gray-600 font-mono break-all mb-2">
              0xabcdef1234567890abcdef1234567890abcdef12
            </p>
            
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Required for gas:</span>
                <span>0.0250 ETH</span>
              </div>
              
              <div className="p-2 bg-red-50 border border-red-200 rounded">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-red-700 font-medium">
                    Insufficient ETH balance
                  </span>
                </div>
                <p className="text-xs text-red-600 mt-1">
                  Need 0.015 more ETH
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-red-800">Insufficient ETH for Gas Fees</span>
          </div>
          <p className="text-sm text-red-700 mt-1">
            The funding address needs 0.0250 ETH for gas fees but only has 0.0100 ETH.
            <br />
            <span className="text-xs text-red-600">
              Address: 0xabcdef1234567890abcdef1234567890abcdef12
            </span>
            <br />
            Please add 0.0150 ETH to the funding address.
          </p>
          <div className="mt-3">
            <button className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors">
              Get Test ETH
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
        story: 'State when funding address has insufficient ETH for gas fees.'
      }
    }
  }
};

export const NoFundingAddress: Story = {
  name: '❌ No Funding Address',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    remoteContractInfo: mockDeployedRemoteContract,
    sourceContractPointer: mockSourceContractPointer,
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-3">ETH Funding Address</h4>
          <div className="bg-white border border-blue-200 rounded-lg p-3">
            <div className="py-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-gray-700">
                  No ICRC-99 Funding Address Available
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                No ckNFT canister found for this source contract
              </p>
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-xs text-yellow-700">
                  💡 This may be a new contract that hasn't been registered yet
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-3 text-xs text-blue-600">
            <p className="mb-1">💡 About the funding address:</p>
            <p>• ckNFT canisters manage funding addresses for gas payments</p>
            <p>• Each supported contract has a corresponding ckNFT canister</p>
            <p>• Contact support if your contract should be supported</p>
          </div>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'State when no funding address is available for the source contract.'
      }
    }
  }
};

// ===== PAYMENT APPROVAL STATES =====

export const SufficientBalance: Story = {
  name: '💰 Sufficient Cycles Balance',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    remoteContractInfo: mockDeployedRemoteContract,
    sourceContractPointer: mockSourceContractPointer,
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Payment Approval</h4>
          
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-gray-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <h5 className="font-medium text-gray-900">Your Cycles Balance</h5>
              </div>
              <span className="font-medium text-green-600">25.000 TC</span>
            </div>
            
            <div className="text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600">Required:</span>
                <span className="text-gray-900">13.500 TC</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Remaining after export:</span>
                <span className="font-medium text-green-600">11.500 TC</span>
              </div>
            </div>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h5 className="font-medium text-gray-900">Approve Cycles Payment</h5>
                <p className="text-sm text-gray-600">
                  Authorize the orchestrator to use 13.500 TC for this export
                </p>
              </div>
              <button className="px-6 py-2 rounded-md font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700">
                Approve Payment
              </button>
            </div>
            
            <div className="text-sm text-gray-600">
              <p className="mb-1">This will:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Approve the cycles ledger transfer</li>
                <li>Allow the orchestrator to process your export</li>
                <li>Enable automatic gas fee payment on Ethereum</li>
                <li>Include 10% buffer for gas price fluctuations</li>
              </ul>
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
        story: 'State with sufficient cycles balance ready for payment approval.'
      }
    }
  }
};

export const InsufficientCyclesBalance: Story = {
  name: '⚠️ Insufficient Cycles Balance',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    remoteContractInfo: mockDeployedRemoteContract,
    sourceContractPointer: mockSourceContractPointer,
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Payment Approval</h4>
          
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-gray-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <h5 className="font-medium text-gray-900">Your Cycles Balance</h5>
              </div>
              <span className="font-medium text-red-600">5.000 TC</span>
            </div>
            
            <div className="text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600">Required:</span>
                <span className="text-gray-900">13.500 TC</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Remaining after export:</span>
                <span className="font-medium text-red-600">Insufficient Balance</span>
              </div>
            </div>
            
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">
                ⚠️ Insufficient cycles balance. Please deposit 8.500 TC more.
              </p>
            </div>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h5 className="font-medium text-gray-900">Approve Cycles Payment</h5>
                <p className="text-sm text-gray-600">
                  Authorize the orchestrator to use 13.500 TC for this export
                </p>
              </div>
              <button 
                disabled 
                className="px-6 py-2 rounded-md font-medium transition-colors bg-gray-100 text-gray-400 cursor-not-allowed"
              >
                Approve Payment
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-red-800">Insufficient Cycles Balance</span>
          </div>
          <p className="text-sm text-red-700 mt-1">
            You need 8.500 TC more to complete this export.
          </p>
          <div className="mt-3">
            <button className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors">
              Get More Cycles
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
        story: 'State when user has insufficient cycles balance for export operation.'
      }
    }
  }
};

export const ApprovingPayment: Story = {
  name: '⏳ Approving Payment',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    remoteContractInfo: mockDeployedRemoteContract,
    sourceContractPointer: mockSourceContractPointer,
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Payment Approval</h4>
          
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h5 className="font-medium text-gray-900">Approve Cycles Payment</h5>
                <p className="text-sm text-gray-600">
                  Authorize the orchestrator to use 13.500 TC for this export
                </p>
              </div>
              <button 
                disabled 
                className="px-6 py-2 rounded-md font-medium transition-colors bg-gray-100 text-gray-400 cursor-not-allowed"
              >
                <div className="flex items-center">
                  <div className="animate-spin w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full mr-2"></div>
                  Approving...
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Processing cycles approval transaction. Please wait for confirmation...
          </p>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'State during payment approval transaction processing.'
      }
    }
  }
};

export const PaymentApproved: Story = {
  name: '✅ Payment Approved',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    remoteContractInfo: mockDeployedRemoteContract,
    sourceContractPointer: mockSourceContractPointer,
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Payment Approval</h4>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6s.792.193 1.264.979c.456.756.749 1.766.749 2.979 0 1.213-.293 2.223-.749 2.979-.472.786-.96.979-1.264.979s-.792-.193-1.264-.979C8.293 11.223 8 10.213 8 8.958c0-1.213.293-2.223.736-2.979z" clipRule="evenodd" />
                </svg>
                <h5 className="font-medium text-blue-900">Current Allowance</h5>
              </div>
              <span className="font-medium text-green-600">14.850 TC</span>
            </div>
            
            <div className="text-sm space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-blue-600">Status:</span>
                <span className="font-medium text-green-600">Sufficient</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium text-green-800">Payment Approved</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Cycles approved for export operation. You can now proceed with the export.
            </p>
            <div className="mt-2 text-xs text-green-600">
              Approved: 14.850 TC
            </div>
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-blue-800">Ready to Export</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            All requirements met. Click "Start Export" to begin the bridging process.
          </p>
          <div className="mt-2 text-xs text-blue-600 space-y-1">
            <div>✓ Cycles balance: 25.000 TC</div>
            <div>✓ Payment approved: 14.850 TC</div>
            <div>✓ Target network: Ethereum</div>
            <div>✓ NFTs selected: 2</div>
          </div>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Final state with all approvals complete and ready to export.'
      }
    }
  }
};

// ===== ERROR STATES =====

export const CalculationError: Story = {
  name: '❌ Cost Calculation Error',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    remoteContractInfo: mockDeployedRemoteContract,
    sourceContractPointer: mockSourceContractPointer,
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs)
  },
  render: (args) => {
    const Component = () => (
      <div className="text-center py-12">
        <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Calculating Costs</h3>
        <p className="text-gray-600 mb-4">
          Failed to connect to orchestrator service for cost calculation
        </p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          Retry
        </button>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when cost calculation fails with retry option.'
      }
    }
  }
};

export const PaymentApprovalError: Story = {
  name: '❌ Payment Approval Failed',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: mockTargetNetwork,
    remoteContractInfo: mockDeployedRemoteContract,
    sourceContractPointer: mockSourceContractPointer,
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-red-800">Payment Approval Failed</span>
          </div>
          <p className="text-sm text-red-700 mt-1">
            Transaction was rejected or failed due to insufficient balance. Please check your cycles balance and try again.
          </p>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h5 className="font-medium text-gray-900">Approve Cycles Payment</h5>
              <p className="text-sm text-gray-600">
                Authorize the orchestrator to use 13.500 TC for this export
              </p>
            </div>
            <button className="px-6 py-2 rounded-md font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700">
              Retry Approve Payment
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
        story: 'Error state when payment approval transaction fails.'
      }
    }
  }
};

// ===== NETWORK-SPECIFIC STATES =====

export const PolygonNetwork: Story = {
  name: '🟣 Polygon Network Costs',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetNetwork: { Ethereum: [BigInt(137)] },
    remoteContractInfo: { ...mockDeployedRemoteContract, network: { Ethereum: [BigInt(137)] } },
    sourceContractPointer: mockSourceContractPointer,
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs)
  },
  parameters: {
    docs: {
      description: {
        story: 'Cost calculation for Polygon network with lower gas fees.'
      }
    }
  }
};

// ===== EMPTY STATES =====

export const NoNFTsSelected: Story = {
  name: '📋 No NFTs Selected',
  args: {
    selectedNFTs: [],
    targetNetwork: mockTargetNetwork,
    remoteContractInfo: null,
    sourceContractPointer: mockSourceContractPointer,
    onCostsCalculated: (costs) => console.log('Costs calculated:', costs)
  },
  render: (args) => {
    const Component = () => (
      <div className="text-center py-12">
        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Calculate Costs</h3>
        <p className="text-gray-600">Please check your export configuration and try again.</p>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state when no NFTs are selected for cost calculation.'
      }
    }
  }
};
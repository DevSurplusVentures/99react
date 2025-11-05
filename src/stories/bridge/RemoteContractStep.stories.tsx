import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { RemoteContractStep } from '../../components/bridge/RemoteContractStep';
import type { SelectedICNFT, RemoteContractInfo } from '../../components/bridge/EVMExportWizard';
import type { Network, ContractPointer } from '../../declarations/orchestrator/orchestrator.did';
import { Principal } from '@dfinity/principal';

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

const mockSourceContractPointer: ContractPointer = {
  contract: '0x1234567890123456789012345678901234567890',
  network: { Ethereum: [BigInt(1)] }
};

const mockRemoteContractInfo: RemoteContractInfo = {
  network: { Ethereum: [BigInt(1)] },
  deployed: false
};

const mockDeployedRemoteContractInfo: RemoteContractInfo = {
  address: '0x9876543210987654321098765432109876543210',
  network: { Ethereum: [BigInt(1)] },
  deployed: true
};

// Mock Ethereum network for target
const mockTargetNetwork: Network = {
  Ethereum: {
    chain_id: BigInt(1),
    logo: 'https://ethereum.org/static/655ede60eb7bb0d4d4c9ea20e1a4e6bb/c6b4e/ethereum-logo-landscape-black.png',
  }
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

const meta: Meta<typeof RemoteContractStep> = {
  title: 'Bridge/RemoteContractStep',
  component: RemoteContractStep,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**RemoteContractStep** manages remote EVM contract deployment and configuration for cross-chain NFT bridging.

This component handles the complete lifecycle of deploying NFT contracts on target EVM networks, including contract discovery, cost estimation, funding management, and deployment monitoring. It serves as the bridge between Internet Computer canisters and EVM-compatible blockchains.

**Key Features:**
- **Contract Discovery**: Automatically detects existing contracts on target networks
- **Cost Estimation**: Real-time calculation of cycles (IC) and gas (EVM) costs
- **Dual Funding**: Manages both cycles approval for orchestrator and ETH funding for gas
- **Smart Deployment**: Creates new contracts only when needed, reuses existing ones
- **Progress Monitoring**: Polls deployment status and provides real-time updates
- **Multi-Network Support**: Works with Ethereum, Polygon, Base, Arbitrum, Optimism, and BSC

**Contract Economics:**
Remote contract deployment requires funding from two sources:
1. **Cycles**: Paid to the Internet Computer orchestrator for deployment coordination
2. **ETH**: Paid for gas costs on the target EVM network for contract deployment

**Deployment Flow:**
1. Check if contract already exists for the source canister
2. If not found, estimate deployment costs (cycles + ETH)
3. User approves cycles for orchestrator
4. User funds the remote deployment address with ETH
5. Deploy new ERC-721 contract on target network
6. Monitor deployment progress and update status

**Integration Context:**
Typically used after CanisterCostStep but before export cost calculations. Integrates with the orchestrator canister for deployment coordination and MetaMask for EVM network interactions.

**Supported Networks:**
- Ethereum Mainnet (Chain ID 1)
- Polygon (Chain ID 137)
- BSC (Chain ID 56)
- Optimism (Chain ID 10)
- Base (Chain ID 8453)
- Arbitrum One (Chain ID 42161)
- Local Hardhat (Chain ID 31337)
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
      description: 'Array of IC NFTs selected for export to EVM network',
      control: { type: 'object' }
    },
    targetChainId: {
      description: 'Target EVM network chain ID for contract deployment',
      control: { type: 'text' }
    },
    remoteContractInfo: {
      description: 'Current remote contract deployment information',
      control: { type: 'object' }
    },
    sourceCanisterId: {
      description: 'Source IC canister ID containing the NFTs to export',
      control: { type: 'text' }
    },
    sourceContractPointer: {
      description: 'Source contract pointer derived from ICRC-99 metadata',
      control: { type: 'object' }
    },
    onRemoteContractInfoChange: {
      description: 'Callback fired when remote contract information changes',
      action: 'remoteContractInfoChanged'
    }
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof RemoteContractStep>;

// ===== DOCUMENTATION =====

export const Docs: Story = {
  name: '📖 Documentation',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetChainId: '1',
    remoteContractInfo: null,
    sourceCanisterId: '2223e-iaaaa-aaaac-awyra-cai',
    sourceContractPointer: mockSourceContractPointer,
    onRemoteContractInfoChange: (info) => console.log('Remote contract info changed:', info)
  },
  parameters: {
    docs: {
      page: () => (
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">RemoteContractStep Component</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              The <code>RemoteContractStep</code> component manages EVM contract deployment and configuration 
              for cross-chain NFT bridging operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">🎯 Primary Purpose</h2>
              <ul className="space-y-2 text-blue-800">
                <li>• Deploy ERC-721 contracts on target EVM networks</li>
                <li>• Configure contract metadata and settings</li>
                <li>• Manage deployment costs and cycles approval</li>
                <li>• Monitor deployment progress and status</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-3">✨ Key Features</h2>
              <ul className="space-y-2 text-green-800">
                <li>• Existing contract discovery</li>
                <li>• Automated deployment workflow</li>
                <li>• Multi-network support</li>
                <li>• Real-time status tracking</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🚀 Deployment Flow</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="text-2xl mb-2">1️⃣</div>
                <div className="font-medium text-gray-900">Discovery</div>
                <div className="text-sm text-gray-600">Check existing</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="text-2xl mb-2">2️⃣</div>
                <div className="font-medium text-gray-900">Configure</div>
                <div className="text-sm text-gray-600">Set metadata</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="text-2xl mb-2">3️⃣</div>
                <div className="font-medium text-gray-900">Deploy</div>
                <div className="text-sm text-gray-600">Contract creation</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="text-2xl mb-2">4️⃣</div>
                <div className="font-medium text-gray-900">Verify</div>
                <div className="text-sm text-gray-600">Confirm success</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-purple-900 mb-3">🔍 Contract Discovery</h2>
              <div className="space-y-2 text-purple-800">
                <p><strong>Existing Contracts:</strong> Automatically detects deployed contracts</p>
                <p><strong>Network Scanning:</strong> Searches across supported EVM networks</p>
                <p><strong>Metadata Validation:</strong> Ensures contract compatibility</p>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-orange-900 mb-3">⚙️ Configuration</h2>
              <div className="space-y-2 text-orange-800">
                <p><strong>Contract Metadata:</strong> Name, symbol, description setup</p>
                <p><strong>Network Selection:</strong> Target EVM network configuration</p>
                <p><strong>Cost Estimation:</strong> Deployment cost calculation</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-900 mb-4">💡 Integration Context</h2>
            <div className="space-y-3 text-yellow-800">
              <p><strong>Bridge Workflow:</strong> Essential step in the NFT export process</p>
              <p><strong>Multi-Chain Support:</strong> Works with Ethereum, Polygon, BSC, and other EVM networks</p>
              <p><strong>Cost Management:</strong> Integrates with cycles ledger for payment handling</p>
              <p><strong>Status Tracking:</strong> Provides real-time feedback on deployment progress</p>
            </div>
          </div>
        </div>
      )
    }
  }
};

// ===== BASIC STATES =====

export const Default: Story = {
  name: '🔍 Checking for Existing Contract',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetChainId: '1',
    remoteContractInfo: null,
    sourceCanisterId: '2223e-iaaaa-aaaac-awyra-cai',
    sourceContractPointer: mockSourceContractPointer,
    onRemoteContractInfoChange: (info) => console.log('Remote contract info changed:', info)
  },
  parameters: {
    docs: {
      description: {
        story: 'Initial state showing contract discovery process for Ethereum mainnet.'
      }
    }
  }
};

export const MultipleNetworks: Story = {
  name: '🌐 Different Target Networks',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetChainId: '137', // Polygon
    remoteContractInfo: mockRemoteContractInfo,
    sourceCanisterId: '2223e-iaaaa-aaaac-awyra-cai',
    sourceContractPointer: mockSourceContractPointer,
    onRemoteContractInfoChange: (info) => console.log('Remote contract info changed:', info)
  },
  parameters: {
    docs: {
      description: {
        story: 'Component configured for Polygon network deployment showing different chain support.'
      }
    }
  }
};

// ===== LOADING STATES =====

export const CheckingContract: Story = {
  name: '⏳ Discovering Remote Contract',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetChainId: '1',
    remoteContractInfo: null,
    sourceCanisterId: '2223e-iaaaa-aaaac-awyra-cai',
    sourceContractPointer: mockSourceContractPointer,
    onRemoteContractInfoChange: (info) => console.log('Remote contract info changed:', info)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Remote Contract Configuration</h3>
          <p className="text-gray-600">
            Checking for existing contracts and configuring the target EVM deployment.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">Export Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-600">NFTs to Export:</span>
              <span className="ml-2 font-medium text-blue-800">2 NFTs</span>
            </div>
            <div>
              <span className="text-blue-600">Source Canister:</span>
              <span className="ml-2 font-medium text-blue-800 font-mono text-xs">
                2223e-iaaaa-aaaac-awyra-cai
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-2">Target Network</h4>
          <div className="flex items-center">
            <span className="text-2xl mr-3">🔗</span>
            <div>
              <h5 className="font-medium text-gray-900">Network: Chain 1</h5>
              <p className="text-sm text-gray-600">Chain ID: 1</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Contract Status</h4>
          
          <div className="flex items-center py-4">
            <div className="animate-spin w-5 h-5 border-4 border-blue-600 border-t-transparent rounded-full mr-3"></div>
            <div>
              <p className="font-medium text-gray-900">Checking for existing contracts...</p>
              <p className="text-sm text-gray-600">
                Searching for contracts linked to canister 2223e-iaaaa-aaaac-awyra-cai
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
        story: 'Loading state while checking orchestrator for existing remote contracts.'
      }
    }
  }
};

// ===== EXISTING CONTRACT STATES =====

export const ExistingContractFound: Story = {
  name: '✅ Existing Contract Found',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetChainId: '1',
    remoteContractInfo: mockDeployedRemoteContractInfo,
    sourceCanisterId: '2223e-iaaaa-aaaac-awyra-cai',
    sourceContractPointer: mockSourceContractPointer,
    onRemoteContractInfoChange: (info) => console.log('Remote contract info changed:', info)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Remote Contract Configuration</h3>
          <p className="text-gray-600">
            Checking for existing contracts and configuring the target EVM deployment.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">Export Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-600">NFTs to Export:</span>
              <span className="ml-2 font-medium text-blue-800">2 NFTs</span>
            </div>
            <div>
              <span className="text-blue-600">Source Canister:</span>
              <span className="ml-2 font-medium text-blue-800 font-mono text-xs">
                2223e-iaaaa-aaaac-awyra-cai
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-2">Target Network</h4>
          <div className="flex items-center">
            <span className="text-2xl mr-3">🔗</span>
            <div>
              <h5 className="font-medium text-gray-900">Network: Chain 1</h5>
              <p className="text-sm text-gray-600">Chain ID: 1</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Contract Status</h4>
          
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h5 className="font-medium text-green-800 mb-1">Existing Contract Found</h5>
                <p className="text-sm text-green-700 mb-3">
                  A contract already exists for this canister on the target network. 
                  Your NFTs will be exported to this existing contract.
                </p>
                
                <div className="bg-white border border-green-200 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <h6 className="font-medium text-gray-900">CK-rdmx6...</h6>
                        <span className="ml-2 text-sm text-gray-500">(CKNFT)</span>
                        <svg className="w-4 h-4 text-green-500 ml-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-600 font-mono mb-2">0x9876543210987654321098765432109876543210</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Total Supply: 1,234</span>
                        <a
                          href="#"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 inline-flex items-center"
                        >
                          View on Explorer 
                          <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-green-800">Configuration Complete</span>
          </div>
          <div className="mt-2 text-sm text-green-700">
            <p>✓ Target ChainId: 1</p>
            <p>✓ Contract: Use existing contract</p>
            <p>✓ Ready to calculate export costs</p>
          </div>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'State when existing remote contract is found, no deployment needed.'
      }
    }
  }
};

// ===== NEW CONTRACT DEPLOYMENT STATES =====

export const NewContractRequired: Story = {
  name: '🚀 New Contract Required',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetChainId: '1',
    remoteContractInfo: mockRemoteContractInfo,
    sourceCanisterId: '2223e-iaaaa-aaaac-awyra-cai',
    sourceContractPointer: mockSourceContractPointer,
    onRemoteContractInfoChange: (info) => console.log('Remote contract info changed:', info)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Remote Contract Configuration</h3>
          <p className="text-gray-600">
            Checking for existing contracts and configuring the target EVM deployment.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">Export Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-600">NFTs to Export:</span>
              <span className="ml-2 font-medium text-blue-800">2 NFTs</span>
            </div>
            <div>
              <span className="text-blue-600">Source Canister:</span>
              <span className="ml-2 font-medium text-blue-800 font-mono text-xs">
                2223e-iaaaa-aaaac-awyra-cai
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-2">Target Network</h4>
          <div className="flex items-center">
            <span className="text-2xl mr-3">🔗</span>
            <div>
              <h5 className="font-medium text-gray-900">Network: Chain 1</h5>
              <p className="text-sm text-gray-600">Chain ID: 1</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Contract Status</h4>
          
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-amber-600 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V5z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h5 className="font-medium text-amber-800 mb-1">New Contract Required</h5>
                <p className="text-sm text-amber-700 mb-3">
                  No existing contract found for this canister on the target network. 
                  A new ERC-721 contract will be deployed during the export process.
                </p>
                
                <div className="bg-white border border-amber-200 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-amber-600">Chain ID:</span>
                      <span className="ml-2 font-medium text-amber-800">1</span>
                    </div>
                    <div>
                      <span className="text-amber-600">Standard:</span>
                      <span className="ml-2 font-medium text-amber-800">ERC-721</span>
                    </div>
                    <div>
                      <span className="text-amber-600">NFTs:</span>
                      <span className="ml-2 font-medium text-amber-800">2 tokens</span>
                    </div>
                    <div>
                      <span className="text-amber-600">Gas Fee:</span>
                      <span className="ml-2 font-medium text-amber-800">~0.02 ETH</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h5 className="font-medium text-blue-800 mb-3">Remote Contract Creation Costs</h5>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white border border-blue-200 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900">Cycles Required</span>
                  <p className="text-sm text-gray-600">For orchestrator contract deployment</p>
                </div>
                <div className="text-right">
                  <span className="font-medium text-blue-800">5.000 T</span>
                  <p className="text-xs text-gray-500">cycles</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-white border border-blue-200 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900">ETH Required</span>
                  <p className="text-sm text-gray-600">For EVM contract deployment gas</p>
                </div>
                <div className="text-right">
                  <span className="font-medium text-blue-800">0.02 ETH</span>
                  <p className="text-xs text-gray-500">~800k gas</p>
                </div>
              </div>

              <div className="p-3 bg-white border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">Funding Address</span>
                  <span className="text-sm font-medium text-green-600">0.05 ETH</span>
                </div>
                <p className="text-xs text-gray-600 font-mono break-all">
                  0xabcdef1234567890abcdef1234567890abcdef12
                </p>
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-green-700 font-medium">
                      Sufficient ETH balance
                    </span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Ready for contract deployment
                  </p>
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
        story: 'State showing new contract deployment requirements with cost estimation.'
      }
    }
  }
};

export const InsufficientETHBalance: Story = {
  name: '⚠️ Insufficient ETH Balance',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetChainId: '1',
    remoteContractInfo: mockRemoteContractInfo,
    sourceCanisterId: '2223e-iaaaa-aaaac-awyra-cai',
    sourceContractPointer: mockSourceContractPointer,
    onRemoteContractInfoChange: (info) => console.log('Remote contract info changed:', info)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Remote Contract Configuration</h3>
          <p className="text-gray-600">
            Checking for existing contracts and configuring the target EVM deployment.
          </p>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h5 className="font-medium text-blue-800 mb-3">Remote Contract Creation Costs</h5>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white border border-blue-200 rounded-lg">
              <div>
                <span className="font-medium text-gray-900">Cycles Required</span>
                <p className="text-sm text-gray-600">For orchestrator contract deployment</p>
              </div>
              <div className="text-right">
                <span className="font-medium text-blue-800">5.000 T</span>
                <p className="text-xs text-gray-500">cycles</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-white border border-blue-200 rounded-lg">
              <div>
                <span className="font-medium text-gray-900">ETH Required</span>
                <p className="text-sm text-gray-600">For EVM contract deployment gas</p>
              </div>
              <div className="text-right">
                <span className="font-medium text-blue-800">0.02 ETH</span>
                <p className="text-xs text-gray-500">~800k gas</p>
              </div>
            </div>

            <div className="p-3 bg-white border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">Funding Address</span>
                <span className="text-sm font-medium text-red-600">0.005 ETH</span>
              </div>
              <p className="text-xs text-gray-600 font-mono break-all">
                0xabcdef1234567890abcdef1234567890abcdef12
              </p>
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
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
              
              <button className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-3">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                Fund Remote Contract
              </button>
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
        story: 'State when funding address has insufficient ETH balance with funding button.'
      }
    }
  }
};

// ===== CYCLES APPROVAL STATES =====

export const CyclesApprovalRequired: Story = {
  name: '🔐 Cycles Approval Required',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetChainId: '1',
    remoteContractInfo: mockRemoteContractInfo,
    sourceCanisterId: '2223e-iaaaa-aaaac-awyra-cai',
    sourceContractPointer: mockSourceContractPointer,
    onRemoteContractInfoChange: (info) => console.log('Remote contract info changed:', info)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-3">Cycles Approval</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Required:</span>
              <span className="text-sm font-mono">5.000 TC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Approved:</span>
              <span className="text-sm font-mono">0.000 TC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Your Balance:</span>
              <span className="text-sm font-mono">10.000 TC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span className="text-sm font-medium text-orange-500">Insufficient</span>
            </div>

            <button className="w-full mt-4 flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
              Approve Cycles
            </button>

            <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <p className="text-sm text-orange-600 mb-2">
                Insufficient cycles approval. Click "Approve Cycles" above to approve 5.000 TCycles for the orchestrator canister.
              </p>
              <div className="text-xs text-orange-500">
                <p className="mb-1">💡 About cycles approval:</p>
                <p>• Allows the orchestrator to spend cycles on your behalf</p>
                <p>• Only the approved amount can be spent</p>
                <p>• Required for remote contract deployment</p>
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
        story: 'State showing cycles approval interface with insufficient allowance.'
      }
    }
  }
};

export const CyclesApprovalInProgress: Story = {
  name: '⏳ Approving Cycles',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetChainId: '1',
    remoteContractInfo: mockRemoteContractInfo,
    sourceCanisterId: '2223e-iaaaa-aaaac-awyra-cai',
    sourceContractPointer: mockSourceContractPointer,
    onRemoteContractInfoChange: (info) => console.log('Remote contract info changed:', info)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-3">Cycles Approval</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Required:</span>
              <span className="text-sm font-mono">5.000 TC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Approved:</span>
              <span className="text-sm font-mono">Processing...</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Your Balance:</span>
              <span className="text-sm font-mono">10.000 TC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span className="text-sm font-medium text-blue-500">Processing...</span>
            </div>

            <button 
              disabled 
              className="w-full mt-4 flex items-center justify-center px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
            >
              <div className="animate-spin w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full mr-2"></div>
              Approving Cycles...
            </button>

            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-600">
                Processing cycles approval transaction. Please wait for confirmation...
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
        story: 'State during cycles approval transaction processing.'
      }
    }
  }
};

export const CyclesApproved: Story = {
  name: '✅ Cycles Approved',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetChainId: '1',
    remoteContractInfo: mockRemoteContractInfo,
    sourceCanisterId: '2223e-iaaaa-aaaac-awyra-cai',
    sourceContractPointer: mockSourceContractPointer,
    onRemoteContractInfoChange: (info) => console.log('Remote contract info changed:', info)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-3">Cycles Approval</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Required:</span>
              <span className="text-sm font-mono">5.000 TC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Approved:</span>
              <span className="text-sm font-mono">5.500 TC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Your Balance:</span>
              <span className="text-sm font-mono">10.000 TC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span className="text-sm font-medium text-green-500">Sufficient</span>
            </div>

            <button className="w-full mt-4 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Create Remote Contract
            </button>

            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-green-600 font-medium">
                  Cycles approved successfully!
                </span>
              </div>
              <p className="text-xs text-green-500 mt-1">
                Ready to create the remote contract.
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
        story: 'State with sufficient cycles approval ready for contract deployment.'
      }
    }
  }
};

// ===== DEPLOYMENT STATES =====

export const CreatingRemoteContract: Story = {
  name: '⏳ Creating Remote Contract',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetChainId: '1',
    remoteContractInfo: mockRemoteContractInfo,
    sourceCanisterId: '2223e-iaaaa-aaaac-awyra-cai',
    sourceContractPointer: mockSourceContractPointer,
    onRemoteContractInfoChange: (info) => console.log('Remote contract info changed:', info)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-3">Cycles Approval</h4>
          <div className="space-y-3">
            <button 
              disabled 
              className="w-full mt-4 flex items-center justify-center px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
            >
              <div className="animate-spin w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full mr-2"></div>
              Creating Remote Contract...
            </button>
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Deploying Contract:</strong> Creating your ERC-721 contract on the target network. 
            This process involves coordinating with the orchestrator and waiting for EVM confirmation.
          </p>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'State during remote contract deployment with disabled interface.'
      }
    }
  }
};

export const PollingForContract: Story = {
  name: '🔍 Monitoring Deployment',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetChainId: '1',
    remoteContractInfo: mockRemoteContractInfo,
    sourceCanisterId: '2223e-iaaaa-aaaac-awyra-cai',
    sourceContractPointer: mockSourceContractPointer,
    onRemoteContractInfoChange: (info) => console.log('Remote contract info changed:', info)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="w-full mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-center">
            <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
            <span className="text-sm text-blue-700 font-medium">
              Waiting for contract deployment...
            </span>
          </div>
          <p className="text-xs text-blue-600 text-center mt-1">
            Checking target network for new contract
          </p>
          <p className="text-xs text-blue-500 text-center mt-1 font-mono">
            TX: 0x1234567...89abcdef
          </p>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Monitoring Deployment:</strong> Contract creation transaction has been submitted. 
            Waiting for network confirmation and orchestrator registration.
          </p>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'State while polling for contract deployment completion with transaction hash.'
      }
    }
  }
};

// ===== ERROR STATES =====

export const DeploymentError: Story = {
  name: '❌ Deployment Failed',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetChainId: '1',
    remoteContractInfo: mockRemoteContractInfo,
    sourceCanisterId: '2223e-iaaaa-aaaac-awyra-cai',
    sourceContractPointer: mockSourceContractPointer,
    onRemoteContractInfoChange: (info) => console.log('Remote contract info changed:', info)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>Deployment Failed:</strong> Remote contract creation failed due to insufficient gas. 
            Please ensure the funding address has sufficient ETH and try again.
          </p>
        </div>

        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-3">Cycles Approval</h4>
          <div className="space-y-3">
            <button className="w-full mt-4 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Retry Create Remote Contract
            </button>

            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-600 mb-2">
                <strong>Deployment failed:</strong> This can happen if the funding address doesn't have sufficient ETH 
                or if network conditions have changed.
              </p>
              <p className="text-xs text-amber-700">
                Please check the funding address balance and network status before retrying.
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
        story: 'Error state when remote contract deployment fails with retry option.'
      }
    }
  }
};

export const ContractCheckError: Story = {
  name: '⚠️ Contract Discovery Error',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetChainId: '1',
    remoteContractInfo: null,
    sourceCanisterId: '2223e-iaaaa-aaaac-awyra-cai',
    sourceContractPointer: mockSourceContractPointer,
    onRemoteContractInfoChange: (info) => console.log('Remote contract info changed:', info)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Remote Contract Configuration</h3>
          <p className="text-gray-600">
            Checking for existing contracts and configuring the target EVM deployment.
          </p>
        </div>

        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            Error checking for existing contracts: Failed to connect to orchestrator service
          </p>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800 mb-2">
            <strong>Unable to check contract status:</strong> There was an error connecting to the orchestrator service.
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
        story: 'Error state when contract discovery fails with network or service issues.'
      }
    }
  }
};

// ===== NETWORK-SPECIFIC STATES =====

export const PolygonNetwork: Story = {
  name: '🟣 Polygon Network',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetChainId: '137',
    remoteContractInfo: { ...mockRemoteContractInfo, network: { Ethereum: [BigInt(137)] } },
    sourceCanisterId: '2223e-iaaaa-aaaac-awyra-cai',
    sourceContractPointer: mockSourceContractPointer,
    onRemoteContractInfoChange: (info) => console.log('Remote contract info changed:', info)
  },
  parameters: {
    docs: {
      description: {
        story: 'Component configured for Polygon network with different gas estimation.'
      }
    }
  }
};

export const BaseNetwork: Story = {
  name: '🔵 Base Network',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetChainId: '8453',
    remoteContractInfo: { ...mockRemoteContractInfo, network: { Ethereum: [BigInt(8453)] } },
    sourceCanisterId: '2223e-iaaaa-aaaac-awyra-cai',
    sourceContractPointer: mockSourceContractPointer,
    onRemoteContractInfoChange: (info) => console.log('Remote contract info changed:', info)
  },
  parameters: {
    docs: {
      description: {
        story: 'Component configured for Base network with L2 optimizations.'
      }
    }
  }
};

// ===== EMPTY STATES =====

export const NoNFTsSelected: Story = {
  name: '📋 No NFTs Selected',
  args: {
    selectedNFTs: [],
    targetChainId: '1',
    remoteContractInfo: null,
    sourceCanisterId: '2223e-iaaaa-aaaac-awyra-cai',
    sourceContractPointer: mockSourceContractPointer,
    onRemoteContractInfoChange: (info) => console.log('Remote contract info changed:', info)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Remote Contract Configuration</h3>
          <p className="text-gray-600">
            Checking for existing contracts and configuring the target EVM deployment.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">Export Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-600">NFTs to Export:</span>
              <span className="ml-2 font-medium text-blue-800">0 NFTs</span>
            </div>
            <div>
              <span className="text-blue-600">Source Canister:</span>
              <span className="ml-2 font-medium text-blue-800 font-mono text-xs">
                2223e-iaaaa-aaaac-awyra-cai
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 text-center border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">Select NFTs to configure remote contract deployment</p>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state when no NFTs are selected for export.'
      }
    }
  }
};

export const InvalidNetwork: Story = {
  name: '⚠️ Unsupported Network',
  args: {
    selectedNFTs: mockSelectedNFTs,
    targetChainId: '999999',
    remoteContractInfo: null,
    sourceCanisterId: '2223e-iaaaa-aaaac-awyra-cai',
    sourceContractPointer: mockSourceContractPointer,
    onRemoteContractInfoChange: (info) => console.log('Remote contract info changed:', info)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Remote Contract Configuration</h3>
          <p className="text-gray-600">
            Checking for existing contracts and configuring the target EVM deployment.
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-2">Target Network</h4>
          <div className="flex items-center">
            <span className="text-2xl mr-3">❓</span>
            <div>
              <h5 className="font-medium text-gray-900">Network: Chain 999999</h5>
              <p className="text-sm text-red-600">Chain ID: 999999 (Unsupported)</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>Unsupported Network:</strong> Chain ID 999999 is not currently supported for remote contract deployment.
          </p>
          <p className="text-xs text-red-600 mt-1">
            Please select a supported network: Ethereum, Polygon, BSC, Optimism, Base, or Arbitrum.
          </p>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when unsupported network chain ID is provided.'
      }
    }
  }
};
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ICNFTSelectionStep } from '../../components/bridge/ICNFTSelectionStep';
import type { SelectedICNFT } from '../../components/bridge/EVMExportWizard';
import { Principal } from '@dfinity/principal';

// Mock providers for context
import { IdentityKitProvider } from '@nfid/identitykit/react';
import { IdentityKitAuthType } from '@nfid/identitykit';
import { AgentProvider } from '../../provider/AgentProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@nfid/identitykit/react/styles.css';

// Mock data
const mockUserPrincipal = Principal.fromText('2223e-iaaaa-aaaac-awyra-cai');

const mockSelectedNFTs: SelectedICNFT[] = [
  {
    canisterId: 'umunu-kh777-77774-qaaca-cai',
    tokenId: '123',
    name: 'Cool Ape #123',
    description: 'A very cool ape NFT',
    image: 'https://picsum.photos/400/400?random=123',
    owner: mockUserPrincipal,
    metadata: {
      parsedMetadata: {
        icrc97: {
          name: 'Cool Ape #123',
          description: 'A very cool ape NFT',
          image: 'https://picsum.photos/400/400?random=123',
          attributes: [
            { trait_type: 'Background', value: 'Blue' },
            { trait_type: 'Eyes', value: 'Laser' }
          ]
        }
      }
    }
  },
  {
    canisterId: 'umunu-kh777-77774-qaaca-cai',
    tokenId: '456',
    name: 'Cool Ape #456',
    description: 'Another very cool ape NFT',
    image: 'https://picsum.photos/400/400?random=456',
    owner: mockUserPrincipal,
    metadata: {
      parsedMetadata: {
        icrc97: {
          name: 'Cool Ape #456',
          description: 'Another very cool ape NFT',
          image: 'https://picsum.photos/400/400?random=456',
          attributes: [
            { trait_type: 'Background', value: 'Red' },
            { trait_type: 'Eyes', value: 'Normal' }
          ]
        }
      }
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
          <div className="max-w-6xl mx-auto p-6 bg-white">
            {children}
          </div>
        </AgentProvider>
      </IdentityKitProvider>
    </QueryClientProvider>
  );
};

const meta: Meta<typeof ICNFTSelectionStep> = {
  title: 'Bridge/ICNFTSelectionStep',
  component: ICNFTSelectionStep,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**ICNFTSelectionStep** provides NFT selection interface for exporting IC-based NFTs (ckNFTs) to EVM networks.

This component serves as the selection interface for users who want to export their NFTs from Internet Computer back to EVM networks. It enables users to browse their owned NFTs from specific collections and select which ones to bridge.

**Key Features:**
- **Collection Discovery**: Input any canister ID to browse NFT collections
- **Owned NFT Fetching**: Automatically discovers user's owned tokens in the collection
- **Dynamic Metadata Loading**: Loads metadata for each owned NFT with progress tracking
- **Advanced Search**: Search through owned NFTs by name, description, attributes, or token ID
- **Bulk Operations**: Select all, clear all, and multi-selection capabilities
- **Visual Preview**: Shows NFT images, names, descriptions, and key attributes
- **Loading States**: Progress indicators for both token discovery and metadata fetching
- **Error Handling**: Validates canister IDs and handles loading failures gracefully

**Selection Process:**
1. User enters a valid canister ID for an NFT collection
2. System fetches all tokens owned by the user in that collection
3. Metadata is loaded progressively for each owned token
4. User can search and filter through their owned NFTs
5. Multiple NFTs can be selected for export operation
6. Selection is passed to parent component for further processing

**Use Cases:**
- Export ckNFTs back to original EVM networks
- Browse and manage owned IC-based NFT collections
- Select multiple NFTs for batch export operations
- Discover user's NFT holdings across different IC canisters

**Integration Context:**
Used in export workflows where users want to bridge their IC NFTs back to EVM networks. Integrates with NFT metadata standards (ICRC-7, ICRC-97) and provides selection data to subsequent export steps.

**Error Recovery:**
- Invalid canister ID validation with helpful error messages
- Retry mechanisms for failed metadata loads
- Fallback displays for NFTs with missing images or metadata
- Clear error states with actionable recovery options

**Performance Optimizations:**
- Progressive metadata loading to avoid blocking UI
- Search filtering performed client-side for responsiveness
- Debounced search input to prevent excessive filtering
- Efficient re-rendering with memoized components and callbacks
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
    sourceCanisterId: {
      description: 'Pre-populated canister ID for the NFT collection',
      control: { type: 'text' }
    },
    selectedNFTs: {
      description: 'Currently selected NFTs for export',
      control: { type: 'object' }
    },
    onSelectionChange: {
      description: 'Callback when NFT selection changes',
      action: 'selectionChanged'
    },
    userPrincipal: {
      description: 'User principal for fetching owned NFTs',
      control: { type: 'object' }
    },
    onCanisterChange: {
      description: 'Callback when canister ID changes',
      action: 'canisterChanged'
    }
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ICNFTSelectionStep>;

// ===== DOCUMENTATION =====

export const Docs: Story = {
  name: '📖 Documentation',
  args: {
    selectedNFTs: [],
    userPrincipal: mockUserPrincipal,
    onSelectionChange: (nfts) => console.log('Selection changed:', nfts),
    onCanisterChange: (canisterId) => console.log('Canister changed:', canisterId)
  },
  parameters: {
    docs: {
      page: () => (
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">ICNFTSelectionStep Component</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              The <code>ICNFTSelectionStep</code> component provides NFT selection interface for exporting 
              IC-based NFTs (ckNFTs) to EVM networks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">🎯 Primary Purpose</h2>
              <ul className="space-y-2 text-blue-800">
                <li>• Browse IC NFT collections by canister ID</li>
                <li>• Discover user's owned tokens</li>
                <li>• Select multiple NFTs for export</li>
                <li>• Search and filter owned NFTs</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-3">✨ Key Features</h2>
              <ul className="space-y-2 text-green-800">
                <li>• Dynamic collection discovery</li>
                <li>• Progressive metadata loading</li>
                <li>• Advanced search capabilities</li>
                <li>• Bulk selection operations</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🔄 Selection Process</h2>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-center">
              <div className="bg-white rounded-lg p-3 border border-gray-300">
                <div className="text-xl mb-1">1️⃣</div>
                <div className="text-sm font-medium text-gray-900">Enter Canister</div>
                <div className="text-xs text-gray-600">Valid canister ID</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-300">
                <div className="text-xl mb-1">2️⃣</div>
                <div className="text-sm font-medium text-gray-900">Fetch Tokens</div>
                <div className="text-xs text-gray-600">Discover owned</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-300">
                <div className="text-xl mb-1">3️⃣</div>
                <div className="text-sm font-medium text-gray-900">Load Metadata</div>
                <div className="text-xs text-gray-600">Progressive loading</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-300">
                <div className="text-xl mb-1">4️⃣</div>
                <div className="text-sm font-medium text-gray-900">Search & Filter</div>
                <div className="text-xs text-gray-600">Find specific NFTs</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-300">
                <div className="text-xl mb-1">5️⃣</div>
                <div className="text-sm font-medium text-gray-900">Select & Export</div>
                <div className="text-xs text-gray-600">Multi-selection</div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-900 mb-4">💡 Usage Scenarios</h2>
            <div className="space-y-3 text-yellow-800">
              <p><strong>Export ckNFTs:</strong> Export IC-based NFTs back to original EVM networks</p>
              <p><strong>Collection Management:</strong> Browse and manage owned IC NFT collections</p>
              <p><strong>Batch Operations:</strong> Select multiple NFTs for efficient batch export</p>
              <p><strong>Discovery:</strong> Explore user's NFT holdings across different IC canisters</p>
            </div>
          </div>
        </div>
      )
    }
  }
};

// ===== BASIC STATES =====

export const Default: Story = {
  name: '🔍 Select IC NFTs for Export',
  args: {
    selectedNFTs: [],
    userPrincipal: mockUserPrincipal,
    onSelectionChange: (nfts) => console.log('Selection changed:', nfts),
    onCanisterChange: (canisterId) => console.log('Canister changed:', canisterId)
  },
  parameters: {
    docs: {
      description: {
        story: 'Default state with empty canister ID input ready for user to enter a collection.'
      }
    }
  }
};

export const PreloadedCanister: Story = {
  name: '📋 Pre-loaded Collection',
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    selectedNFTs: [],
    userPrincipal: mockUserPrincipal,
    onSelectionChange: (nfts) => console.log('Selection changed:', nfts),
    onCanisterChange: (canisterId) => console.log('Canister changed:', canisterId)
  },
  parameters: {
    docs: {
      description: {
        story: 'State with pre-loaded canister ID ready to fetch NFTs.'
      }
    }
  }
};

export const WithSelectedNFTs: Story = {
  name: '✅ NFTs Selected',
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    selectedNFTs: mockSelectedNFTs,
    userPrincipal: mockUserPrincipal,
    onSelectionChange: (nfts) => console.log('Selection changed:', nfts),
    onCanisterChange: (canisterId) => console.log('Canister changed:', canisterId)
  },
  parameters: {
    docs: {
      description: {
        story: 'State showing selected NFTs ready for export.'
      }
    }
  }
};

// ===== AUTHENTICATION STATES =====

export const NotAuthenticated: Story = {
  name: '🔐 Authentication Required',
  args: {
    selectedNFTs: [],
    userPrincipal: undefined,
    onSelectionChange: (nfts) => console.log('Selection changed:', nfts),
    onCanisterChange: (canisterId) => console.log('Canister changed:', canisterId)
  },
  parameters: {
    docs: {
      description: {
        story: 'State when user needs to authenticate with Internet Identity first.'
      }
    }
  }
};

// ===== LOADING STATES =====

export const LoadingTokens: Story = {
  name: '⏳ Loading User Tokens',
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    selectedNFTs: [],
    userPrincipal: mockUserPrincipal,
    onSelectionChange: (nfts) => console.log('Selection changed:', nfts),
    onCanisterChange: (canisterId) => console.log('Canister changed:', canisterId)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select NFTs to Export</h3>
          <p className="text-gray-600">
            Choose the ckNFTs you want to export back to EVM blockchain. 
            Enter the canister ID of the NFT collection you want to check.
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="canister-id" className="block text-sm font-medium text-gray-700 mb-2">
                NFT Collection Canister ID
              </label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    id="canister-id"
                    type="text"
                    value="umunu-kh777-77774-qaaca-cai"
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                <button
                  disabled
                  className="px-6 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-400 cursor-not-allowed"
                >
                  Loading...
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Currently viewing:</span>
              <code className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
                umunu-kh777-77774-qaaca-cai
              </code>
            </div>
          </div>
        </div>

        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Your NFTs</h3>
          <p className="text-gray-600">Fetching your ckNFTs from umunu-kh777-77774-qaaca-cai...</p>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state while fetching user\'s owned tokens from the collection.'
      }
    }
  }
};

export const LoadingMetadata: Story = {
  name: '📖 Loading NFT Metadata',
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    selectedNFTs: [],
    userPrincipal: mockUserPrincipal,
    onSelectionChange: (nfts) => console.log('Selection changed:', nfts),
    onCanisterChange: (canisterId) => console.log('Canister changed:', canisterId)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select NFTs to Export</h3>
          <p className="text-gray-600">
            Choose the ckNFTs you want to export back to EVM blockchain.
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Currently viewing:</span>
            <code className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
              umunu-kh777-77774-qaaca-cai
            </code>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mr-3"></div>
              <div>
                <p className="font-medium text-blue-800">Loading NFT metadata...</p>
                <p className="text-sm text-blue-600">
                  7 of 12 NFTs loaded
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="w-32 bg-blue-200 rounded-full h-2">
                <div 
                  className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: '58%' }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search NFTs by name, description, or attributes..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              disabled
              className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md opacity-50 cursor-not-allowed"
            >
              Select All
            </button>
            <button
              disabled
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md opacity-50 cursor-not-allowed"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-800">0 NFTs selected</p>
              <p className="text-sm text-blue-600">7 NFTs available (loading...)</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="p-3 border border-gray-200 rounded-lg">
              <div className="w-full h-32 bg-gray-200 rounded-md mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded mb-1 animate-pulse w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
            </div>
          ))}
          {[8, 9, 10, 11, 12].map((i) => (
            <div key={i} className="p-3 border border-gray-100 rounded-lg opacity-50">
              <div className="w-full h-32 bg-gray-100 rounded-md mb-2 flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full"></div>
              </div>
              <div className="h-4 bg-gray-100 rounded mb-2"></div>
              <div className="h-3 bg-gray-100 rounded mb-1 w-3/4"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state with progress bar showing metadata being loaded for owned tokens.'
      }
    }
  }
};

// ===== COLLECTION STATES =====

export const NFTCollectionLoaded: Story = {
  name: '🎨 Collection Loaded',
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    selectedNFTs: [],
    userPrincipal: mockUserPrincipal,
    onSelectionChange: (nfts) => console.log('Selection changed:', nfts),
    onCanisterChange: (canisterId) => console.log('Canister changed:', canisterId)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select NFTs to Export</h3>
          <p className="text-gray-600">
            Choose the ckNFTs you want to export back to EVM blockchain.
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Currently viewing:</span>
            <code className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
              umunu-kh777-77774-qaaca-cai
            </code>
            <button className="text-blue-600 hover:text-blue-700 ml-2">
              Change Collection
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search NFTs by name, description, or attributes..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors">
              Select All
            </button>
            <button 
              disabled
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md opacity-50 cursor-not-allowed"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-800">0 NFTs selected</p>
              <p className="text-sm text-blue-600">12 NFTs available</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { id: '1', name: 'Cool Ape #1', image: 'https://picsum.photos/300/300?random=1', traits: [{ trait_type: 'Background', value: 'Blue' }, { trait_type: 'Eyes', value: 'Laser' }] },
            { id: '3', name: 'Cool Ape #3', image: 'https://picsum.photos/300/300?random=3', traits: [{ trait_type: 'Background', value: 'Red' }, { trait_type: 'Eyes', value: 'Normal' }] },
            { id: '7', name: 'Cool Ape #7', image: 'https://picsum.photos/300/300?random=7', traits: [{ trait_type: 'Background', value: 'Green' }, { trait_type: 'Eyes', value: 'Laser' }] },
            { id: '12', name: 'Cool Ape #12', image: 'https://picsum.photos/300/300?random=12', traits: [{ trait_type: 'Background', value: 'Yellow' }, { trait_type: 'Eyes', value: 'Normal' }] },
            { id: '15', name: 'Cool Ape #15', image: 'https://picsum.photos/300/300?random=15', traits: [{ trait_type: 'Background', value: 'Purple' }, { trait_type: 'Eyes', value: 'Rare' }] },
            { id: '23', name: 'Cool Ape #23', image: 'https://picsum.photos/300/300?random=23', traits: [{ trait_type: 'Background', value: 'Orange' }, { trait_type: 'Eyes', value: 'Laser' }] },
            { id: '34', name: 'Cool Ape #34', image: 'https://picsum.photos/300/300?random=34', traits: [{ trait_type: 'Background', value: 'Pink' }, { trait_type: 'Eyes', value: 'Normal' }] },
            { id: '42', name: 'Cool Ape #42', image: 'https://picsum.photos/300/300?random=42', traits: [{ trait_type: 'Background', value: 'Black' }, { trait_type: 'Eyes', value: 'Glowing' }] }
          ].map((nft) => (
            <div key={nft.id} className="relative">
              <button className="w-full p-3 border border-gray-200 rounded-lg text-left transition-all cursor-pointer hover:border-gray-300">
                <img 
                  src={nft.image} 
                  alt={nft.name}
                  className="w-full h-32 object-cover rounded-md mb-2"
                />
                
                <p className="font-medium text-sm truncate">{nft.name}</p>
                <p className="text-xs text-gray-600">#{nft.id}</p>
                
                <div className="mt-2 space-y-1">
                  {nft.traits.slice(0, 2).map((attr, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-gray-500 truncate">{attr.trait_type}</span>
                      <span className="text-gray-700 font-medium truncate ml-1">{attr.value}</span>
                    </div>
                  ))}
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Collection loaded showing user\'s owned NFTs ready for selection.'
      }
    }
  }
};

export const WithSelectedItems: Story = {
  name: '🎯 With Selected NFTs',
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    selectedNFTs: [mockSelectedNFTs[0]],
    userPrincipal: mockUserPrincipal,
    onSelectionChange: (nfts) => console.log('Selection changed:', nfts),
    onCanisterChange: (canisterId) => console.log('Canister changed:', canisterId)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select NFTs to Export</h3>
          <p className="text-gray-600">
            Choose the ckNFTs you want to export back to EVM blockchain.
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Currently viewing:</span>
            <code className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
              umunu-kh777-77774-qaaca-cai
            </code>
            <button className="text-blue-600 hover:text-blue-700 ml-2">
              Change Collection
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search NFTs by name, description, or attributes..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors">
              Select All
            </button>
            <button className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              Clear All
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-800">3 NFTs selected</p>
              <p className="text-sm text-blue-600">12 NFTs available</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-600">
                Ready for export to EVM
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { id: '1', name: 'Cool Ape #1', image: 'https://picsum.photos/300/300?random=1', selected: true, traits: [{ trait_type: 'Background', value: 'Blue' }, { trait_type: 'Eyes', value: 'Laser' }] },
            { id: '3', name: 'Cool Ape #3', image: 'https://picsum.photos/300/300?random=3', selected: false, traits: [{ trait_type: 'Background', value: 'Red' }, { trait_type: 'Eyes', value: 'Normal' }] },
            { id: '7', name: 'Cool Ape #7', image: 'https://picsum.photos/300/300?random=7', selected: true, traits: [{ trait_type: 'Background', value: 'Green' }, { trait_type: 'Eyes', value: 'Laser' }] },
            { id: '12', name: 'Cool Ape #12', image: 'https://picsum.photos/300/300?random=12', selected: false, traits: [{ trait_type: 'Background', value: 'Yellow' }, { trait_type: 'Eyes', value: 'Normal' }] },
            { id: '15', name: 'Cool Ape #15', image: 'https://picsum.photos/300/300?random=15', selected: true, traits: [{ trait_type: 'Background', value: 'Purple' }, { trait_type: 'Eyes', value: 'Rare' }] },
            { id: '23', name: 'Cool Ape #23', image: 'https://picsum.photos/300/300?random=23', selected: false, traits: [{ trait_type: 'Background', value: 'Orange' }, { trait_type: 'Eyes', value: 'Laser' }] },
            { id: '34', name: 'Cool Ape #34', image: 'https://picsum.photos/300/300?random=34', selected: false, traits: [{ trait_type: 'Background', value: 'Pink' }, { trait_type: 'Eyes', value: 'Normal' }] },
            { id: '42', name: 'Cool Ape #42', image: 'https://picsum.photos/300/300?random=42', selected: false, traits: [{ trait_type: 'Background', value: 'Black' }, { trait_type: 'Eyes', value: 'Glowing' }] }
          ].map((nft) => (
            <div key={nft.id} className="relative">
              <button className={`w-full p-3 border rounded-lg text-left transition-all cursor-pointer ${
                nft.selected 
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <img 
                  src={nft.image} 
                  alt={nft.name}
                  className="w-full h-32 object-cover rounded-md mb-2"
                />
                
                <p className="font-medium text-sm truncate">{nft.name}</p>
                <p className="text-xs text-gray-600">#{nft.id}</p>
                
                <div className="mt-2 space-y-1">
                  {nft.traits.slice(0, 2).map((attr, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-gray-500 truncate">{attr.trait_type}</span>
                      <span className="text-gray-700 font-medium truncate ml-1">{attr.value}</span>
                    </div>
                  ))}
                </div>
                
                {nft.selected && (
                  <div className="mt-2 text-xs font-medium text-blue-600">✓ Selected for export</div>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'State showing multiple NFTs selected with visual indicators and selection summary.'
      }
    }
  }
};

// ===== SEARCH & FILTER STATES =====

export const SearchResults: Story = {
  name: '🔍 Search Results',
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    selectedNFTs: [],
    userPrincipal: mockUserPrincipal,
    onSelectionChange: (nfts) => console.log('Selection changed:', nfts),
    onCanisterChange: (canisterId) => console.log('Canister changed:', canisterId)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select NFTs to Export</h3>
          <p className="text-gray-600">
            Choose the ckNFTs you want to export back to EVM blockchain.
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Currently viewing:</span>
            <code className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
              umunu-kh777-77774-qaaca-cai
            </code>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value="laser"
              placeholder="Search NFTs by name, description, or attributes..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors">
              Select All
            </button>
            <button 
              disabled
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md opacity-50 cursor-not-allowed"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-800">0 NFTs selected</p>
              <p className="text-sm text-blue-600">4 NFTs match "laser"</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { id: '1', name: 'Cool Ape #1', image: 'https://picsum.photos/300/300?random=1', traits: [{ trait_type: 'Background', value: 'Blue' }, { trait_type: 'Eyes', value: 'Laser' }] },
            { id: '7', name: 'Cool Ape #7', image: 'https://picsum.photos/300/300?random=7', traits: [{ trait_type: 'Background', value: 'Green' }, { trait_type: 'Eyes', value: 'Laser' }] },
            { id: '23', name: 'Cool Ape #23', image: 'https://picsum.photos/300/300?random=23', traits: [{ trait_type: 'Background', value: 'Orange' }, { trait_type: 'Eyes', value: 'Laser' }] },
            { id: '56', name: 'Cool Ape #56', image: 'https://picsum.photos/300/300?random=56', traits: [{ trait_type: 'Background', value: 'White' }, { trait_type: 'Eyes', value: 'Laser' }] }
          ].map((nft) => (
            <div key={nft.id} className="relative">
              <button className="w-full p-3 border border-gray-200 rounded-lg text-left transition-all cursor-pointer hover:border-gray-300">
                <img 
                  src={nft.image} 
                  alt={nft.name}
                  className="w-full h-32 object-cover rounded-md mb-2"
                />
                
                <p className="font-medium text-sm truncate">{nft.name}</p>
                <p className="text-xs text-gray-600">#{nft.id}</p>
                
                <div className="mt-2 space-y-1">
                  {nft.traits.slice(0, 2).map((attr, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-gray-500 truncate">{attr.trait_type}</span>
                      <span className={`font-medium truncate ml-1 ${attr.value.toLowerCase().includes('laser') ? 'text-blue-600 bg-blue-100 px-1 rounded' : 'text-gray-700'}`}>
                        {attr.value}
                      </span>
                    </div>
                  ))}
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Search results highlighting NFTs matching the search term with visual highlights.'
      }
    }
  }
};

export const NoSearchResults: Story = {
  name: '🔍 No Search Results',
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    selectedNFTs: [],
    userPrincipal: mockUserPrincipal,
    onSelectionChange: (nfts) => console.log('Selection changed:', nfts),
    onCanisterChange: (canisterId) => console.log('Canister changed:', canisterId)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select NFTs to Export</h3>
          <p className="text-gray-600">
            Choose the ckNFTs you want to export back to EVM blockchain.
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Currently viewing:</span>
            <code className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
              umunu-kh777-77774-qaaca-cai
            </code>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value="mythical dragon"
              placeholder="Search NFTs by name, description, or attributes..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button 
              disabled
              className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md opacity-50 cursor-not-allowed"
            >
              Select All
            </button>
            <button 
              disabled
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md opacity-50 cursor-not-allowed"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-800">0 NFTs selected</p>
              <p className="text-sm text-blue-600">0 NFTs match "mythical dragon"</p>
            </div>
          </div>
        </div>

        <div className="text-center py-8">
          <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4z" />
            <path fillRule="evenodd" d="M6 8a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-gray-600">No NFTs match your search criteria</p>
          <button className="mt-2 text-blue-600 hover:text-blue-700 text-sm">
            Clear search
          </button>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'State when search returns no results with option to clear search.'
      }
    }
  }
};

// ===== ERROR STATES =====

export const InvalidCanisterId: Story = {
  name: '❌ Invalid Canister ID',
  args: {
    selectedNFTs: [],
    userPrincipal: mockUserPrincipal,
    onSelectionChange: (nfts) => console.log('Selection changed:', nfts),
    onCanisterChange: (canisterId) => console.log('Canister changed:', canisterId)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select NFTs to Export</h3>
          <p className="text-gray-600">
            Choose the ckNFTs you want to export back to EVM blockchain. 
            Enter the canister ID of the NFT collection you want to check.
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="canister-id" className="block text-sm font-medium text-gray-700 mb-2">
                NFT Collection Canister ID
              </label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    id="canister-id"
                    type="text"
                    value="invalid-canister-id-format"
                    className="w-full px-4 py-2 border border-red-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <p className="mt-1 text-sm text-red-600">Invalid canister ID format</p>
                </div>
                <button
                  disabled
                  className="px-6 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-400 cursor-not-allowed"
                >
                  Load NFTs
                </button>
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
        story: 'Error state showing invalid canister ID format with validation message.'
      }
    }
  }
};

export const CollectionLoadError: Story = {
  name: '❌ Collection Load Error',
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    selectedNFTs: [],
    userPrincipal: mockUserPrincipal,
    onSelectionChange: (nfts) => console.log('Selection changed:', nfts),
    onCanisterChange: (canisterId) => console.log('Canister changed:', canisterId)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select NFTs to Export</h3>
          <p className="text-gray-600">
            Choose the ckNFTs you want to export back to EVM blockchain.
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Currently viewing:</span>
            <code className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
              umunu-kh777-77774-qaaca-cai
            </code>
            <button className="text-blue-600 hover:text-blue-700 ml-2">
              Change Collection
            </button>
          </div>
        </div>

        <div className="text-center py-8">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading NFTs</h3>
          <p className="text-gray-600 mb-4">Failed to connect to orchestrator service for cost calculation</p>
          <div className="space-x-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Retry
            </button>
            <button className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              Try Different Collection
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
        story: 'Error state when collection fails to load with retry options.'
      }
    }
  }
};

// ===== EMPTY STATES =====

export const NoNFTsOwned: Story = {
  name: '📭 No NFTs Owned',
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    selectedNFTs: [],
    userPrincipal: mockUserPrincipal,
    onSelectionChange: (nfts) => console.log('Selection changed:', nfts),
    onCanisterChange: (canisterId) => console.log('Canister changed:', canisterId)
  },
  render: (args) => {
    const Component = () => (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select NFTs to Export</h3>
          <p className="text-gray-600">
            Choose the ckNFTs you want to export back to EVM blockchain.
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Currently viewing:</span>
            <code className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
              umunu-kh777-77774-qaaca-cai
            </code>
            <button className="text-blue-600 hover:text-blue-700 ml-2">
              Change Collection
            </button>
          </div>
        </div>

        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4z" />
            <path fillRule="evenodd" d="M6 8a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No NFTs Found</h3>
          <p className="text-gray-600">
            No ckNFTs found in canister umunu-kh777-77774-qaaca-cai
          </p>
          <button className="mt-2 text-blue-600 hover:text-blue-700 text-sm">
            Try Different Collection
          </button>
        </div>
      </div>
    );

    return <Component />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state when user owns no NFTs in the selected collection.'
      }
    }
  }
};
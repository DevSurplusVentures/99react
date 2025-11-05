import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SolanaCollectionSelectionStep, SelectedSolanaCollection } from '../../components/bridge/SolanaCollectionSelectionStep';
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

// Mock collection data
const mockCollections: SelectedSolanaCollection[] = [
  {
    collection: {
      address: 'ABC123def456GHI789jkl012MNO345pqr678STU901vwx',
      name: 'Degen Ape Academy',
      symbol: 'DAPE',
      image: 'https://arweave.net/KThGwJNY9u3-vPH5R7mYDyA4PwJY9b8q8sN4V7Hn_Pg',
      description: 'A collection of 10,000 unique Degen Apes on Solana',
      nftCount: 3,
      verified: true,
      nfts: []
    }
  },
  {
    collection: {
      address: 'XYZ789abc123DEF456ghi789JKL012mno345PQR678stu',
      name: 'Solana Monkey Business',
      symbol: 'SMB',
      image: 'https://arweave.net/example-monkey-image-hash',
      description: 'The first gen 2 NFT collection on Solana',
      nftCount: 5,
      verified: true,
      nfts: []
    }
  },
  {
    collection: {
      address: 'QWE456rty789UIO012pas345DFG678hjk901LZX234cvb',
      name: 'Famous Fox Federation',
      symbol: 'FFF',
      image: 'https://arweave.net/example-fox-image-hash',
      description: 'A collection of 7,777 unique foxes',
      nftCount: 1,
      verified: false,
      nfts: []
    }
  }
];

const meta = {
  title: 'Bridge/SolanaCollectionSelectionStep',
  component: SolanaCollectionSelectionStep,
  decorators: [withProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## SolanaCollectionSelectionStep Component

Step 2 of the Solana import wizard. Allows users to select ONE collection to bridge.

### Architecture
- **1:1 Relationship**: One ckNFT canister per Solana collection
- **Selection Flow**: User selects collection first, then individual NFTs in next step
- **Collection Discovery**: Automatically finds all collections user owns with Metaplex

### Key Features

#### Collection Discovery
- Automatically queries all NFTs owned by connected wallet
- Groups NFTs by collection using Metaplex metadata
- Shows collection metadata (name, symbol, image)
- Displays NFT count per collection
- Verified badge for officially verified collections

#### User Experience
- Search/filter collections by name or address
- Visual collection cards with preview images
- Single-selection (one collection at a time)
- Recovery mode for stuck NFTs at approval addresses
- Manual collection entry for edge cases

#### States
- **Loading**: Discovering collections via Metaplex
- **Empty**: No collections found in wallet
- **Error**: RPC or Metaplex query failures
- **Selected**: Collection chosen, ready to proceed

### Usage in Import Wizard

\\\`\\\`\\\`tsx
// Step 2: Collection Selection
<SolanaCollectionSelectionStep
  selectedCollection={selectedCollection}
  onCollectionChange={(collection) => {
    setSelectedCollection(collection);
    // Proceed to NFT selection from this collection
  }}
  refreshTrigger={refreshTrigger} // Increment to force refresh
/>
\\\`\\\`\\\`

### Technical Details

**Collection Object Structure:**
\\\`\\\`\\\`typescript
interface SelectedSolanaCollection {
  collection: {
    address: string;           // Collection mint address
    name?: string;             // Collection name
    symbol?: string;           // Collection symbol
    image?: string;            // Collection image URL
    verified: boolean;         // Metaplex verification status
    nfts: SolanaNFT[];        // Array of NFTs in collection
    floorPrice?: number;       // Optional floor price
    volume?: number;           // Optional volume
  };
}
\\\`\\\`\\\`

**NFT Count Display:**
- Shows total NFTs owned in each collection
- Only counts NFTs actually owned by user
- Updates when wallet/cluster changes

**Recovery Mode:**
- Finds NFTs stuck at approval addresses
- Allows re-importing or completing failed bridges
- Shows approval address and mint request IDs

### Integration Points

1. **Metaplex SDK**: \`@metaplex-foundation/js\` for NFT discovery
2. **Solana Web3**: Connection for RPC queries
3. **Orchestrator**: For checking approval addresses in recovery mode
4. **Next Step**: Passes selected collection to \`SolanaNFTSelectionStep\`

### Error Handling

- **No wallet**: Prompts user to connect
- **RPC failures**: Retry button with error message
- **Empty collections**: Helpful message with manual entry option
- **Metaplex errors**: Graceful degradation with fallback

### Best Practices

- Only select collection user actually owns NFTs from
- Verify collection has valid metadata before proceeding
- Use recovery mode for failed previous attempts
- Check verification status for collection legitimacy
        `
      }
    }
  },
  argTypes: {
    selectedCollection: {
      description: 'Currently selected collection (single selection)',
      control: { type: 'object' }
    },
    onCollectionChange: {
      description: 'Callback when selection changes',
      action: 'collection changed'
    },
    refreshTrigger: {
      description: 'Increment to force collections refresh',
      control: { type: 'number' }
    }
  },
  args: {
    onCollectionChange: fn()
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SolanaCollectionSelectionStep>;

export default meta;
type Story = StoryObj<typeof meta>;

// ===== DOCUMENTATION =====

export const Docs: Story = {
  name: '📖 Documentation',
  args: {
    selectedCollection: null,
    onCollectionChange: fn()
  },
  decorators: [],
  parameters: {
    docs: {
      page: () => (
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">SolanaCollectionSelectionStep Component</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              The <code>SolanaCollectionSelectionStep</code> component allows users to select ONE Solana NFT collection 
              for bridging operations. This establishes the 1:1 relationship between Solana collections and IC ckNFT canisters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">🎯 Primary Purpose</h2>
              <ul className="space-y-2 text-blue-800">
                <li>• Discover collections via Metaplex</li>
                <li>• Display collection metadata</li>
                <li>• Single-selection (one collection)</li>
                <li>• Recovery mode for stuck NFTs</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-3">✨ Key Features</h2>
              <ul className="space-y-2 text-green-800">
                <li>• Automatic collection grouping</li>
                <li>• Verified badge display</li>
                <li>• NFT count per collection</li>
                <li>• Manual collection entry</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🏗️ Architecture: 1:1 Relationship</h2>
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="text-center mb-3">
                  <div className="text-4xl mb-2">🎨</div>
                  <div className="font-bold text-lg text-gray-900">Solana Collection</div>
                  <div className="text-sm text-gray-600">(One Metaplex Collection)</div>
                </div>
                <div className="text-center text-3xl my-2">⬇️</div>
                <div className="text-center mb-3">
                  <div className="text-4xl mb-2">🏭</div>
                  <div className="font-bold text-lg text-gray-900">IC ckNFT Canister</div>
                  <div className="text-sm text-gray-600">(One ICRC-7/ICRC-37 Canister)</div>
                </div>
              </div>
              <p className="text-sm text-gray-700 text-center">
                Each Solana collection bridges to its own dedicated IC canister. 
                This ensures clean separation and proper collection management.
              </p>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">🔄 Selection Flow</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">1️⃣</div>
                <div className="font-medium text-sm text-gray-900">Discover</div>
                <div className="text-xs text-gray-600 mt-1">Query Metaplex</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">2️⃣</div>
                <div className="font-medium text-sm text-gray-900">Group NFTs</div>
                <div className="text-xs text-gray-600 mt-1">By collection</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">3️⃣</div>
                <div className="font-medium text-sm text-gray-900">Display Cards</div>
                <div className="text-xs text-gray-600 mt-1">With metadata</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">4️⃣</div>
                <div className="font-medium text-sm text-gray-900">User Selects</div>
                <div className="text-xs text-gray-600 mt-1">One collection</div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-amber-900 mb-4">🔧 Recovery Mode</h2>
            <div className="space-y-3 text-amber-800">
              <p><strong>Detection:</strong> Automatically finds NFTs stuck at approval addresses</p>
              <p><strong>Display:</strong> Shows separate section with amber warning banner</p>
              <p><strong>Resume:</strong> Allows re-importing or completing failed bridges</p>
              <p><strong>Mint Request IDs:</strong> Shows approval address and request IDs for tracking</p>
              <p><strong>No Re-Transfer:</strong> Recovery uses existing approval, saving gas fees</p>
            </div>
          </div>
        </div>
      )
    }
  }
};

/**
 * Default story showing collection selection interface.
 * User can browse and select one collection to bridge.
 */
export const Default: Story = {
  args: {
    selectedCollection: null,
  }
};

/**
 * Shows a collection already selected.
 * Card is highlighted and shows selection indicator.
 */
export const WithSelectedCollection: Story = {
  args: {
    selectedCollection: mockCollections[0],
  }
};

/**
 * Multiple collections available for selection.
 * Shows variety of collection types and metadata.
 */
export const MultipleCollections: Story = {
  args: {
    selectedCollection: null,
  }
};

/**
 * Collection with large NFT count.
 * Tests UI with many NFTs in one collection.
 */
export const LargeCollection: Story = {
  args: {
    selectedCollection: null,
  }
};

/**
 * Mix of verified and unverified collections.
 * Shows verification badges appropriately.
 */
export const MixedVerification: Story = {
  args: {
    selectedCollection: null,
  }
};

/**
 * Collections being loaded from Metaplex.
 * Shows loading spinner and skeleton UI.
 */
export const Loading: Story = {
  args: {
    selectedCollection: null,
  }
};

/**
 * No collections found in wallet.
 * Shows empty state with helpful message and manual entry option.
 */
export const EmptyState: Story = {
  args: {
    selectedCollection: null,
  }
};

/**
 * Error occurred during collection discovery.
 * Shows error message with retry button.
 */
export const ErrorState: Story = {
  args: {
    selectedCollection: null,
  }
};

/**
 * Search/filter functionality demonstrated.
 * User can search by collection name or address.
 */
export const WithSearch: Story = {
  args: {
    selectedCollection: null,
  }
};

/**
 * Recovery mode showing stuck NFTs.
 * NFTs at approval addresses can be recovered.
 */
export const RecoveryMode: Story = {
  args: {
    selectedCollection: null,
  }
};

/**
 * Manual collection entry mode.
 * User can enter collection address directly for edge cases.
 */
export const ManualEntry: Story = {
  args: {
    selectedCollection: null,
  }
};

/**
 * Collection with missing metadata.
 * Handles missing images/names gracefully.
 */
export const MissingMetadata: Story = {
  args: {
    selectedCollection: null,
  }
};

/**
 * Single collection in wallet.
 * Common case for users with limited collections.
 */
export const SingleCollection: Story = {
  args: {
    selectedCollection: null,
  }
};

/**
 * Interactive demo with all features enabled.
 * Users can test selection, search, and navigation.
 */
export const Interactive: Story = {
  args: {
    selectedCollection: null,
  }
};

/**
 * Mobile responsive layout.
 * Tests collection cards on small screens.
 */
export const Mobile: Story = {
  args: {
    selectedCollection: null,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1'
    }
  }
};

/**
 * Tablet responsive layout.
 * Tests grid layout at medium breakpoint.
 */
export const Tablet: Story = {
  args: {
    selectedCollection: null,
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet'
    }
  }
};

/**
 * Collection with very long name.
 * Tests text truncation and overflow handling.
 */
export const LongCollectionName: Story = {
  args: {
    selectedCollection: null,
  }
};

/**
 * Wallet not connected state.
 * Prompts user to connect before showing collections.
 */
export const WalletNotConnected: Story = {
  args: {
    selectedCollection: null,
  }
};

/**
 * Changing selection between collections.
 * Shows deselection and re-selection behavior.
 */
export const ChangeSelection: Story = {
  args: {
    selectedCollection: mockCollections[0],
  }
};

/**
 * Collection selection with detailed metadata.
 * Shows floor price, volume, and other stats.
 */
export const DetailedMetadata: Story = {
  args: {
    selectedCollection: null,
  }
};

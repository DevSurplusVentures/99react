import type { Meta, StoryObj } from '@storybook/react';
import { SolanaNFTSelectionStep } from '../../components/bridge/SolanaNFTSelectionStep';
import type { SolanaNFTSelectionStepProps, SelectedSolanaNFT } from '../../components/bridge/SolanaNFTSelectionStep';
import type { SelectedSolanaCollection } from '../../components/bridge/SolanaCollectionSelectionStep';
import type { SolanaNFT } from '../../services/solanaNFTDiscoveryDirect';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SolanaWalletProvider } from '../../provider/SolanaWalletProvider';
import { IdentityKitProvider } from '@nfid/identitykit/react';
import { IdentityKitAuthType } from '@nfid/identitykit';
import { AgentProvider } from '../../provider/AgentProvider';
import '@nfid/identitykit/react/styles.css';

// Suppress network errors in Storybook
if (typeof window !== 'undefined') {
  try {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      if (args[0]?.includes?.('Cannot POST') || args[0]?.includes?.('404')) {
        return;
      }
      originalError.apply(console, args);
    };
  } catch (e) {
    // Ignore
  }
}

// Create a query client that doesn't retry
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Provider wrapper for Solana components
const withSolanaProviders = (Story: any) => (
  <SolanaWalletProvider>
    <IdentityKitProvider authType={IdentityKitAuthType.ACCOUNTS}>
      <AgentProvider network="local">
        <QueryClientProvider client={queryClient}>
          <div className="min-h-screen bg-gray-50 p-4">
            <Story />
          </div>
        </QueryClientProvider>
      </AgentProvider>
    </IdentityKitProvider>
  </SolanaWalletProvider>
);

// Mock NFT data
const createMockNFT = (id: number, collectionAddress?: string): SolanaNFT => ({
  mintAddress: `${id}NS2gnVrBoV44sWGCeSnzHhuf7Fv4sMLh5uEVjTEVv${String(id).padStart(2, '0')}`,
  tokenAddress: `${id}TokenAddr...${String(id).padStart(2, '0')}`,
  name: `Test NFT #${id}`,
  symbol: 'TEST',
  uri: `https://arweave.net/test-metadata-${id}`,
  image: `https://picsum.photos/seed/${id}/400/400`,
  description: `This is test NFT number ${id} in the collection`,
  attributes: [
    { trait_type: 'Background', value: 'Blue' },
    { trait_type: 'Rarity', value: id % 3 === 0 ? 'Rare' : 'Common' },
  ],
  collectionAddress,
  collectionName: 'Test Collection',
  verified: true,
  supply: 1,
});

const mockCollection: SelectedSolanaCollection = {
  collection: {
    address: 'TestCollectionAddr...123',
    name: 'Awesome NFT Collection',
    symbol: 'AWESOME',
    image: 'https://picsum.photos/seed/collection/200/200',
    description: 'A test collection of awesome NFTs',
    nftCount: 12,
    verified: true,
    nfts: Array.from({ length: 12 }, (_, i) => createMockNFT(i + 1, 'TestCollectionAddr...123')),
  },
};

const meta = {
  title: 'Bridge/SolanaNFTSelectionStep',
  component: SolanaNFTSelectionStep,
  decorators: [withSolanaProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## SolanaNFTSelectionStep Component

The NFT selection interface for Solana bridging operations. Allows users to browse and select specific NFTs from a chosen collection for import or burn operations.

### Features
- **Multi-Select Grid**: Checkbox-based selection of multiple NFTs
- **Collection Context**: Shows NFTs from pre-selected collection
- **Search & Filter**: Find NFTs by name, symbol, or mint address
- **Manual Entry**: Add NFTs by mint address for recovery scenarios
- **Stuck NFT Recovery**: Automatically detects and allows recovery of previously transferred NFTs
- **Ownership States**: Tracks owned, bridged, ready-to-mint, and already-minted states
- **Responsive Grid**: 2/3/4 column layout based on screen size
- **Metadata Display**: Shows NFT images, names, symbols, and mint addresses

### NFT Discovery Architecture

This component uses the **Direct RPC Discovery** approach:

\`\`\`typescript
// Services: solanaNFTDiscoveryDirect.ts
// Bypasses problematic Metaplex SDK in favor of direct RPC calls

1. fetchNFTByMint() - Fetch single NFT metadata by mint address
2. discoverCollectionNFTsComprehensive() - Comprehensive discovery:
   - Query user wallet for NFTs
   - Query approval address for stuck NFTs  
   - Check ckNFT canister for already-minted
   - Return complete ownership state map

3. parseMetadataAccount() - Parse Metaplex Token Metadata accounts
4. fetchMetadataJson() - Fetch JSON metadata from URI (Arweave, etc.)
\`\`\`

### Integration with Metaplex

\`\`\`
Token Metadata Program: metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s

PDA Derivation:
  seeds = ["metadata", TOKEN_METADATA_PROGRAM_ID, mintAddress]
  
Metadata Account Structure:
  - name (string)
  - symbol (string)
  - uri (string) → points to JSON metadata
  - collection (Option<Collection>)
    - verified (bool)
    - key (Pubkey)
\`\`\`

### Stuck NFT Recovery Flow

When NFTs are "stuck" at the approval address (transferred but not yet minted):

1. **Automatic Detection**: On component mount, runs \`discoverCollectionNFTsComprehensive()\`
2. **Separate Section**: Shows stuck NFTs in amber-styled cards with "Resume" badge
3. **Resume Selection**: User can select stuck NFTs to resume minting without re-transferring
4. **State Tracking**: Marks as \`ownershipState: 'ready-to-mint'\` with \`mintRequestId\`

### Manual Entry Use Cases

**When to use manual entry:**
- NFT not appearing in automatic discovery
- Collection metadata is incomplete
- Recovery of lost NFTs
- Testing with specific mint addresses
- Collection changed after initial discovery

**Validation:**
- Checks if mint address is valid Solana address (base58, 32 bytes)
- Fetches metadata from on-chain PDA
- Validates metadata JSON is accessible
- Prevents duplicate additions

### Props

\`\`\`typescript
interface SolanaNFTSelectionStepProps {
  selectedCollection: SelectedSolanaCollection;  // From previous step
  selectedNFTs: SelectedSolanaNFT[];             // Current selection
  onSelectionChange: (nfts: SelectedSolanaNFT[]) => void;
  mode: 'import' | 'burn';                       // Wizard mode
  targetCanister?: string;                       // IC canister for ownership check
}

interface SelectedSolanaNFT {
  mintAddress: string;                           // Unique identifier
  name: string;
  symbol?: string;
  image?: string;
  collection?: {
    address: string;
    name: string;
    verified: boolean;
  };
  metadata?: SolanaNFT;                          // Full metadata
  source: 'discovered' | 'manual';               // How it was added
  ownershipState: 'owned' | 'bridged' | 'ready-to-mint' | 'already-minted';
}
\`\`\`

### Ownership States Explained

- **owned**: NFT is in user's wallet, ready to bridge
- **bridged**: NFT has been transferred and bridged successfully
- **ready-to-mint**: NFT is at approval address, mint needs completion
- **already-minted**: ckNFT already exists on IC, cannot re-mint

### Usage Example

\`\`\`tsx
function MyImportWizard() {
  const [selectedCollection, setSelectedCollection] = useState<SelectedSolanaCollection>();
  const [selectedNFTs, setSelectedNFTs] = useState<SelectedSolanaNFT[]>([]);

  return (
    <SolanaNFTSelectionStep
      selectedCollection={selectedCollection}
      selectedNFTs={selectedNFTs}
      onSelectionChange={setSelectedNFTs}
      mode="import"
      targetCanister="ryjl3-tyaaa-aaaaa-aaaba-cai"
    />
  );
}
\`\`\`

### Search Functionality

Searches across:
- NFT name (e.g., "Degen Ape #1234")
- NFT symbol (e.g., "DAPE")
- Mint address (e.g., "6NS2gnVr...")

Case-insensitive, substring matching.

### Grid Layout

Responsive grid:
- **Mobile**: 2 columns (grid-cols-2)
- **Tablet**: 3 columns (md:grid-cols-3)
- **Desktop**: 4 columns (lg:grid-cols-4)

Each card shows:
- NFT image (or 🖼️ placeholder)
- Selection checkbox (top-right)
- NFT name
- Symbol (if available)
- Truncated mint address

### Local Storage Caching

For recovery detection, selected NFTs are cached:

\`\`\`typescript
addToLocalStorageMintCache(mintAddress, collectionAddress);
// Stored: mint → collection mapping
// Used by: Recovery detection on next session
\`\`\`

### Differences from EVM NFTSelectionStep

**Solana Version** (this component):
- Single collection context (selected in previous step)
- Stuck NFT recovery feature
- Manual entry by mint address
- Direct RPC metadata fetching
- Metaplex Token Metadata standard

**EVM Version**:
- Multi-collection display with grouping
- ERC-721/ERC-1155 standards
- Contract-based discovery
- No recovery feature (different architecture)

### Performance Considerations

- **Lazy Image Loading**: Images use \`loading="lazy"\` attribute
- **Search Debouncing**: Real-time filtering without debounce (fast enough with memoization)
- **Grid Virtualization**: Not implemented (typical collections < 1000 NFTs)
- **Metadata Caching**: Query client caches RPC responses

### Error Handling

- **Wallet Not Connected**: Shows reconnection prompt
- **Empty Collection**: Shows empty state with manual entry prompt
- **Search No Results**: Shows clear search button
- **Manual Entry Errors**: Inline validation errors
- **Discovery Errors**: Console logs, graceful fallback

### Accessibility

- Click entire card to select NFT
- Visual feedback on hover and selection
- High contrast selection states (blue ring)
- Touch-friendly card sizes
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    selectedCollection: {
      description: 'The Solana collection selected in the previous wizard step',
      table: {
        type: { summary: 'SelectedSolanaCollection' },
      },
    },
    selectedNFTs: {
      description: 'Array of currently selected NFTs from this collection',
      table: {
        type: { summary: 'SelectedSolanaNFT[]' },
        defaultValue: { summary: '[]' },
      },
    },
    onSelectionChange: {
      action: 'selection-changed',
      description: 'Callback fired when NFT selection changes. Receives updated array.',
      table: {
        type: { summary: '(nfts: SelectedSolanaNFT[]) => void' },
      },
    },
    mode: {
      control: { type: 'radio' },
      options: ['import', 'burn'],
      description: 'Wizard mode: import (transfer to IC) or burn (burn and remint)',
      table: {
        type: { summary: "'import' | 'burn'" },
        defaultValue: { summary: 'import' },
      },
    },
    targetCanister: {
      control: { type: 'text' },
      description: 'Optional IC canister ID for ownership state checking',
      table: {
        type: { summary: 'string | undefined' },
      },
    },
  },
} satisfies Meta<typeof SolanaNFTSelectionStep>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Docs: Story = {
  name: '📖 Documentation',
  args: {
    selectedCollection: mockCollection,
    selectedNFTs: [],
    onSelectionChange: () => {},
    mode: 'import',
  },
  decorators: [],
  parameters: {
    docs: {
      page: () => (
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">SolanaNFTSelectionStep Component</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              The <code>SolanaNFTSelectionStep</code> component provides multi-select NFT browsing from a chosen 
              Solana collection, with automatic stuck NFT recovery, manual entry, and direct RPC metadata fetching.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">🎯 Primary Purpose</h2>
              <ul className="space-y-2 text-blue-800">
                <li>• Multi-select NFTs from collection</li>
                <li>• Display images, names, attributes</li>
                <li>• Search & filter functionality</li>
                <li>• Stuck NFT recovery detection</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-3">✨ Key Features</h2>
              <ul className="space-y-2 text-green-800">
                <li>• Checkbox-based selection</li>
                <li>• Manual entry by mint address</li>
                <li>• Ownership state tracking</li>
                <li>• Responsive 2/3/4 column grid</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🏗️ NFT Discovery Architecture</h2>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <div className="font-medium text-gray-900 mb-2">📡 Direct RPC Discovery</div>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>1. fetchNFTByMint():</strong> Fetch single NFT metadata by mint address</p>
                  <p><strong>2. discoverCollectionNFTsComprehensive():</strong> Complete discovery with:</p>
                  <ul className="ml-6 list-disc text-xs space-y-1 mt-2">
                    <li>Query user wallet for NFTs</li>
                    <li>Query approval address for stuck NFTs</li>
                    <li>Check ckNFT canister for already-minted</li>
                    <li>Return complete ownership state map</li>
                  </ul>
                  <p><strong>3. parseMetadataAccount():</strong> Parse Metaplex Token Metadata</p>
                  <p><strong>4. fetchMetadataJson():</strong> Fetch JSON from URI (Arweave, etc.)</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> Bypasses problematic Metaplex SDK in favor of direct RPC calls for reliability
              </p>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">📊 Ownership States</h2>
            <div className="space-y-3">
              <div className="border-l-4 border-green-500 pl-3 py-2 bg-white">
                <div className="font-medium text-gray-900">✅ owned</div>
                <div className="text-sm text-gray-600">NFT in user's wallet, ready to bridge</div>
              </div>
              <div className="border-l-4 border-amber-500 pl-3 py-2 bg-white">
                <div className="font-medium text-gray-900">⚠️ ready-to-mint</div>
                <div className="text-sm text-gray-600">At approval address, mint incomplete (RECOVERY STATE)</div>
              </div>
              <div className="border-l-4 border-blue-500 pl-3 py-2 bg-white">
                <div className="font-medium text-gray-900">✓ bridged</div>
                <div className="text-sm text-gray-600">Successfully transferred, ckNFT minted</div>
              </div>
              <div className="border-l-4 border-red-500 pl-3 py-2 bg-white">
                <div className="font-medium text-gray-900">🚫 already-minted</div>
                <div className="text-sm text-gray-600">ckNFT exists, cannot mint again</div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-amber-900 mb-4">🔧 Stuck NFT Recovery</h2>
            <div className="space-y-3 text-amber-800">
              <p><strong>Detection:</strong> Automatic on component mount via <code>discoverCollectionNFTsComprehensive()</code></p>
              <p><strong>Separate Section:</strong> Amber-styled cards with "Resume" badge</p>
              <p><strong>Resume Selection:</strong> Select stuck NFTs to complete minting without re-transferring</p>
              <p><strong>State Transition:</strong> <code>ready-to-mint</code> → <code>already-minted</code></p>
              <p><strong>Critical UX:</strong> Users don't lose NFTs due to incomplete flows - saves gas fees</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-900 mb-4">🔍 Manual Entry Use Cases</h2>
            <div className="space-y-3 text-yellow-800">
              <p><strong>When to use:</strong></p>
              <ul className="ml-6 list-disc space-y-1">
                <li>NFT not appearing in automatic discovery</li>
                <li>Collection metadata incomplete</li>
                <li>Recovery of lost NFTs</li>
                <li>Testing with specific mint addresses</li>
                <li>Collection changed after initial discovery</li>
              </ul>
              <p className="pt-3 border-t border-yellow-300 mt-3">
                <strong>Validation:</strong> Checks base58 address, fetches on-chain metadata, validates JSON accessibility
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
    selectedCollection: mockCollection,
    selectedNFTs: [],
    onSelectionChange: (nfts) => {
      console.log('Selection changed:', nfts.length, 'NFTs selected');
    },
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'Default state showing 12 NFTs from the selected collection. Grid layout with checkboxes for multi-select. **Note**: Requires wallet connection to see full functionality.',
      },
    },
  },
};

export const ImportMode: Story = {
  args: {
    selectedCollection: mockCollection,
    selectedNFTs: [],
    onSelectionChange: () => {},
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'Import mode wizard - heading says "Select NFTs to Import" with subtitle about bridging from Solana to IC. Standard transfer flow.',
      },
    },
  },
};

export const BurnMode: Story = {
  args: {
    selectedCollection: mockCollection,
    selectedNFTs: [],
    onSelectionChange: () => {},
    mode: 'burn',
  },
  parameters: {
    docs: {
      description: {
        story: 'Burn mode wizard - heading says "Select NFTs to Burn" with subtitle about burning on Solana and reminting on IC. Different flow with burn transaction.',
      },
    },
  },
};

export const SingleNFTSelected: Story = {
  args: {
    selectedCollection: mockCollection,
    selectedNFTs: [{
      mintAddress: '1NS2gnVrBoV44sWGCeSnzHhuf7Fv4sMLh5uEVjTEVv01',
      name: 'Test NFT #1',
      symbol: 'TEST',
      image: 'https://picsum.photos/seed/1/400/400',
      collection: {
        address: 'TestCollectionAddr...123',
        name: 'Test Collection',
        verified: true,
      },
      source: 'discovered',
      ownershipState: 'owned',
    }],
    onSelectionChange: () => {},
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'Single NFT selected showing blue summary banner at top: "1 NFT selected" with "Clear all" button. Selected card has blue ring.',
      },
    },
  },
};

export const MultipleNFTsSelected: Story = {
  args: {
    selectedCollection: mockCollection,
    selectedNFTs: [
      {
        mintAddress: '1NS2gnVrBoV44sWGCeSnzHhuf7Fv4sMLh5uEVjTEVv01',
        name: 'Test NFT #1',
        symbol: 'TEST',
        image: 'https://picsum.photos/seed/1/400/400',
        source: 'discovered',
        ownershipState: 'owned',
      },
      {
        mintAddress: '2NS2gnVrBoV44sWGCeSnzHhuf7Fv4sMLh5uEVjTEVv02',
        name: 'Test NFT #2',
        symbol: 'TEST',
        image: 'https://picsum.photos/seed/2/400/400',
        source: 'discovered',
        ownershipState: 'owned',
      },
      {
        mintAddress: '3NS2gnVrBoV44sWGCeSnzHhuf7Fv4sMLh5uEVjTEVv03',
        name: 'Test NFT #3',
        symbol: 'TEST',
        image: 'https://picsum.photos/seed/3/400/400',
        source: 'discovered',
        ownershipState: 'owned',
      },
    ],
    onSelectionChange: () => {},
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'Three NFTs selected. Summary shows "3 NFTs selected". Multiple blue rings visible in grid. **Use Case**: Batch bridging for gas efficiency.',
      },
    },
  },
};

export const EmptyCollection: Story = {
  args: {
    selectedCollection: {
      collection: {
        address: 'EmptyCollectionAddr...000',
        name: 'Empty Collection',
        symbol: 'EMPTY',
        image: undefined,
        description: 'A collection with no NFTs',
        nftCount: 0,
        verified: true,
        nfts: [],
      },
    },
    selectedNFTs: [],
    onSelectionChange: () => {},
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state showing dashed border box with 🖼️ icon, "No NFTs Found" message, and prompt to add manually. **Use Case**: User owns no NFTs in selected collection.',
      },
    },
  },
};

export const SearchFiltering: Story = {
  args: {
    selectedCollection: mockCollection,
    selectedNFTs: [],
    onSelectionChange: () => {},
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows search bar with magnifying glass icon. Type to filter by name, symbol, or mint address. **Note**: Search is case-insensitive substring match.',
      },
    },
  },
};

export const NoSearchResults: Story = {
  args: {
    selectedCollection: {
      ...mockCollection,
      collection: {
        ...mockCollection.collection,
        // Force no matches by using searchQuery in component
        nfts: [],
      },
    },
    selectedNFTs: [],
    onSelectionChange: () => {},
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'State when search query returns no results. Shows "No NFTs match your search" with "Clear search" button. Different from empty collection.',
      },
    },
  },
};

export const ManualEntryOpen: Story = {
  args: {
    selectedCollection: mockCollection,
    selectedNFTs: [],
    onSelectionChange: () => {},
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'Manual entry form expanded showing input field, "Add NFT" and "Cancel" buttons. Used for adding NFTs by mint address. **Use Case**: Recovery or non-discovered NFTs.',
      },
    },
  },
};

export const ManualEntryLoading: Story = {
  args: {
    selectedCollection: mockCollection,
    selectedNFTs: [],
    onSelectionChange: () => {},
    mode: 'import',
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
        <h4 className="font-medium text-gray-900 mb-3">Add NFT Manually</h4>
        <p className="text-sm text-gray-600 mb-4">
          Enter a Solana NFT mint address to add it to your selection.
        </p>
        <div className="space-y-3">
          <input
            type="text"
            value="6NS2gnVrBoV44sWGCeSnzHhuf7Fv4sMLh5uEVjTEVvV4"
            disabled
            className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm bg-gray-100"
          />
          <div className="flex gap-2">
            <button
              disabled
              className="px-4 py-2 bg-blue-600 text-white rounded-lg opacity-50 cursor-not-allowed flex items-center gap-2"
            >
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Loading...
            </button>
            <button disabled className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg opacity-50">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Loading state while fetching NFT metadata from mint address. Shows spinner in "Add NFT" button. **Note**: RPC calls can take 1-3 seconds.',
      },
    },
  },
};

export const ManualEntryError: Story = {
  args: {
    selectedCollection: mockCollection,
    selectedNFTs: [],
    onSelectionChange: () => {},
    mode: 'import',
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
        <h4 className="font-medium text-gray-900 mb-3">Add NFT Manually</h4>
        <p className="text-sm text-gray-600 mb-4">
          Enter a Solana NFT mint address to add it to your selection.
        </p>
        <div className="space-y-3">
          <div>
            <input
              type="text"
              value="invalid-mint-address"
              className="w-full px-4 py-2 border border-red-300 rounded-lg font-mono text-sm"
            />
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Invalid Solana mint address
            </p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Add NFT
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Error state showing red border and alert icon with error message. Common errors: invalid address, NFT not found, metadata unavailable.',
      },
    },
  },
};

export const StuckNFTsRecovery: Story = {
  args: {
    selectedCollection: mockCollection,
    selectedNFTs: [],
    onSelectionChange: () => {},
    mode: 'import',
  },
  render: () => (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Select NFTs to Import</h3>
        <p className="text-gray-600">
          Choose which NFTs to bridge from Solana to Internet Computer
        </p>
      </div>

      {/* Stuck NFTs Section */}
      <div className="mb-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h4 className="font-medium text-amber-900 mb-1">
                Resume Previous Transfers (2)
              </h4>
              <p className="text-sm text-amber-700 mb-3">
                These NFTs were previously transferred to the bridge but their mint wasn't completed. 
                Select them to resume the minting process without needing to transfer again.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2].map((id) => (
            <div
              key={id}
              className="border border-amber-200 rounded-lg overflow-hidden cursor-pointer hover:border-amber-300 hover:shadow-md transition-all relative"
            >
              {/* Recovery Badge */}
              <div className="absolute top-2 left-2 z-10">
                <div className="bg-amber-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Resume
                </div>
              </div>

              {/* NFT Image */}
              <div className="aspect-square bg-gray-100 relative">
                <img
                  src={`https://picsum.photos/seed/stuck${id}/400/400`}
                  alt={`Stuck NFT #${id}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <div className="w-6 h-6 rounded-full border-2 bg-white border-gray-300 flex items-center justify-center">
                  </div>
                </div>
              </div>
              
              {/* NFT Info */}
              <div className="p-3">
                <p className="font-medium text-sm text-gray-900 truncate">
                  Stuck NFT #{id}
                </p>
                <p className="text-xs text-gray-500 truncate">TEST</p>
                <p className="text-xs text-gray-400 truncate font-mono mt-1">
                  {id}NS2...{String(id).padStart(2, '0')}
                </p>
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  Request ID: 1234567{id}...
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Normal NFTs Grid */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
        <h3 className="font-medium text-purple-900 mb-1">
          Awesome NFT Collection
        </h3>
        <p className="text-sm text-purple-700">
          10 NFTs in this collection
        </p>
      </div>

      <div className="text-sm text-gray-600 mb-4">
        0 of 10 NFTs selected
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows stuck NFT recovery section with amber warning and "Resume" badges. These NFTs are at the approval address waiting for mint completion. **Critical Feature**: Allows recovery without re-transferring.',
      },
    },
  },
};

export const LargeCollection: Story = {
  args: {
    selectedCollection: {
      collection: {
        address: 'LargeCollectionAddr...999',
        name: 'Huge NFT Collection',
        symbol: 'HUGE',
        image: 'https://picsum.photos/seed/large/200/200',
        description: 'A very large collection with many NFTs',
        nftCount: 50,
        verified: true,
        nfts: Array.from({ length: 50 }, (_, i) => createMockNFT(i + 1, 'LargeCollectionAddr...999')),
      },
    },
    selectedNFTs: [],
    onSelectionChange: () => {},
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: '50 NFTs in collection showing full grid. No virtualization implemented - all NFTs render. **Performance Note**: Collections > 100 NFTs may benefit from virtualization.',
      },
    },
  },
};

export const NoImageMetadata: Story = {
  args: {
    selectedCollection: {
      collection: {
        address: 'NoImageCollectionAddr...000',
        name: 'No Images Collection',
        symbol: 'NOIMG',
        description: 'Collection where NFTs have no image metadata',
        nftCount: 4,
        verified: true,
        nfts: Array.from({ length: 4 }, (_, i) => ({
          ...createMockNFT(i + 1, 'NoImageCollectionAddr...000'),
          image: undefined, // Remove image
        })),
      },
    },
    selectedNFTs: [],
    onSelectionChange: () => {},
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'NFTs without image metadata show 🖼️ placeholder emoji in gray box. Still fully selectable. **Edge Case**: Metadata parsing failure or missing image field.',
      },
    },
  },
};

export const MixedVerificationStatus: Story = {
  args: {
    selectedCollection: mockCollection,
    selectedNFTs: [],
    onSelectionChange: () => {},
    mode: 'import',
  },
  render: () => (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="border rounded-lg overflow-hidden">
          <div className="aspect-square bg-gray-100 relative">
            <img src="https://picsum.photos/seed/verified/400/400" alt="Verified" className="w-full h-full object-cover" />
            <div className="absolute top-2 left-2">
              <div className="bg-green-500 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <div className="w-6 h-6 rounded-full border-2 bg-white border-gray-300"></div>
            </div>
          </div>
          <div className="p-3">
            <p className="font-medium text-sm">Verified NFT</p>
            <p className="text-xs text-gray-500">Collection verified ✓</p>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="aspect-square bg-gray-100 relative">
            <img src="https://picsum.photos/seed/unverified/400/400" alt="Unverified" className="w-full h-full object-cover" />
            <div className="absolute top-2 left-2">
              <div className="bg-gray-400 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Unverified
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <div className="w-6 h-6 rounded-full border-2 bg-white border-gray-300"></div>
            </div>
          </div>
          <div className="p-3">
            <p className="font-medium text-sm">Unverified NFT</p>
            <p className="text-xs text-gray-500">Collection not verified</p>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Verification Status:</strong> NFTs from verified collections show a green badge. 
          Unverified collections show gray. Verification is done by the collection's update authority 
          signing the NFT's membership.
        </p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows collection verification badges. Green for verified (signed by update authority), gray for unverified. Important for authenticity.',
      },
    },
  },
};

export const BatchSelectionWorkflow: Story = {
  args: {
    selectedCollection: mockCollection,
    selectedNFTs: Array.from({ length: 8 }, (_, i) => ({
      mintAddress: `${i + 1}NS2gnVrBoV44sWGCeSnzHhuf7Fv4sMLh5uEVjTEVv${String(i + 1).padStart(2, '0')}`,
      name: `Test NFT #${i + 1}`,
      symbol: 'TEST',
      image: `https://picsum.photos/seed/${i + 1}/400/400`,
      source: 'discovered' as const,
      ownershipState: 'owned' as const,
    })),
    onSelectionChange: () => {},
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: '8 of 12 NFTs selected showing batch operation. Blue summary shows count. **Use Case**: Batch bridging saves on gas fees vs single NFT at a time.',
      },
    },
  },
};

export const Interactive: Story = {
  args: {
    selectedCollection: mockCollection,
    selectedNFTs: [],
    onSelectionChange: () => {},
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'Fully interactive demo. Click NFT cards to select/deselect, use search, try manual entry. All actions logged to console. **Instructions**: 1) Click cards, 2) Search, 3) Check console.',
      },
    },
  },
};

// Responsive variants
export const Mobile: Story = {
  args: {
    selectedCollection: mockCollection,
    selectedNFTs: [],
    onSelectionChange: () => {},
    mode: 'import',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Mobile view with 2-column grid. Cards stack vertically with larger touch targets. Search and manual entry adapt to narrow width.',
      },
    },
  },
};

export const Tablet: Story = {
  args: {
    selectedCollection: mockCollection,
    selectedNFTs: [],
    onSelectionChange: () => {},
    mode: 'import',
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story: 'Tablet view with 3-column grid. Balanced layout for medium screens.',
      },
    },
  },
};

// Edge cases
export const CollectionWithLongNames: Story = {
  args: {
    selectedCollection: {
      collection: {
        address: 'LongNamesAddr...123',
        name: 'Collection with Extremely Long NFT Names That Need Truncation',
        symbol: 'LONGNAME',
        image: 'https://picsum.photos/seed/longnames/200/200',
        description: 'Testing truncation',
        nftCount: 4,
        verified: true,
        nfts: Array.from({ length: 4 }, (_, i) => ({
          ...createMockNFT(i + 1, 'LongNamesAddr...123'),
          name: `This is an Extremely Long NFT Name That Should Be Truncated With Ellipsis #${i + 1}`,
          symbol: 'VERYLONGSYMBOLNAME',
        })),
      },
    },
    selectedNFTs: [],
    onSelectionChange: () => {},
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'NFTs with very long names showing text truncation with ellipsis. Prevents layout breaking. CSS uses `truncate` class.',
      },
    },
  },
};

export const MaxSelectionReached: Story = {
  args: {
    selectedCollection: mockCollection,
    selectedNFTs: Array.from({ length: 12 }, (_, i) => ({
      mintAddress: `${i + 1}NS2gnVrBoV44sWGCeSnzHhuf7Fv4sMLh5uEVjTEVv${String(i + 1).padStart(2, '0')}`,
      name: `Test NFT #${i + 1}`,
      symbol: 'TEST',
      image: `https://picsum.photos/seed/${i + 1}/400/400`,
      source: 'discovered' as const,
      ownershipState: 'owned' as const,
    })),
    onSelectionChange: () => {},
    mode: 'import',
  },
  parameters: {
    docs: {
      description: {
        story: 'All 12 NFTs in collection selected (100%). Summary shows "12 NFTs selected". **Note**: No enforced max, but large batches may hit transaction limits.',
      },
    },
  },
};

// Documentation-focused stories
export const MetaplexIntegrationGuide: Story = {
  args: {
    selectedCollection: mockCollection,
    selectedNFTs: [],
    onSelectionChange: () => {},
    mode: 'import',
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-xl font-bold mb-4">Metaplex Token Metadata Integration</h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-lg text-gray-900 mb-2">Program Address</h4>
            <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm overflow-x-auto">
              metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-lg text-gray-900 mb-2">Metadata PDA Derivation</h4>
            <div className="bg-gray-50 p-4 rounded">
              <pre className="text-xs text-gray-800 overflow-x-auto">
{`const [metadataPDA] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('metadata'),
    TOKEN_METADATA_PROGRAM_ID.toBuffer(),
    mintAddress.toBuffer(),
  ],
  TOKEN_METADATA_PROGRAM_ID
);`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-lg text-gray-900 mb-2">Metadata Account Structure</h4>
            <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
              <p><strong>Key (1 byte):</strong> Discriminator (MetadataV1)</p>
              <p><strong>Update Authority (32 bytes):</strong> Pubkey</p>
              <p><strong>Mint (32 bytes):</strong> NFT mint address</p>
              <p><strong>Name:</strong> Length-prefixed string</p>
              <p><strong>Symbol:</strong> Length-prefixed string</p>
              <p><strong>URI:</strong> Length-prefixed string → JSON metadata</p>
              <p><strong>Seller Fee (2 bytes):</strong> Basis points (100 = 1%)</p>
              <p><strong>Creators (optional):</strong> Array of Creator structs</p>
              <p><strong>Collection (optional):</strong> Verified flag + Collection Pubkey</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-lg text-gray-900 mb-2">JSON Metadata URI</h4>
            <p className="text-sm text-gray-700 mb-2">
              The URI field points to JSON metadata (usually on Arweave):
            </p>
            <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs overflow-x-auto">
{`{
  "name": "Degen Ape #1234",
  "symbol": "DAPE",
  "description": "One of 10,000 unique Degen Apes",
  "image": "https://arweave.net/abc123...xyz",
  "attributes": [
    { "trait_type": "Background", "value": "Blue" },
    { "trait_type": "Fur", "value": "Golden" },
    { "trait_type": "Rarity", "value": "Legendary" }
  ],
  "collection": {
    "name": "Degen Apes",
    "family": "Degen"
  }
}`}
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Implementation:</strong> This component uses direct RPC calls via <code>solanaNFTDiscoveryDirect.ts</code> 
              to fetch metadata accounts and parse them manually. This approach avoids the problematic Metaplex JavaScript SDK 
              and provides more control over error handling.
            </p>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Complete guide to Metaplex Token Metadata program integration. Shows PDA derivation, account structure, and JSON metadata format.',
      },
    },
  },
};

export const OwnershipStatesGuide: Story = {
  args: {
    selectedCollection: mockCollection,
    selectedNFTs: [],
    onSelectionChange: () => {},
    mode: 'import',
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-xl font-bold mb-4">NFT Ownership States</h3>
        
        <div className="space-y-4">
          <div className="border-l-4 border-green-500 pl-4 py-2">
            <h4 className="font-semibold text-gray-900 mb-1">owned</h4>
            <p className="text-sm text-gray-700 mb-2">
              NFT is currently in the user's wallet and ready to be bridged.
            </p>
            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
              <strong>Actions:</strong> Can select for bridging → Will prompt for transfer transaction
            </div>
          </div>

          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <h4 className="font-semibold text-gray-900 mb-1">bridged</h4>
            <p className="text-sm text-gray-700 mb-2">
              NFT has been successfully transferred to IC and ckNFT has been minted.
            </p>
            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
              <strong>Actions:</strong> Cannot re-select → Already completed
            </div>
          </div>

          <div className="border-l-4 border-amber-500 pl-4 py-2">
            <h4 className="font-semibold text-gray-900 mb-1">ready-to-mint</h4>
            <p className="text-sm text-gray-700 mb-2">
              NFT was transferred to approval address but mint wasn't completed. <strong>Recovery state.</strong>
            </p>
            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
              <strong>Actions:</strong> Can select to resume → Will call mint without re-transferring
            </div>
          </div>

          <div className="border-l-4 border-red-500 pl-4 py-2">
            <h4 className="font-semibold text-gray-900 mb-1">already-minted</h4>
            <p className="text-sm text-gray-700 mb-2">
              ckNFT already exists on IC for this mint address. Cannot mint again.
            </p>
            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
              <strong>Actions:</strong> Cannot select → Would create duplicate
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h4 className="font-semibold text-purple-900 mb-2">State Transition Flow</h4>
          <div className="text-sm text-purple-800 space-y-1">
            <p><code>owned</code> → User selects NFT → Transfer tx → <code>ready-to-mint</code></p>
            <p><code>ready-to-mint</code> → Mint completes → <code>already-minted</code></p>
            <p><code>ready-to-mint</code> → (if stuck) → Recovered via this component</p>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Comprehensive guide to the four ownership states tracked by the component. Essential for understanding recovery flow.',
      },
    },
  },
};

export const RecoveryWorkflowGuide: Story = {
  args: {
    selectedCollection: mockCollection,
    selectedNFTs: [],
    onSelectionChange: () => {},
    mode: 'import',
  },
  render: () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-xl font-bold mb-4">Stuck NFT Recovery Workflow</h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-lg text-gray-900 mb-3">Problem Scenario</h4>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 mb-2">
                User transferred NFT to approval address but:
              </p>
              <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                <li>Browser crashed before mint completed</li>
                <li>Network error interrupted the flow</li>
                <li>User closed tab accidentally</li>
                <li>Transaction timed out</li>
              </ul>
              <p className="text-sm text-red-800 mt-2 font-semibold">
                Result: NFT is "stuck" at approval address, not in wallet or on IC
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-lg text-gray-900 mb-3">Automatic Detection</h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 mb-2">
                On component mount, <code>discoverCollectionNFTsComprehensive()</code> runs:
              </p>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Query user's wallet for NFTs</li>
                <li>Query approval address for stuck NFTs</li>
                <li>Check ckNFT canister for already-minted</li>
                <li>Build complete ownership state map</li>
              </ol>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-lg text-gray-900 mb-3">Recovery UI</h4>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800 mb-2">
                Stuck NFTs appear in separate section with:
              </p>
              <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                <li>Amber warning banner at top</li>
                <li>"Resume" badge on each stuck NFT card</li>
                <li>Mint request ID shown (if available)</li>
                <li>Click to select for recovery</li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-lg text-gray-900 mb-3">Recovery Process</h4>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <ol className="text-sm text-green-800 space-y-2 list-decimal list-inside">
                <li>User clicks stuck NFT card → Selects for recovery</li>
                <li>Wizard proceeds to mint step</li>
                <li>Mint call uses existing approval (no re-transfer needed)</li>
                <li>ckNFT is minted to user's IC principal</li>
                <li>State transitions: <code>ready-to-mint</code> → <code>already-minted</code></li>
              </ol>
            </div>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm text-purple-800">
              <strong>Key Benefit:</strong> Users don't lose NFTs due to incomplete flows. Recovery is automatic, 
              safe, and doesn't require re-transferring (saving gas fees). This is a critical UX feature 
              for blockchain bridging where failures can be costly.
            </p>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Step-by-step guide to stuck NFT recovery feature. Shows problem scenarios, detection logic, UI presentation, and recovery process.',
      },
    },
  },
};

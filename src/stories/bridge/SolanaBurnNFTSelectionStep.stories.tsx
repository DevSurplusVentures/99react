import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SolanaBurnNFTSelectionStep } from '../../components/bridge/SolanaBurnNFTSelectionStep';
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
  title: 'Bridge/SolanaBurnNFTSelectionStep',
  component: SolanaBurnNFTSelectionStep,
  decorators: [withProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## SolanaBurnNFTSelectionStep Component

NFT selection step for the Solana burn/return wizard. Allows users to select ONE Solana NFT to burn and return to the Internet Computer.

### Key Differences from Import Flow

**Import Flow (SolanaNFTSelectionStep)**:
- Shows ALL NFTs from selected collection
- Multi-select (batch import)
- Focuses on bridging new NFTs Solana → IC

**Burn Flow (SolanaBurnNFTSelectionStep)**:
- Shows only BURNABLE NFTs (from orchestrator-controlled collections)
- Single-select only
- Focuses on returning NFTs that were cast from IC
- Prominent burn warning displayed

### Architecture

#### Burnable NFT Criteria
- NFT must be from a collection deployed by the orchestrator
- Collection was created via \`icrc99_cast\` from an IC ckNFT
- User owns the NFT on Solana (either from original cast or secondary purchase)
- NFT can be returned to IC by burning on Solana

#### Workflow
1. **Query User's NFTs**: Fetch all NFTs owned by connected Solana wallet
2. **Filter to Burnable**: Check which collections are orchestrator-controlled
3. **Display Options**: Show NFTs in grid with burn indicators
4. **Single Selection**: User selects ONE NFT to burn
5. **Validation**: Verify NFT ownership and burnability

### Key Features

#### NFT Discovery
- **Automatic Query**: Fetches NFTs from connected wallet
- **Collection Filtering**: Only shows orchestrator-controlled collections
- **Metadata Display**: Shows NFT name, image, collection info
- **Search**: Filter by name, mint address, or collection

#### Manual Input
- **Direct Mint Address**: Enter specific NFT mint address
- **Validation**: Queries on-chain data to verify NFT
- **Ownership Check**: Confirms user owns the NFT
- **Auto-select**: Automatically selects manually added NFT

#### Recovery Mode
- **Resume Incomplete Burns**: For NFTs already at approval address
- **Skip Transfer**: Sets \`isRecovery\` flag to skip transfer step
- **Verification**: Checks NFT is actually at approval address
- **Auto-select**: Automatically selects recovery NFT

#### View Modes
- **NFT View**: Grid of individual NFTs with images
- **Collection View**: Grouped by collection with counts
- **Toggle**: Switch between views based on preference

### State Management

#### Selection States
- **No Selection**: No NFT selected (Next button disabled)
- **NFT Selected**: One NFT selected (Next button enabled)
- **Recovery NFT**: NFT at approval address (transfer will be skipped)

#### Loading States
- **Initial Load**: Fetching NFTs from Solana RPC
- **Manual Input**: Querying specific mint address
- **Recovery Mode**: Verifying approval address ownership
- **Search/Filter**: Client-side filtering (instant)

#### Error States
- **RPC Failures**: Solana connection errors
- **Invalid Mint**: Mint address doesn't exist
- **Not Burnable**: NFT not from orchestrator collection
- **Not Owned**: User doesn't own the NFT
- **No NFTs**: User has no burnable NFTs

### Network Support
- **All Solana Networks**: Mainnet, Devnet, Testnet, Localnet
- **Network-Specific**: Only shows NFTs from selected cluster
- **Cross-Network**: Different networks have different NFT sets

### Validation

#### Pre-Burn Checks
- ✅ User owns NFT on Solana
- ✅ NFT is from orchestrator-controlled collection
- ✅ Collection exists on IC (has ckNFT counterpart)
- ✅ NFT is transferable (not frozen/revoked)

### Warning Messages
- **Destructive Action**: Clear warning that burning is irreversible
- **Collection Info**: Shows which IC collection NFT will return to
- **Gas Costs**: Indicates SOL required for burn transaction
        `,
      },
    },
  },
  argTypes: {
    cluster: {
      description: 'Solana network cluster',
      control: { type: 'select' },
      options: ['mainnet-beta', 'devnet', 'testnet', 'localnet']
    },
    onSelectionChange: {
      description: 'Callback when selection changes',
      action: 'selection changed'
    },
    className: {
      description: 'Additional CSS classes',
      control: { type: 'text' }
    }
  },
  args: {
    onSelectionChange: fn()
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SolanaBurnNFTSelectionStep>;

export default meta;
type Story = StoryObj<typeof meta>;

// ===== DOCUMENTATION =====

export const Docs: Story = {
  name: '📖 Documentation',
  args: {
    cluster: 'devnet',
  },
  decorators: [],
  parameters: {
    docs: {
      page: () => (
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">SolanaBurnNFTSelectionStep Component</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              The <code>SolanaBurnNFTSelectionStep</code> allows users to select Solana NFTs for the burn-and-mint 
              workflow where NFTs are permanently destroyed on Solana and re-created on IC.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">🎯 Primary Purpose</h2>
              <ul className="space-y-2 text-blue-800">
                <li>• Discover all user's Solana NFTs</li>
                <li>• Display with images and metadata</li>
                <li>• Select NFT for burn operation</li>
                <li>• Warn about irreversible destruction</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-3">✨ Key Features</h2>
              <ul className="space-y-2 text-green-800">
                <li>• Single-selection (one NFT at a time)</li>
                <li>• Metaplex metadata parsing</li>
                <li>• Collection grouping</li>
                <li>• Search & filter capability</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🔥 Burn Workflow Context</h2>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-red-300">
                <div className="font-medium text-gray-900 mb-2">⚠️ Permanent Destruction</div>
                <div className="text-sm text-gray-700">
                  Selected NFT will be <strong>burned (destroyed)</strong> on Solana - this cannot be undone!
                  <div className="mt-2 text-xs bg-red-50 p-2 rounded">
                    Only use burn workflow for NFTs you want to permanently migrate to IC
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-blue-300">
                <div className="font-medium text-gray-900 mb-2">🎯 Use Cases for Burning</div>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>• Full migration from Solana to IC ecosystem</p>
                  <p>• NFTs with no return-to-Solana requirement</p>
                  <p>• Consolidating NFTs onto single chain</p>
                  <p>• Governance NFTs used exclusively on IC</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">🆚 Burn vs Import Selection</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-orange-300">
                <div className="font-medium text-gray-900 mb-2">🔥 Burn (This Component)</div>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>Selection:</strong> Single NFT only</p>
                  <p><strong>Source:</strong> User's wallet</p>
                  <p><strong>Warning:</strong> Prominent destruction alerts</p>
                  <p><strong>Result:</strong> NFT destroyed on Solana</p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-300">
                <div className="font-medium text-gray-900 mb-2">🔄 Import (Standard)</div>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>Selection:</strong> Multiple NFTs</p>
                  <p><strong>Source:</strong> Grouped by collection</p>
                  <p><strong>Warning:</strong> Transfer notices</p>
                  <p><strong>Result:</strong> NFT locked in custody</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-amber-900 mb-4">📋 Selection Requirements</h2>
            <div className="space-y-3 text-amber-800">
              <p><strong>Ownership:</strong> NFT must be in user's connected Solana wallet</p>
              <p><strong>Metadata:</strong> Valid Metaplex metadata (name, image, collection)</p>
              <p><strong>Network Match:</strong> Wallet must be on same cluster (devnet/mainnet)</p>
              <p><strong>Single Selection:</strong> Only one NFT can be burned at a time (safety measure)</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-900 mb-4">🔍 NFT Discovery</h2>
            <div className="space-y-3 text-yellow-800">
              <p><strong>Metaplex Query:</strong> Fetches all NFTs from user's wallet via Metaplex SDK</p>
              <p><strong>Metadata Parsing:</strong> Reads on-chain metadata + JSON from URI (Arweave, etc.)</p>
              <p><strong>Collection Grouping:</strong> Groups NFTs by Metaplex collection for organization</p>
              <p><strong>Image Loading:</strong> Lazy loads images for performance</p>
              <p className="text-sm pt-2 border-t border-yellow-300 mt-3">
                <strong>Note:</strong> Discovery may take 5-15 seconds depending on wallet size and RPC speed
              </p>
            </div>
          </div>
        </div>
      )
    }
  }
};

// Story: Default - Devnet
export const Default: Story = {
  args: {
    cluster: 'devnet',
  },
};

// Story: Mainnet Network
export const MainnetNetwork: Story = {
  args: {
    cluster: 'mainnet-beta',
  },
};

// Story: Testnet Network
export const TestnetNetwork: Story = {
  args: {
    cluster: 'testnet',
  },
};

// Story: Localnet Network
export const LocalnetNetwork: Story = {
  args: {
    cluster: 'localnet',
  },
};

// Story: With Custom Class
export const WithCustomClass: Story = {
  args: {
    cluster: 'devnet',
    className: 'custom-burn-step',
  },
};

// Story: Mobile View
export const Mobile: Story = {
  args: {
    cluster: 'devnet',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1'
    }
  }
};

// Story: Tablet View
export const Tablet: Story = {
  args: {
    cluster: 'devnet',
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet'
    }
  }
};

// Story: Documentation - Burn vs Import
export const BurnVsImport: Story = {
  args: {
    cluster: 'devnet',
  },
  parameters: {
    docs: {
      description: {
        story: `
### Burn Flow vs Import Flow Comparison

| Feature | Import Flow | Burn Flow |
|---------|-------------|-----------|
| **Purpose** | Bridge NEW Solana NFTs to IC | Return CAST Solana NFTs to IC |
| **Selection** | Multi-select (batch) | Single-select only |
| **NFT Source** | ANY collection | Orchestrator-controlled only |
| **Collection Step** | Yes (select collection first) | No (automatic from NFT) |
| **Direction** | Solana → IC (new ckNFT) | Solana → IC (existing ckNFT) |
| **On Solana** | Transfer to approval address | Burn/transfer to approval address |
| **On IC** | Mint new ckNFT | Un-freeze/return existing ckNFT |
| **Reversible** | No (bridged permanently) | Yes (can cast again) |
| **Use Case** | First-time bridge | Return after selling on Solana |

### Why Single-Select for Burns?

Burn operations are typically one-at-a-time because:
1. **Cost Consideration**: Each burn requires SOL gas + cycles
2. **Confirmation Flow**: User needs clear warning for each burn
3. **Error Isolation**: Burn failures easier to track individually
4. **User Experience**: Clearer to show one burn at a time
5. **Recovery Simplicity**: Easier to resume if transaction fails

### Orchestrator-Controlled Collections

Only certain Solana collections can be burned:
- ✅ Collections created via \`icrc99_cast\`
- ✅ Collection's update authority is orchestrator
- ✅ Collection has IC ckNFT counterpart
- ❌ Random Solana collections (use import flow instead)
        `
      }
    }
  }
};

// Story: Documentation - Recovery Mode
export const RecoveryMode: Story = {
  args: {
    cluster: 'devnet',
  },
  parameters: {
    docs: {
      description: {
        story: `
### Recovery Mode

Recovery mode handles incomplete burn operations where the NFT is already at the approval address.

**When to Use Recovery**:
1. **Page Refresh**: User refreshed during burn wizard
2. **Transaction Timeout**: Solana transaction didn't confirm in time
3. **Browser Crash**: Browser closed during burn process
4. **Manual Recovery**: User knows mint address of stuck NFT

**How Recovery Works**:
1. User clicks "Recovery Mode" button
2. Enters mint address of NFT at approval address
3. Component queries NFT metadata
4. Verifies NFT is actually at approval address
5. Sets \`isRecovery: true\` flag on selection
6. Transfer step will be skipped in wizard
7. Proceeds directly to burn/return on IC

**Recovery Flag Behavior**:
\`\`\`typescript
{
  mintAddress: "abc123...",
  isRecovery: true  // Skip transfer, already at approval address
}
\`\`\`

**Validation Checks**:
- ✅ Mint address is valid
- ✅ NFT exists on-chain
- ✅ NFT is at orchestrator's approval address
- ✅ NFT is from orchestrator-controlled collection

**Error Scenarios**:
- ❌ Mint address invalid/not found
- ❌ NFT not at approval address (still in user wallet)
- ❌ NFT already burned (doesn't exist on Solana)
- ❌ NFT not from burnable collection
        `
      }
    }
  }
};

// Story: Documentation - Manual Input
export const ManualInput: Story = {
  args: {
    cluster: 'devnet',
  },
  parameters: {
    docs: {
      description: {
        story: `
### Manual Mint Address Input

Allows users to add NFTs by entering the mint address directly.

**Use Cases**:
1. **NFT Not Showing**: RPC query missed the NFT
2. **Too Many NFTs**: User has many NFTs, faster to enter mint directly
3. **Known Address**: User knows exact NFT they want to burn
4. **Testing**: Developers testing specific NFTs

**Workflow**:
1. Click "Add by Mint Address" button
2. Enter Solana mint address (base58 string)
3. Click "Add NFT"
4. Component queries on-chain data:
   - Token metadata (name, image, etc.)
   - Collection address
   - Current owner
5. Validates:
   - ✅ Mint address is valid Solana public key
   - ✅ NFT exists on-chain
   - ✅ User owns the NFT
   - ✅ NFT is from burnable collection
6. Adds to NFT list and auto-selects
7. User can proceed with burn

**Input Validation**:
- **Format Check**: Valid base58 Solana address
- **Length Check**: Correct length (32-44 chars typically)
- **Existence Check**: NFT exists on-chain
- **Ownership Check**: Connected wallet owns the NFT

**Error Messages**:
- "Invalid mint address format"
- "NFT not found on-chain"
- "You don't own this NFT"
- "NFT not from burnable collection"
- "RPC query failed - try again"

**Example Mint Addresses**:
\`\`\`
Mainnet: 7WkR61EaDmjMyHp5yYjXG6Bunn66i43g7MkCVao6F4z
Devnet:  BK4f5d7yYHpX2YqkU3FqS9xXdE8NMwUzN6VdPqEr1234
\`\`\`
        `
      }
    }
  }
};

// Story: Documentation - NFT States
export const NFTStates: Story = {
  args: {
    cluster: 'devnet',
  },
  parameters: {
    docs: {
      description: {
        story: `
### NFT States and Indicators

Each NFT can be in different states affecting burn eligibility:

**Ownership States**:
1. **Owned**: User owns NFT in their wallet (can burn)
2. **Not Owned**: NFT owned by different wallet (cannot burn)
3. **At Approval Address**: NFT already transferred (recovery mode)
4. **Burned**: NFT no longer exists on Solana

**Collection States**:
1. **Burnable**: From orchestrator-controlled collection ✅
2. **Not Burnable**: From random collection ❌
3. **Unknown**: Collection verification pending ⏳

**Visual Indicators**:
- 🔥 **Burn Icon**: Indicates this is a burn operation
- ✅ **Verified Badge**: Collection is orchestrator-controlled
- ⚠️ **Warning**: Burn is irreversible
- 🔄 **Recovery Badge**: NFT in recovery mode
- 🔒 **Frozen**: NFT cannot be transferred (rare)

**UI States**:
- **Unselected**: Gray border, no highlight
- **Selected**: Purple border, highlighted background
- **Hover**: Slight scale up, shadow
- **Disabled**: Grayed out, cannot select

**Selection Logic**:
\`\`\`typescript
// Only one NFT can be selected at a time
const handleSelect = (nft) => {
  if (selectedNFT?.mintAddress === nft.mintAddress) {
    setSelectedNFT(null);  // Deselect
  } else {
    setSelectedNFT(nft);  // Select (replaces previous)
  }
};
\`\`\`

**Next Button State**:
- **Disabled**: No NFT selected OR validation failed
- **Enabled**: Valid burnable NFT selected
- **Loading**: Validation in progress
        `
      }
    }
  }
};

// Story: Documentation - Error Handling
export const ErrorHandling: Story = {
  args: {
    cluster: 'devnet',
  },
  parameters: {
    docs: {
      description: {
        story: `
### Error Handling

**RPC Query Failures**:
- **Symptom**: "Failed to load NFTs" error
- **Causes**: 
  * Solana RPC endpoint down
  * Rate limiting
  * Network timeout
  * Invalid RPC endpoint configuration
- **Solutions**:
  * Retry with exponential backoff
  * Switch to different RPC endpoint
  * Use manual input fallback
  * Show "Try Again" button

**Invalid Mint Address**:
- **Symptom**: "NFT not found" error
- **Causes**:
  * Typo in mint address
  * NFT doesn't exist on this network
  * NFT was burned
  * Wrong cluster selected
- **Solutions**:
  * Validate input format
  * Check network matches
  * Verify on Solscan
  * Try recovery mode if transferred

**Not Burnable**:
- **Symptom**: "Cannot burn this NFT" error
- **Causes**:
  * Collection not orchestrator-controlled
  * NFT from regular Solana project
  * Wrong collection selected
- **Solutions**:
  * Show error explaining why
  * Suggest import flow instead
  * Provide link to supported collections

**Ownership Failures**:
- **Symptom**: "You don't own this NFT" error  
- **Causes**:
  * NFT sold/transferred to another wallet
  * Wrong wallet connected
  * NFT at approval address (use recovery)
  * NFT already burned
- **Solutions**:
  * Check wallet connection
  * Verify on blockchain explorer
  * Try recovery mode
  * Connect correct wallet

**Recovery Failures**:
- **Symptom**: "Recovery verification failed"
- **Causes**:
  * NFT not at approval address yet
  * Mint address wrong
  * Approval address query failed
- **Solutions**:
  * Wait for transfer confirmation
  * Verify mint address
  * Check transaction on Solscan
  * Contact support if stuck

**Error Display Pattern**:
\`\`\`typescript
{error && (
  <div className="error-banner">
    <AlertCircle />
    <div>
      <strong>Error:</strong> {error}
      <button onClick={retry}>Try Again</button>
    </div>
  </div>
)}
\`\`\`
        `
      }
    }
  }
};

// Story: Documentation - Validation Flow
export const ValidationFlow: Story = {
  args: {
    cluster: 'devnet',
  },
  parameters: {
    docs: {
      description: {
        story: `
### NFT Validation Flow

Complete validation process before enabling burn:

**Step 1: Format Validation**
\`\`\`typescript
// Check mint address format
const isValidFormat = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mintAddress);
if (!isValidFormat) {
  throw new Error("Invalid Solana address format");
}
\`\`\`

**Step 2: On-Chain Existence**
\`\`\`typescript
// Query NFT from Solana
const nft = await queryNFTByMint(connection, mintAddress);
if (!nft) {
  throw new Error("NFT not found on-chain");
}
\`\`\`

**Step 3: Ownership Verification**
\`\`\`typescript
// Check associated token account
const ata = await getAssociatedTokenAddress(mint, publicKey);
const accountInfo = await connection.getAccountInfo(ata);
const amount = accountInfo.data.readBigUInt64LE(64);

if (amount !== BigInt(1)) {
  throw new Error("You don't own this NFT");
}
\`\`\`

**Step 4: Collection Verification**
\`\`\`typescript
// Check if collection is orchestrator-controlled
const isOrchestrator = await verifyOrchestratorCollection(
  nft.collectionAddress,
  cluster
);

if (!isOrchestrator) {
  throw new Error("NFT not from burnable collection");
}
\`\`\`

**Step 5: Transferability Check**
\`\`\`typescript
// Check if NFT can be transferred (not frozen)
const tokenAccount = await getAccount(connection, ata);
if (tokenAccount.isFrozen) {
  throw new Error("NFT is frozen and cannot be transferred");
}
\`\`\`

**Step 6: IC Collection Lookup**
\`\`\`typescript
// Verify IC ckNFT collection exists
const icCollection = await orchestrator.get_ic_collection(
  nft.collectionAddress,
  cluster
);

if (!icCollection) {
  throw new Error("No IC collection found for this Solana collection");
}
\`\`\`

**All Checks Pass** ✅
- NFT is selectable
- "Next" button enabled
- Ready to proceed with burn

**Any Check Fails** ❌
- Show specific error message
- Disable "Next" button
- Provide troubleshooting guidance
        `
      }
    }
  }
};

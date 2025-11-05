import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SolanaBridgeExecutionStep } from '../../components/bridge/SolanaBridgeExecutionStep';
import type { SelectedSolanaNFT } from '../../components/bridge/SolanaNFTSelectionStep';
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
  title: 'Bridge/SolanaBridgeExecutionStep',
  component: SolanaBridgeExecutionStep,
  decorators: [withProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## SolanaBridgeExecutionStep Component

Final execution step for the Solana import wizard. Orchestrates the complete bridging workflow.

### Bridge Workflow

**Step 1: Get Approval Address**
- Queries orchestrator for remote approval address
- Uses first NFT's contract pointer (collection address + network)
- Approval address is orchestrator-controlled Solana wallet

**Step 2: Transfer NFTs to Approval Address**
- Comprehensive ownership verification (3 locations checked)
  1. User's wallet (source)
  2. Approval address (already transferred?)
  3. IC ckNFT canister (already minted?)
- Creates associated token accounts if needed
- Uses Solana SPL Token program for transfers
- Handles recovery: skips if NFT already at approval address
- Records Solana transaction signatures

**Step 3: Approve Cycles for Minting**
- Checks existing ICRC-2 allowance
- Auto-approves if insufficient or expired
- Uses 120% of required amount (buffer for fees)
- 24-hour expiration for security

**Step 4: Mint ckNFTs on IC**
- Calls orchestrator \`mint\` method for each NFT
- Polls \`get_mint_status\` for completion
- Stores mint request IDs for recovery
- Records IC transaction IDs
- Shows detailed progress (CheckingOwner → RetrievingMetadata → Transferring → Minting → Complete)

### Key Features

#### Ownership Verification
- **User Wallet Check**: Verifies NFT is in user's associated token account
- **Approval Address Check**: Detects if already transferred (recovery scenario)
- **IC Mint Check**: Queries ckNFT canister to see if already minted
- **Decision Logic**: Skips transfers/mints based on current state

#### Error Handling
- Individual NFT failures don't stop batch processing
- Failed transfers skip minting step
- Already-minted NFTs automatically detected
- Detailed error messages with Solana logs
- Timeout protection on status polling

#### Recovery Support
- Detects NFTs already at approval address
- Resumes incomplete mint operations
- Stores mint request IDs in localStorage
- Handles page refreshes gracefully

#### Progress Tracking
- **Overall Progress**: 4 main steps with status indicators
- **Per-NFT Status**: Pending → Transferring → Minting → Completed
- **Detailed Messages**: Shows sub-steps during polling
- **Links**: Solscan for Solana TXs, IC Dashboard for canister

### State Management

#### Progress Steps
1. **Get Approval**: Query orchestrator for approval address
2. **Transfer NFTs**: Send NFTs to approval address via Solana
3. **Mint ckNFTs**: Call orchestrator to mint on IC
4. **Complete**: Show final results summary

#### NFT Status States
- **Pending**: Not yet processed
- **Transferring**: Solana transfer in progress
- **Minting**: IC mint operation in progress
- **Completed**: Successfully bridged
- **Failed**: Error during transfer or mint

### Network Configuration
- Supports all Solana networks (mainnet/devnet/testnet/localnet)
- Creates network-specific contract pointers
- Passes \`targetCluster\` to orchestrator calls

### Results Summary
- Total NFTs processed
- Successful transfers count
- Failed transfers count
- Minted ckNFTs count
- Solana transaction signatures
- IC transaction IDs
- Canister address with dashboard link
        `,
      },
    },
  },
  argTypes: {
    selectedNFTs: {
      description: 'NFTs to bridge',
      control: { type: 'object' }
    },
    canisterAddress: {
      description: 'ckNFT canister address',
      control: { type: 'text' }
    },
    mintCosts: {
      description: 'Total cycles required for minting',
      control: { type: 'text' }
    },
    targetCluster: {
      description: 'Solana network cluster',
      control: { type: 'select' },
      options: ['mainnet-beta', 'devnet', 'testnet', 'localnet']
    },
    onComplete: {
      description: 'Callback when bridge completes',
      action: 'bridge complete'
    },
    onError: {
      description: 'Callback when bridge fails',
      action: 'bridge error'
    }
  },
  args: {
    onComplete: fn(),
    onError: fn()
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SolanaBridgeExecutionStep>;

export default meta;
type Story = StoryObj<typeof meta>;

// ===== DOCUMENTATION =====

export const Docs: Story = {
  name: '📖 Documentation',
  args: {
    selectedNFTs: [],
    canisterAddress: 'bd3sg-teaaa-aaaaa-qaaba-cai',
    mintCosts: 0n,
    targetCluster: 'devnet',
    onComplete: fn(),
  },
  decorators: [],
  parameters: {
    docs: {
      page: () => (
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">SolanaBridgeExecutionStep Component</h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              The <code>SolanaBridgeExecutionStep</code> component orchestrates the complete Solana NFT bridging 
              workflow with ownership verification, SPL transfers, and IC minting operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">🎯 Primary Purpose</h2>
              <ul className="space-y-2 text-blue-800">
                <li>• Get approval address from orchestrator</li>
                <li>• Transfer NFTs to approval address</li>
                <li>• Approve cycles for minting</li>
                <li>• Mint ckNFTs on Internet Computer</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-3">✨ Key Features</h2>
              <ul className="space-y-2 text-green-800">
                <li>• Comprehensive ownership verification</li>
                <li>• Recovery scenario detection</li>
                <li>• Per-NFT status tracking</li>
                <li>• Automatic retry on failure</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🔄 Bridge Workflow (4 Steps)</h2>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-blue-300">
                <div className="font-medium text-gray-900 mb-2">1️⃣ Get Approval Address</div>
                <div className="text-sm text-gray-700">
                  Query orchestrator for remote approval address using collection's contract pointer
                  <div className="mt-2 text-xs bg-blue-50 p-2 rounded">
                    <strong>Why?</strong> Orchestrator-controlled Solana wallet that receives NFTs before minting
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-orange-300">
                <div className="font-medium text-gray-900 mb-2">2️⃣ Transfer NFTs to Approval Address</div>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>• Verify ownership (wallet, approval address, IC canister)</p>
                  <p>• Create associated token accounts if needed</p>
                  <p>• Use SPL Token program for transfers</p>
                  <p>• Skip if already transferred (recovery)</p>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-purple-300">
                <div className="font-medium text-gray-900 mb-2">3️⃣ Approve Cycles for Minting</div>
                <div className="text-sm text-gray-700">
                  Check ICRC-2 allowance, auto-approve if insufficient (120% buffer, 24hr expiration)
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-green-300">
                <div className="font-medium text-gray-900 mb-2">4️⃣ Mint ckNFTs on IC</div>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>• Call orchestrator <code>mint()</code> for each NFT</p>
                  <p>• Poll <code>get_mint_status()</code> for completion</p>
                  <p>• Track: CheckingOwner → RetrievingMetadata → Transferring → Minting → Complete</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-purple-900 mb-4">🔍 3-Location Ownership Verification</h2>
            <div className="space-y-3 text-purple-800">
              <div className="bg-white rounded-lg p-3 border border-purple-300">
                <p><strong>1. User's Wallet:</strong> Check associated token account for NFT</p>
                <p className="text-sm mt-1">Query: getTokenAccountsByOwner(userWallet, mintAddress)</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-purple-300">
                <p><strong>2. Approval Address:</strong> Check if already transferred</p>
                <p className="text-sm mt-1">Recovery scenario - skip transfer, proceed to mint</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-purple-300">
                <p><strong>3. IC ckNFT Canister:</strong> Check if already minted</p>
                <p className="text-sm mt-1">Query: icrc7_tokens_of(userPrincipal) - skip completely if exists</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-amber-900 mb-4">♻️ Recovery Support</h2>
            <div className="space-y-3 text-amber-800">
              <p><strong>Already Transferred:</strong> Detects NFTs at approval address, skips transfer step</p>
              <p><strong>Incomplete Mints:</strong> Resumes mint operations with stored mint request IDs</p>
              <p><strong>localStorage Caching:</strong> Persists state across page refreshes</p>
              <p><strong>Error Resilience:</strong> Individual failures don't stop batch processing</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-900 mb-4">📊 NFT Status States</h2>
            <div className="grid grid-cols-2 gap-3 text-yellow-800">
              <div className="bg-white rounded p-3 text-sm">
                <strong>Pending:</strong> Not yet processed
              </div>
              <div className="bg-white rounded p-3 text-sm">
                <strong>Transferring:</strong> Solana transfer in progress
              </div>
              <div className="bg-white rounded p-3 text-sm">
                <strong>Minting:</strong> IC mint operation in progress
              </div>
              <div className="bg-white rounded p-3 text-sm">
                <strong>Completed:</strong> Successfully bridged ✅
              </div>
              <div className="bg-white rounded p-3 text-sm">
                <strong>Failed:</strong> Error during transfer/mint ❌
              </div>
              <div className="bg-white rounded p-3 text-sm">
                <strong>Skipped:</strong> Already minted, no action needed
              </div>
            </div>
          </div>
        </div>
      )
    }
  }
};

// Mock NFTs
const mockNFTs: SelectedSolanaNFT[] = [
  {
    mintAddress: 'mint1abc...',
    name: 'Degen Ape #1',
    image: 'https://arweave.net/ape1.png',
    source: 'discovered',
    ownershipState: 'owned',
    collection: {
      address: 'collection123...',
      name: 'Degenerate Ape Academy',
      verified: true,
    }
  },
  {
    mintAddress: 'mint2xyz...',
    name: 'Degen Ape #2',
    image: 'https://arweave.net/ape2.png',
    source: 'discovered',
    ownershipState: 'owned',
    collection: {
      address: 'collection123...',
      name: 'Degenerate Ape Academy',
      verified: true,
    }
  }
];

const singleNFT: SelectedSolanaNFT[] = [mockNFTs[0]];

// Story: Default - Ready to Execute
export const Default: Story = {
  args: {
    selectedNFTs: mockNFTs,
    canisterAddress: 'bd3sg-teaaa-aaaaa-qaaba-cai',
    mintCosts: BigInt('2000000000000'), // 2 TC
    targetCluster: 'devnet',
  },
};

// Story: Single NFT
export const SingleNFT: Story = {
  args: {
    selectedNFTs: singleNFT,
    canisterAddress: 'bd3sg-teaaa-aaaaa-qaaba-cai',
    mintCosts: BigInt('1000000000000'), // 1 TC
    targetCluster: 'devnet',
  },
};

// Story: Multiple NFTs (5)
export const MultipleNFTs: Story = {
  args: {
    selectedNFTs: Array(5).fill(null).map((_, i) => ({
      ...mockNFTs[0],
      mintAddress: `mint${i}...`,
      name: `Degen Ape #${i + 1}`,
    })),
    canisterAddress: 'bd3sg-teaaa-aaaaa-qaaba-cai',
    mintCosts: BigInt('5000000000000'), // 5 TC
    targetCluster: 'devnet',
  },
};

// Story: Mainnet Network
export const MainnetNetwork: Story = {
  args: {
    selectedNFTs: mockNFTs,
    canisterAddress: 'bd3sg-teaaa-aaaaa-qaaba-cai',
    mintCosts: BigInt('2000000000000'),
    targetCluster: 'mainnet-beta',
  },
};

// Story: Testnet Network
export const TestnetNetwork: Story = {
  args: {
    selectedNFTs: mockNFTs,
    canisterAddress: 'bd3sg-teaaa-aaaaa-qaaba-cai',
    mintCosts: BigInt('2000000000000'),
    targetCluster: 'testnet',
  },
};

// Story: Localnet Network
export const LocalnetNetwork: Story = {
  args: {
    selectedNFTs: mockNFTs,
    canisterAddress: 'bd3sg-teaaa-aaaaa-qaaba-cai',
    mintCosts: BigInt('2000000000000'),
    targetCluster: 'localnet',
  },
};

// Story: Recovery - Some NFTs Already at Approval Address
export const RecoveryScenario: Story = {
  args: {
    selectedNFTs: [
      mockNFTs[0],
      {
        ...mockNFTs[1],
        ownershipState: 'ready-to-mint', // Already at approval address
      }
    ],
    canisterAddress: 'bd3sg-teaaa-aaaaa-qaaba-cai',
    mintCosts: BigInt('2000000000000'),
    targetCluster: 'devnet',
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates recovery scenario where some NFTs are already at the approval address. The component will skip transfer for those NFTs and proceed directly to minting.'
      }
    }
  }
};

// Story: Recovery - NFT Already Minted
export const AlreadyMinted: Story = {
  args: {
    selectedNFTs: [
      mockNFTs[0],
      {
        ...mockNFTs[1],
        ownershipState: 'already-minted', // Already minted on IC
      }
    ],
    canisterAddress: 'bd3sg-teaaa-aaaaa-qaaba-cai',
    mintCosts: BigInt('1000000000000'), // Only 1 TC needed
    targetCluster: 'devnet',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows handling of NFTs that are already minted on the IC. These are completely skipped (no transfer, no mint call).'
      }
    }
  }
};

// Story: High Cost Operation
export const HighCost: Story = {
  args: {
    selectedNFTs: Array(10).fill(null).map((_, i) => ({
      ...mockNFTs[0],
      mintAddress: `mint${i}...`,
      name: `Degen Ape #${i + 1}`,
    })),
    canisterAddress: 'bd3sg-teaaa-aaaaa-qaaba-cai',
    mintCosts: BigInt('10000000000000'), // 10 TC
    targetCluster: 'devnet',
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates handling of high-cost operations with 10 NFTs requiring 10 TC in cycles.'
      }
    }
  }
};

// Story: Mobile View
export const Mobile: Story = {
  args: {
    selectedNFTs: mockNFTs,
    canisterAddress: 'bd3sg-teaaa-aaaaa-qaaba-cai',
    mintCosts: BigInt('2000000000000'),
    targetCluster: 'devnet',
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
    selectedNFTs: mockNFTs,
    canisterAddress: 'bd3sg-teaaa-aaaaa-qaaba-cai',
    mintCosts: BigInt('2000000000000'),
    targetCluster: 'devnet',
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet'
    }
  }
};

// Story: Documentation - Workflow Details
export const WorkflowDetails: Story = {
  args: {
    selectedNFTs: mockNFTs,
    canisterAddress: 'bd3sg-teaaa-aaaaa-qaaba-cai',
    mintCosts: BigInt('2000000000000'),
    targetCluster: 'devnet',
  },
  parameters: {
    docs: {
      description: {
        story: `
### Complete Bridge Workflow

**Phase 1: Get Approval Address**
1. Component constructs contract pointer from first NFT:
   - \`tokenId\`: Derived from mint address
   - \`contract\`: Collection address (or mint if no collection)
   - \`network\`: Solana network variant (Mainnet/Devnet/Testnet/Localnet)
2. Calls \`orchestrator.get_remote_approval_address(pointer, account, spender)\`
3. Receives Solana public key (base58 string)
4. Converts to PublicKey object for transfers

**Phase 2: Transfer NFTs**
For each NFT:
1. **Verify Ownership** (3 checks):
   - Check user's associated token account (source)
   - Check approval address associated token account (recovery)
   - Check IC ckNFT canister \`icrc7_owner_of\` (already minted)
2. **Decision Logic**:
   - If already minted on IC → Skip transfer, skip mint
   - If at approval address → Skip transfer, proceed to mint
   - If in user wallet → Proceed with transfer
   - If nowhere → Mark as failed
3. **Transfer Transaction**:
   - Calculate destination ATA (associated token address)
   - Create ATA instruction if account doesn't exist
   - Add transfer instruction (amount = 1)
   - Send to wallet for signature
   - Confirm transaction on Solana
4. Record signature for result summary

**Phase 3: Approve Cycles**
1. Query cycles ledger for existing allowance
2. Check if allowance is sufficient and not expired
3. If needed, approve 120% of required cycles:
   - \`amount\`: mintCosts * 120 / 100
   - \`expires_at\`: Now + 24 hours
   - \`spender\`: Orchestrator canister principal
4. Skip if sufficient allowance already exists

**Phase 4: Mint ckNFTs**
For each NFT (excluding already-minted):
1. **Call Mint**:
   - Construct remote NFT pointer (tokenId, contract, network)
   - Pass user account for allowance check
   - Orchestrator pulls cycles from ICRC-2 allowance
2. **Poll Status** (max 60 attempts, 2s intervals):
   - Call \`get_mint_status(mintRequestId)\`
   - Track sub-states: CheckingOwner → RetrievingMetadata → Transferring → Minting
   - Wait for Complete status
   - Extract transaction IDs from result
3. **Store Recovery Data**:
   - Save mint request ID to localStorage
   - Enables recovery if page refreshes
4. Record IC transaction ID for result summary

**Phase 5: Complete**
- Show results summary with counts and links
- Provide IC Dashboard link for canister
- Show Solscan links for Solana transactions
        `
      }
    }
  }
};

// Story: Documentation - Error Handling
export const ErrorHandling: Story = {
  args: {
    selectedNFTs: mockNFTs,
    canisterAddress: 'bd3sg-teaaa-aaaaa-qaaba-cai',
    mintCosts: BigInt('2000000000000'),
    targetCluster: 'devnet',
  },
  parameters: {
    docs: {
      description: {
        story: `
### Error Handling Strategies

**Transfer Failures**
- Individual NFT transfer failures don't stop batch
- Failed NFTs marked with error status and skipped for minting
- Error messages include Solana transaction logs when available
- Common failures:
  * Insufficient SOL for transaction fees
  * NFT no longer in wallet (transferred elsewhere)
  * Associated token account issues
  * Network timeouts

**Mint Failures**
- Individual NFT mint failures don't stop batch
- Failed mints marked with error status
- Error details extracted from orchestrator response
- Common failures:
  * Insufficient cycles allowance
  * NFT not found at approval address
  * Metadata retrieval timeout
  * Ownership verification failures

**Cycles Approval Failures**
- Stops entire batch (required for all mints)
- User prompted to approve manually
- Detailed error messages shown
- Can retry after resolving issue

**Status Polling Timeouts**
- Max 60 polls (2 minutes total)
- Marked as failed with timeout message
- Mint request ID saved for manual recovery
- Can resume using recovery flow

**Recovery Mechanisms**
- Mint request IDs stored in localStorage
- Can resume incomplete operations on page refresh
- Ownership verification prevents duplicate transfers
- Already-minted NFTs automatically detected and skipped
        `
      }
    }
  }
};

// Story: Documentation - Recovery Support
export const RecoverySupport: Story = {
  args: {
    selectedNFTs: mockNFTs,
    canisterAddress: 'bd3sg-teaaa-aaaaa-qaaba-cai',
    mintCosts: BigInt('2000000000000'),
    targetCluster: 'devnet',
  },
  parameters: {
    docs: {
      description: {
        story: `
### Recovery Support

**Automatic Detection**
- **Already Transferred**: Checks approval address before transfer attempt
- **Already Minted**: Queries ckNFT canister before mint attempt
- **Partial Batch**: Handles mix of completed/pending NFTs gracefully

**Recovery Scenarios**

**Scenario 1: Page Refresh During Transfer**
- User refreshes page after some NFTs transferred
- Next execution: ownership verification detects NFTs at approval address
- Skips transfer, proceeds directly to minting
- Result: No duplicate transfers, seamless continuation

**Scenario 2: Page Refresh During Mint**
- User refreshes page after some NFTs minted
- Next execution: ownership verification queries IC canister
- Detects already-minted NFTs via \`icrc7_owner_of\`
- Skips both transfer and mint for those NFTs
- Result: No duplicate mints, only process remaining

**Scenario 3: Mint Timeout**
- Status polling times out before completion
- Mint request ID saved to localStorage
- User can check mint status later manually
- Or re-run bridge - will detect if mint completed

**Scenario 4: Network Failure**
- Solana RPC connection lost mid-batch
- Some NFTs transferred, some not
- Next execution: verifies each NFT individually
- Continues from where it left off

**LocalStorage Keys**
- \`mint_request_\${mintAddress}\`: Stores mint request ID
- Used by recovery flows to track in-progress mints
- Cleared after successful completion
        `
      }
    }
  }
};

import React, { useState } from 'react';
import type { Meta } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IdentityKitProvider } from '@nfid/identitykit/react';
import { IdentityKitAuthType } from '@nfid/identitykit';
import { AgentProvider } from '../../provider/AgentProvider';
import { useCyclesLedger } from '../../hooks/useCyclesLedger';
import { useFungibleToken } from '../../hooks/useFungibleToken';
import { useApproveToken } from '../../hooks/useTokenMutation';
import { Principal } from '@dfinity/principal';

// Query client for stories
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

// Providers wrapper
const withUtilityProviders = (Story: any) => (
  <IdentityKitProvider authType={IdentityKitAuthType.ACCOUNTS}>
    <AgentProvider network="local">
      <QueryClientProvider client={queryClient}>
        <div className="p-6 bg-gray-50 min-h-screen">
          <Story />
        </div>
      </QueryClientProvider>
    </AgentProvider>
  </IdentityKitProvider>
);

/**
 * CyclesLedgerDemo - Demonstrates useCyclesLedger hook
 */
function CyclesLedgerDemo() {
  const {
    balance,
    tokenInfo,
    formatCycles,
    hasSufficientBalance,
    approveMutation,
    isLoadingBalance,
    isLoadingTokenInfo,
    balanceError,
    tokenInfoError
  } = useCyclesLedger();

  const [approveAmount, setApproveAmount] = useState('1000000000000'); // 1T cycles
  const [spenderPrincipal, setSpenderPrincipal] = useState('ryjl3-tyaaa-aaaaa-aaaba-cai'); // NNS Governance - valid Principal

  const handleApprove = () => {
    try {
      const spender = Principal.fromText(spenderPrincipal);
      const amount = BigInt(approveAmount);
      approveMutation.mutate({ spender, amount });
    } catch (error) {
      console.error('Invalid approval parameters:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-2xl font-bold mb-4">useCyclesLedger Hook</h2>
        <p className="text-gray-600 mb-6">
          Manages cycles balance, token information, and approval operations for the Cycles Ledger.
        </p>

        {/* Token Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-semibold text-blue-800 mb-2">Token Info</h3>
            {isLoadingTokenInfo ? (
              <div className="text-blue-600">Loading...</div>
            ) : tokenInfoError ? (
              <div className="text-red-600">Error loading token info</div>
            ) : tokenInfo ? (
              <div className="space-y-1 text-sm">
                <div><strong>Name:</strong> {tokenInfo.name}</div>
                <div><strong>Symbol:</strong> {tokenInfo.symbol}</div>
                <div><strong>Decimals:</strong> {tokenInfo.decimals}</div>
              </div>
            ) : (
              <div className="text-gray-500">Connect to load</div>
            )}
          </div>

          <div className="bg-green-50 p-4 rounded">
            <h3 className="font-semibold text-green-800 mb-2">Balance</h3>
            {isLoadingBalance ? (
              <div className="text-green-600">Loading...</div>
            ) : balanceError ? (
              <div className="text-red-600">Error loading balance</div>
            ) : balance !== undefined ? (
              <div className="space-y-1 text-sm">
                <div><strong>Raw:</strong> {balance.toString()}</div>
                <div><strong>Formatted:</strong> {formatCycles(balance)} T</div>
              </div>
            ) : (
              <div className="text-gray-500">Connect to load</div>
            )}
          </div>

          <div className="bg-purple-50 p-4 rounded">
            <h3 className="font-semibold text-purple-800 mb-2">Balance Check</h3>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Has 1T cycles:</strong> {' '}
                <span className={hasSufficientBalance(BigInt(1_000_000_000_000)) ? 'text-green-600' : 'text-red-600'}>
                  {hasSufficientBalance(BigInt(1_000_000_000_000)) ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              <div>
                <strong>Has 100T cycles:</strong> {' '}
                <span className={hasSufficientBalance(BigInt(100_000_000_000_000)) ? 'text-green-600' : 'text-red-600'}>
                  {hasSufficientBalance(BigInt(100_000_000_000_000)) ? '✅ Yes' : '❌ No'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Approval Section */}
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="font-semibold mb-3">Approve Cycles Spending</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Spender Principal
              </label>
              <input
                type="text"
                value={spenderPrincipal}
                onChange={(e) => setSpenderPrincipal(e.target.value)}
                placeholder="ryjl3-tyaaa-aaaaa-aaaba-cai"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (cycles)
              </label>
              <input
                type="text"
                value={approveAmount}
                onChange={(e) => setApproveAmount(e.target.value)}
                placeholder="1000000000000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
              />
            </div>
          </div>
          
          <button
            onClick={handleApprove}
            disabled={approveMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {approveMutation.isPending ? 'Approving...' : 'Approve Spending'}
          </button>

          {approveMutation.error && (
            <div className="mt-2 text-sm text-red-600">
              Error: {String(approveMutation.error)}
            </div>
          )}

          {approveMutation.data && (
            <div className="mt-2 text-sm text-green-600">
              ✅ Approved! Transaction: {JSON.stringify(approveMutation.data)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * FungibleTokenDemo - Demonstrates useFungibleToken hook
 */
function FungibleTokenDemo() {
  const [tokenCanisterId, setTokenCanisterId] = useState('mxzaz-hqaaa-aaaar-qaada-cai'); // Example token canister
  const tokenHook = useFungibleToken(tokenCanisterId);
  
  const {
    balance,
    metadata,
    allowance,
    isLoadingBalance,
    isLoadingMetadata,
    balanceError,
    metadataError
  } = tokenHook;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-2xl font-bold mb-4">useFungibleToken Hook</h2>
        <p className="text-gray-600 mb-6">
          Interacts with ICRC-1/ICRC-2 fungible tokens for balance, metadata, and allowance management.
        </p>

        {/* Token Canister Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Token Canister ID
          </label>
          <input
            type="text"
            value={tokenCanisterId}
            onChange={(e) => setTokenCanisterId(e.target.value)}
            placeholder="mxzaz-hqaaa-aaaar-qaada-cai"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
          />
        </div>

        {/* Token Data Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded">
              <h3 className="font-semibold text-blue-800 mb-2">Token Metadata</h3>
              {isLoadingMetadata ? (
                <div className="text-blue-600">Loading metadata...</div>
              ) : metadataError ? (
                <div className="text-red-600">Error: {metadataError.message}</div>
              ) : metadata ? (
                <div className="space-y-1 text-sm">
                  <div><strong>Name:</strong> {metadata.name}</div>
                  <div><strong>Symbol:</strong> {metadata.symbol}</div>
                  <div><strong>Decimals:</strong> {metadata.decimals}</div>
                  <div><strong>Fee:</strong> {metadata.fee?.toString() || 'N/A'}</div>
                </div>
              ) : (
                <div className="text-gray-500">Connect to load metadata</div>
              )}
            </div>

            <div className="bg-green-50 p-4 rounded">
              <h3 className="font-semibold text-green-800 mb-2">Balance</h3>
              {isLoadingBalance ? (
                <div className="text-green-600">Loading balance...</div>
              ) : balanceError ? (
                <div className="text-red-600">Error: {balanceError.message}</div>
              ) : balance !== undefined ? (
                <div className="space-y-1 text-sm">
                  <div><strong>Raw:</strong> {balance.toString()}</div>
                  <div><strong>Formatted:</strong> {balance.toString()}</div>
                </div>
              ) : (
                <div className="text-gray-500">Connect to load balance</div>
              )}
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded">
            <h3 className="font-semibold text-purple-800 mb-2">Hook State</h3>
            <div className="space-y-1 text-sm">
              <div><strong>Loading Balance:</strong> {isLoadingBalance ? '⏳' : '✅'}</div>
              <div><strong>Loading Metadata:</strong> {isLoadingMetadata ? '⏳' : '✅'}</div>
              <div><strong>Has Balance Error:</strong> {balanceError ? '❌' : '✅'}</div>
              <div><strong>Has Metadata Error:</strong> {metadataError ? '❌' : '✅'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * TokenMutationDemo - Demonstrates useApproveToken hook
 */
function TokenMutationDemo() {
  const [tokenCanisterId, setTokenCanisterId] = useState('mxzaz-hqaaa-aaaar-qaada-cai');
  const [spenderPrincipal, setSpenderPrincipal] = useState('ryjl3-tyaaa-aaaaa-aaaba-cai'); // NNS Governance - valid Principal
  const [approveAmount, setApproveAmount] = useState('1000000000');
  
  const approveMutation = useApproveToken(tokenCanisterId);

  const handleApprove = () => {
    try {
      const spender = {
        owner: Principal.fromText(spenderPrincipal),
        subaccount: [] as []
      };
      
      const approveArgs = {
        spender,
        amount: BigInt(approveAmount),
        fee: [],
        memo: [],
        from_subaccount: [],
        created_at_time: [],
        expected_allowance: [],
        expires_at: []
      };
      
      approveMutation.mutate(approveArgs);
    } catch (error) {
      console.error('Invalid approval parameters:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-2xl font-bold mb-4">useApproveToken Hook</h2>
        <p className="text-gray-600 mb-6">
          Handles token approval mutations for ICRC-1/ICRC-2 tokens.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Token Canister ID
            </label>
            <input
              type="text"
              value={tokenCanisterId}
              onChange={(e) => setTokenCanisterId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Spender Principal
              </label>
              <input
                type="text"
                value={spenderPrincipal}
                onChange={(e) => setSpenderPrincipal(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                type="text"
                value={approveAmount}
                onChange={(e) => setApproveAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {approveMutation.isPending ? 'Approving...' : 'Approve Token'}
            </button>

            <div className="text-sm">
              Status: {approveMutation.isPending ? '⏳ Processing' : 
                      approveMutation.error ? '❌ Error' : 
                      approveMutation.data ? '✅ Success' : '⏸️ Ready'}
            </div>
          </div>

          {approveMutation.error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded">
              <h4 className="font-semibold text-red-800">Error</h4>
              <p className="text-red-700 text-sm">{String(approveMutation.error)}</p>
            </div>
          )}

          {approveMutation.data && (
            <div className="bg-green-50 border border-green-200 p-3 rounded">
              <h4 className="font-semibold text-green-800">Success</h4>
              <p className="text-green-700 text-sm">
                Approval successful: {JSON.stringify(approveMutation.data)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Combined Demo showing all utility hooks
 */
function UtilityHooksDemo() {
  const [activeDemo, setActiveDemo] = useState<'cycles' | 'fungible' | 'approve'>('cycles');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Utility Hooks Demo</h1>
        <p className="text-gray-600 mb-6">
          Interactive demonstrations of utility hooks for token management on the Internet Computer.
        </p>
        
        <div className="flex justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveDemo('cycles')}
            className={`px-4 py-2 rounded ${
              activeDemo === 'cycles' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Cycles Ledger
          </button>
          <button
            onClick={() => setActiveDemo('fungible')}
            className={`px-4 py-2 rounded ${
              activeDemo === 'fungible' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Fungible Token
          </button>
          <button
            onClick={() => setActiveDemo('approve')}
            className={`px-4 py-2 rounded ${
              activeDemo === 'approve' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Token Approval
          </button>
        </div>
      </div>

      {activeDemo === 'cycles' && <CyclesLedgerDemo />}
      {activeDemo === 'fungible' && <FungibleTokenDemo />}
      {activeDemo === 'approve' && <TokenMutationDemo />}
    </div>
  );
}

const meta: Meta<typeof UtilityHooksDemo> = {
  title: 'Hooks/Utility',
  component: UtilityHooksDemo,
  tags: ['autodocs'],
  decorators: [withUtilityProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## Utility Hooks

Essential utility hooks for managing cycles, fungible tokens, and token operations on the Internet Computer.

### Available Hooks

#### useCyclesLedger()
Manages interactions with the Cycles Ledger canister for cycle balance and spending approvals.
- **balance**: Current cycles balance
- **tokenInfo**: Cycles token metadata (name, symbol, decimals)
- **formatCycles**: Format cycles amount for display
- **hasSufficientBalance**: Check if user has enough cycles
- **approveMutation**: Approve cycle spending for another canister

#### useFungibleToken(canisterId)
Handles ICRC-1/ICRC-2 fungible token operations including balance queries and metadata.
- **balance**: Token balance for current user
- **metadata**: Token metadata (name, symbol, decimals, fee)
- **allowance**: Allowance queries
- **isLoadingBalance**: Loading state for balance queries
- **isLoadingMetadata**: Loading state for metadata queries

#### useApproveToken(canisterId)
Provides mutation for approving token spending (ICRC-2 approve functionality).
- **mutate**: Execute token approval
- **isPending**: Approval transaction in progress
- **data**: Approval result
- **error**: Approval error if any

### Usage Patterns

#### Cycles Management
\`\`\`typescript
function CyclesWidget() {
  const {
    balance,
    formatCycles,
    hasSufficientBalance,
    approveMutation
  } = useCyclesLedger();
  
  const handleApproveCanister = async (canisterId: string, amount: bigint) => {
    const spender = Principal.fromText(canisterId);
    approveMutation.mutate({ spender, amount });
  };
  
  return (
    <div className="cycles-widget">
      <div>Balance: {balance ? formatCycles(balance) : 'Loading...'}</div>
      <div>Can afford 1T cycles: {hasSufficientBalance(BigInt(1e12)) ? '✅' : '❌'}</div>
      
      <button onClick={() => handleApproveCanister('ryjl3-tyaaa-aaaaa-aaaba-cai', BigInt(1e12))}>
        Approve 1T Cycles
      </button>
    </div>
  );
}
\`\`\`

#### Token Operations
\`\`\`typescript
function TokenManager({ tokenCanisterId }: { tokenCanisterId: string }) {
  const { balance, metadata } = useFungibleToken(tokenCanisterId);
  const approveMutation = useApproveToken(tokenCanisterId);
  
  const handleApprove = (spender: string, amount: bigint) => {
    const approveArgs = {
      spender: {
        owner: Principal.fromText(spender),
        subaccount: []
      },
      amount,
      fee: [],
      memo: [],
      from_subaccount: [],
      created_at_time: [],
      expected_allowance: [],
      expires_at: []
    };
    
    approveMutation.mutate(approveArgs);
  };
  
  return (
    <div className="token-manager">
      <h3>{metadata?.name} ({metadata?.symbol})</h3>
      <div>Balance: {balance?.toString()}</div>
      
      <button 
        onClick={() => handleApprove('spender-principal-id', BigInt(1000000))}
        disabled={approveMutation.isPending}
      >
        {approveMutation.isPending ? 'Approving...' : 'Approve Spending'}
      </button>
    </div>
  );
}
\`\`\`

#### Multi-Token Portfolio
\`\`\`typescript
function TokenPortfolio() {
  const tokenIds = ['token1-canister-id', 'token2-canister-id'];
  const cycles = useCyclesLedger();
  
  return (
    <div className="portfolio">
      <div className="cycles-section">
        <h3>Cycles</h3>
        <div>Balance: {cycles.formatCycles(cycles.balance || BigInt(0))}</div>
      </div>
      
      {tokenIds.map(tokenId => {
        const token = useFungibleToken(tokenId);
        return (
          <div key={tokenId} className="token-section">
            <h3>{token.metadata?.name || tokenId}</h3>
            <div>Balance: {token.balance?.toString() || 'Loading...'}</div>
          </div>
        );
      })}
    </div>
  );
}
\`\`\`

### Advanced Features
- Automatic balance refreshing with configurable intervals
- Comprehensive error handling and retry logic  
- Integration with React Query for caching and background updates
- Support for subaccounts and advanced ICRC-1/2 features
- Built-in formatting utilities for display
- Type-safe principal and canister ID handling
        `,
      },
    },
  },
};

export default meta;

export const Default = {
  name: 'Interactive Demo',
};

export const CyclesLedgerOnly = {
  name: 'Cycles Ledger Hook',
  render: () => <CyclesLedgerDemo />,
};

export const FungibleTokenOnly = {
  name: 'Fungible Token Hook',
  render: () => <FungibleTokenDemo />,
};

export const ApproveTokenOnly = {
  name: 'Token Approval Hook',
  render: () => <TokenMutationDemo />,
};
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { use99Mutations } from '../../hooks/use99Mutations';
import { useICRC99Support } from '../../hooks/useICRC99Support';
import { useICRC99FundingAddress } from '../../hooks/useICRC99FundingAddress';
import { useNFTBridge } from '../../hooks/useNFTBridge';
import { Principal } from '@dfinity/principal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IdentityKitProvider } from '@nfid/identitykit/react';
import { IdentityKitAuthType } from '@nfid/identitykit';
import { AgentProvider } from '../../provider/AgentProvider';
import '@nfid/identitykit/react/styles.css';

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
const withBridgeProviders = (Story: any) => (
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
 * BridgeHooksDemo - Demonstrates bridge and ICRC99 hook usage patterns
 */
function BridgeHooksDemo() {
  const [canisterId, setCanisterId] = useState('rdmx6-jaaaa-aaaah-qcaaa-cai');
  const [tokenId, setTokenId] = useState('1');
  const [contractAddress, setContractAddress] = useState('0x1234567890123456789012345678901234567890');
  const [chainId, setChainId] = useState('1');

  // Hook usage examples
  const supportQuery = useICRC99Support(canisterId);
  const fundingQuery = useICRC99FundingAddress(canisterId);
  const bridgeQuery = useNFTBridge(canisterId, BigInt(tokenId || '1'));
  const mutations = use99Mutations();

  const [bridgeStatus, setBridgeStatus] = useState<'idle' | 'importing' | 'exporting' | 'success' | 'error'>('idle');
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  const handleImport = async () => {
    setBridgeStatus('importing');
    setBridgeError(null);
    
    try {
      // Mock import flow
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (mutations.importNFT) {
        // Simulate import mutation
        console.log('Importing NFT from contract:', contractAddress);
        setBridgeStatus('success');
      } else {
        throw new Error('Import mutation not available');
      }
    } catch (error) {
      setBridgeStatus('error');
      setBridgeError(error instanceof Error ? error.message : 'Import failed');
    }
  };

  const handleExport = async () => {
    setBridgeStatus('exporting');
    setBridgeError(null);
    
    try {
      // Mock export flow
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (mutations.exportNFT) {
        // Simulate export mutation
        console.log('Exporting NFT to contract:', contractAddress);
        setBridgeStatus('success');
      } else {
        throw new Error('Export mutation not available');
      }
    } catch (error) {
      setBridgeStatus('error');
      setBridgeError(error instanceof Error ? error.message : 'Export failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">Bridge Hook Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Canister ID
            </label>
            <input
              type="text"
              value={canisterId}
              onChange={(e) => setCanisterId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Enter canister ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Token ID
            </label>
            <input
              type="text"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contract Address
            </label>
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="0x..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chain ID
            </label>
            <input
              type="text"
              value={chainId}
              onChange={(e) => setChainId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="1"
            />
          </div>
        </div>
      </div>

      {/* useICRC99Support Hook */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">useICRC99Support({canisterId})</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            <span className={`px-2 py-1 rounded text-xs ${
              supportQuery.loading ? 'bg-yellow-100 text-yellow-800' :
              supportQuery.error ? 'bg-red-100 text-red-800' :
              supportQuery.supported ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-600'
            }`}>
              {supportQuery.loading ? 'Checking...' : 
               supportQuery.error ? 'Error' :
               supportQuery.supported ? 'ICRC99 Supported' : 'Not Supported'}
            </span>
          </div>
          
          {supportQuery.error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              Error: {supportQuery.error}
            </div>
          )}
          
          {supportQuery.supported !== undefined && (
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">Bridge Support:</h3>
              <div className="text-sm space-y-1">
                <p><strong>ICRC99 Bridge:</strong> {supportQuery.supported ? '✅ Available' : '❌ Not Available'}</p>
                <p><strong>Cross-chain NFTs:</strong> {supportQuery.supported ? '✅ Supported' : '❌ Not Supported'}</p>
                {supportQuery.supported && (
                  <div className="mt-2 p-2 bg-green-50 rounded text-green-700">
                    This collection supports bridging NFTs to/from EVM networks
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* useICRC99FundingAddress Hook */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">useICRC99FundingAddress({canisterId})</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            <span className={`px-2 py-1 rounded text-xs ${
              fundingQuery.loading ? 'bg-yellow-100 text-yellow-800' :
              fundingQuery.error ? 'bg-red-100 text-red-800' :
              'bg-green-100 text-green-800'
            }`}>
              {fundingQuery.loading ? 'Generating...' : 
               fundingQuery.error ? 'Error' : 'Generated'}
            </span>
          </div>
          
          {fundingQuery.error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              Error: {fundingQuery.error}
            </div>
          )}
          
          {fundingQuery.address && (
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">Funding Address:</h3>
              <div className="text-sm space-y-2">
                <div className="bg-white p-2 rounded border font-mono text-xs">
                  {fundingQuery.address}
                </div>
                <p className="text-gray-600">
                  Use this address to fund bridge operations. Send ETH here to cover gas fees.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* useNFTBridge Hook */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">useNFTBridge({canisterId}, {tokenId})</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            <span className={`px-2 py-1 rounded text-xs ${
              bridgeQuery.loading ? 'bg-yellow-100 text-yellow-800' :
              bridgeQuery.error ? 'bg-red-100 text-red-800' :
              'bg-green-100 text-green-800'
            }`}>
              {bridgeQuery.loading ? 'Loading...' : 
               bridgeQuery.error ? 'Error' : 'Loaded'}
            </span>
          </div>
          
          {bridgeQuery.error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              Error: {bridgeQuery.error}
            </div>
          )}
          
          {bridgeQuery.status && (
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">Bridge Status:</h3>
              <div className="text-sm space-y-1">
                <p><strong>Current State:</strong> {bridgeQuery.status.state}</p>
                <p><strong>Origin Chain:</strong> {bridgeQuery.status.originChain || 'Internet Computer'}</p>
                <p><strong>Target Chain:</strong> {bridgeQuery.status.targetChain || 'Not bridged'}</p>
                {bridgeQuery.status.transactionHash && (
                  <p><strong>Transaction Hash:</strong> {bridgeQuery.status.transactionHash}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* use99Mutations Hook */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">use99Mutations()</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Bridge Operations:</span>
            <span className={`px-2 py-1 rounded text-xs ${
              bridgeStatus === 'idle' ? 'bg-gray-100 text-gray-600' :
              bridgeStatus === 'importing' || bridgeStatus === 'exporting' ? 'bg-yellow-100 text-yellow-800' :
              bridgeStatus === 'success' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {bridgeStatus === 'idle' ? 'Ready' :
               bridgeStatus === 'importing' ? 'Importing...' :
               bridgeStatus === 'exporting' ? 'Exporting...' :
               bridgeStatus === 'success' ? 'Success' : 'Error'}
            </span>
          </div>

          {bridgeError && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              Error: {bridgeError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={bridgeStatus === 'importing' || bridgeStatus === 'exporting'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {bridgeStatus === 'importing' ? 'Importing...' : 'Import NFT'}
            </button>
            <button
              onClick={handleExport}
              disabled={bridgeStatus === 'importing' || bridgeStatus === 'exporting'}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {bridgeStatus === 'exporting' ? 'Exporting...' : 'Export NFT'}
            </button>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold mb-2">Available Mutations:</h3>
            <div className="text-sm space-y-1">
              <p><strong>importNFT:</strong> {mutations.importNFT ? '✅ Available' : '❌ Not Available'}</p>
              <p><strong>exportNFT:</strong> {mutations.exportNFT ? '✅ Available' : '❌ Not Available'}</p>
              <p><strong>bridgeStatus:</strong> {mutations.bridgeStatus ? '✅ Available' : '❌ Not Available'}</p>
              <p><strong>cancelBridge:</strong> {mutations.cancelBridge ? '✅ Available' : '❌ Not Available'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Code Examples */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">Usage Examples</h2>
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold mb-2">Check Bridge Support</h3>
            <pre className="text-sm text-gray-700 overflow-x-auto">
{`const { supported, loading, error } = useICRC99Support(canisterId);

if (loading) return <CheckingSupportSpinner />;
if (error) return <ErrorMessage error={error} />;

if (!supported) {
  return <div>This collection doesn't support bridging</div>;
}

return <BridgeInterface />;`}
            </pre>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold mb-2">Import NFT Flow</h3>
            <pre className="text-sm text-gray-700 overflow-x-auto">
{`const mutations = use99Mutations();
const { address } = useICRC99FundingAddress(canisterId);

const handleImport = async (contractAddress, tokenId) => {
  try {
    // Step 1: Get funding address for gas fees
    console.log('Fund this address:', address);
    
    // Step 2: Execute import
    const result = await mutations.importNFT.mutateAsync({
      contractAddress,
      tokenId,
      targetCanister: canisterId
    });
    
    console.log('Import successful:', result);
  } catch (error) {
    console.error('Import failed:', error);
  }
};`}
            </pre>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold mb-2">Bridge Status Tracking</h3>
            <pre className="text-sm text-gray-700 overflow-x-auto">
{`const { status, loading, error } = useNFTBridge(canisterId, tokenId);

if (loading) return <BridgeStatusLoading />;
if (error) return <BridgeError error={error} />;

switch (status.state) {
  case 'native':
    return <div>NFT is on Internet Computer</div>;
  
  case 'bridged':
    return (
      <div>
        NFT bridged to {status.targetChain}
        <div>Tx: {status.transactionHash}</div>
      </div>
    );
    
  case 'pending':
    return <BridgeProgressIndicator status={status} />;
    
  default:
    return <UnknownBridgeState />;
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

const meta: Meta<typeof BridgeHooksDemo> = {
  title: 'Hooks/Bridge & ICRC99',
  component: BridgeHooksDemo,
  tags: ['autodocs'],
  decorators: [withBridgeProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## Bridge & ICRC99 Hooks

Specialized hooks for cross-chain NFT bridging operations using the ICRC99 standard.

### Available Hooks

#### useICRC99Support(canisterId)
Checks if a collection supports ICRC99 bridging functionality.
- **supported**: Boolean indicating bridge support
- **loading**: Boolean loading state
- **error**: Error message if check fails

#### useICRC99FundingAddress(canisterId)
Generates a unique funding address for bridge operations.
- **address**: Ethereum address to fund for gas fees
- **loading**: Boolean loading state
- **error**: Error message if generation fails

#### useNFTBridge(canisterId, tokenId)
Tracks bridge status for a specific NFT token.
- **status**: Current bridge state and transaction info
- **loading**: Boolean loading state
- **error**: Error message if query fails

#### use99Mutations()
Provides mutation functions for bridge operations.
- **importNFT**: Import NFT from EVM to IC
- **exportNFT**: Export NFT from IC to EVM
- **bridgeStatus**: Query bridge operation status
- **cancelBridge**: Cancel pending bridge operation

### Usage Patterns

#### Bridge Capability Check
\`\`\`typescript
function BridgeButton({ canisterId, tokenId }) {
  const { supported, loading } = useICRC99Support(canisterId);
  
  if (loading) return <Spinner />;
  
  if (!supported) {
    return (
      <div className="text-gray-500">
        Bridging not supported for this collection
      </div>
    );
  }
  
  return <BridgeInterface canisterId={canisterId} tokenId={tokenId} />;
}
\`\`\`

#### Import Flow Implementation
\`\`\`typescript
function ImportNFT({ contractAddress, tokenId, targetCanister }) {
  const mutations = use99Mutations();
  const { address } = useICRC99FundingAddress(targetCanister);
  const [step, setStep] = useState('funding');
  
  const handleImport = async () => {
    try {
      setStep('importing');
      
      // Execute import mutation
      const result = await mutations.importNFT.mutateAsync({
        contractAddress,
        tokenId,
        targetCanister
      });
      
      setStep('success');
      console.log('Import completed:', result);
    } catch (error) {
      setStep('error');
      console.error('Import failed:', error);
    }
  };
  
  return (
    <div>
      {step === 'funding' && (
        <FundingStep 
          address={address} 
          onFunded={() => setStep('ready')} 
        />
      )}
      {step === 'ready' && (
        <button onClick={handleImport}>
          Import NFT
        </button>
      )}
      {step === 'importing' && <ImportProgress />}
      {step === 'success' && <ImportSuccess />}
      {step === 'error' && <ImportError />}
    </div>
  );
}
\`\`\`

#### Bridge Status Monitor
\`\`\`typescript
function BridgeStatusCard({ canisterId, tokenId }) {
  const { status, loading, error } = useNFTBridge(canisterId, tokenId);
  
  if (loading) return <StatusSkeleton />;
  if (error) return <StatusError error={error} />;
  
  const getStatusColor = (state) => {
    switch (state) {
      case 'native': return 'bg-blue-100 text-blue-800';
      case 'bridged': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };
  
  return (
    <div className="border rounded-lg p-4">
      <div className={\`px-2 py-1 rounded text-sm \${getStatusColor(status.state)}\`}>
        {status.state.toUpperCase()}
      </div>
      
      {status.state === 'bridged' && (
        <div className="mt-2">
          <div>Chain: {status.targetChain}</div>
          <div className="font-mono text-xs">
            Tx: {status.transactionHash}
          </div>
        </div>
      )}
      
      {status.state === 'pending' && (
        <div className="mt-2">
          <BridgeProgressBar progress={status.progress} />
          <div className="text-sm text-gray-600">
            {status.message}
          </div>
        </div>
      )}
    </div>
  );
}
\`\`\`

#### Export Flow with Validation
\`\`\`typescript
function ExportNFT({ canisterId, tokenId, targetChain }) {
  const mutations = use99Mutations();
  const { address } = useICRC99FundingAddress(canisterId);
  const { owner } = useNFTOwnerOf(canisterId, tokenId);
  const { user } = useAuth();
  
  const userOwnsNFT = owner?.owner === user?.principal.toString();
  
  const handleExport = async () => {
    if (!userOwnsNFT) {
      throw new Error('You must own this NFT to export it');
    }
    
    try {
      const result = await mutations.exportNFT.mutateAsync({
        canisterId,
        tokenId,
        targetChain,
        fundingAddress: address
      });
      
      console.log('Export initiated:', result);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };
  
  return (
    <div>
      {!userOwnsNFT ? (
        <div className="text-red-600">
          You must own this NFT to export it
        </div>
      ) : (
        <button 
          onClick={handleExport}
          disabled={mutations.exportNFT.isLoading}
        >
          {mutations.exportNFT.isLoading ? 'Exporting...' : 'Export to ' + targetChain}
        </button>
      )}
    </div>
  );
}
\`\`\`

### Advanced Features
- Real-time bridge status updates
- Gas fee estimation and funding
- Multi-chain support (Ethereum, Polygon, etc.)
- Transaction hash tracking
- Automatic retry on network issues
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo of bridge and ICRC99 hooks with real-time bridge operations.',
      },
    },
  },
};

export const BridgeFlow: Story = {
  decorators: [
    (Story) => (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-bold mb-4">Bridge Flow States</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-blue-200 bg-blue-50 rounded">
                <h3 className="font-semibold text-blue-800">1. Check Support</h3>
                <p className="text-sm text-blue-600 mt-1">Verify collection supports ICRC99 bridging</p>
                <div className="mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  ✅ Supported
                </div>
              </div>
              <div className="p-4 border border-yellow-200 bg-yellow-50 rounded">
                <h3 className="font-semibold text-yellow-800">2. Fund Address</h3>
                <p className="text-sm text-yellow-600 mt-1">Fund the generated address for gas fees</p>
                <div className="mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                  ⏳ Funding Required
                </div>
              </div>
              <div className="p-4 border border-green-200 bg-green-50 rounded">
                <h3 className="font-semibold text-green-800">3. Execute Bridge</h3>
                <p className="text-sm text-green-600 mt-1">Import/export NFT to target chain</p>
                <div className="mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  ✅ Bridge Complete
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Step-by-step bridge flow showing the complete NFT bridging process.',
      },
    },
  },
};

export const ErrorStates: Story = {
  decorators: [
    (Story) => (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-bold mb-4">Bridge Error States</h2>
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 p-4 rounded">
                <h3 className="font-semibold text-red-800">Bridge Not Supported</h3>
                <p className="text-sm text-red-600">This collection does not implement ICRC99 bridging functionality.</p>
              </div>
              <div className="bg-red-50 border border-red-200 p-4 rounded">
                <h3 className="font-semibold text-red-800">Insufficient Funds</h3>
                <p className="text-sm text-red-600">The funding address does not have enough ETH to cover gas fees.</p>
              </div>
              <div className="bg-red-50 border border-red-200 p-4 rounded">
                <h3 className="font-semibold text-red-800">Bridge Operation Failed</h3>
                <p className="text-sm text-red-600">The bridge transaction failed due to network congestion or invalid parameters.</p>
              </div>
              <div className="bg-red-50 border border-red-200 p-4 rounded">
                <h3 className="font-semibold text-red-800">Ownership Required</h3>
                <p className="text-sm text-red-600">You must own this NFT to initiate a bridge operation.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Common error states and error handling patterns for bridge operations.',
      },
    },
  },
};
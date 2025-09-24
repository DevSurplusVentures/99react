import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { useNFTOwner } from '../../hooks/useNFTOwner';
import { useNFTOwnerOf } from '../../hooks/useNFTOwnerOf';
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
const withNFTProviders = (Story: any) => (
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
 * NFTHooksDemo - Demonstrates NFT-related hook usage patterns
 */
function NFTHooksDemo() {
  const [canisterId, setCanisterId] = useState('rdmx6-jaaaa-aaaah-qcaaa-cai');
  const [tokenId, setTokenId] = useState('1');
  const [ownerPrincipal, setOwnerPrincipal] = useState('');

  // Hook usage examples
  const collectionQuery = useNFTCollection(canisterId);
  const metadataQuery = useNFTMetadata(canisterId, BigInt(tokenId || '1'));
  const ownerQuery = useNFTOwner(canisterId, ownerPrincipal);
  const ownerOfQuery = useNFTOwnerOf(canisterId, BigInt(tokenId || '1'));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">NFT Hook Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              Owner Principal
            </label>
            <input
              type="text"
              value={ownerPrincipal}
              onChange={(e) => setOwnerPrincipal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Principal ID"
            />
          </div>
        </div>
      </div>

      {/* useNFTCollection Hook */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">useNFTCollection({canisterId})</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            <span className={`px-2 py-1 rounded text-xs ${
              collectionQuery.loading ? 'bg-yellow-100 text-yellow-800' :
              collectionQuery.error ? 'bg-red-100 text-red-800' :
              'bg-green-100 text-green-800'
            }`}>
              {collectionQuery.loading ? 'Loading...' : 
               collectionQuery.error ? 'Error' : 'Loaded'}
            </span>
          </div>
          
          {collectionQuery.error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              Error: {collectionQuery.error}
            </div>
          )}
          
          {collectionQuery.collection && (
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">Collection Data:</h3>
              <div className="text-sm space-y-1">
                <p><strong>Name:</strong> {collectionQuery.collection.name}</p>
                <p><strong>Symbol:</strong> {collectionQuery.collection.symbol}</p>
                <p><strong>Total Supply:</strong> {collectionQuery.collection.totalSupply?.toString()}</p>
                <p><strong>Description:</strong> {collectionQuery.collection.description}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* useNFTMetadata Hook */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">useNFTMetadata({canisterId}, {tokenId})</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            <span className={`px-2 py-1 rounded text-xs ${
              metadataQuery.loading ? 'bg-yellow-100 text-yellow-800' :
              metadataQuery.error ? 'bg-red-100 text-red-800' :
              'bg-green-100 text-green-800'
            }`}>
              {metadataQuery.loading ? 'Loading...' : 
               metadataQuery.error ? 'Error' : 'Loaded'}
            </span>
          </div>
          
          {metadataQuery.error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              Error: {metadataQuery.error}
            </div>
          )}
          
          {metadataQuery.metadata && (
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">NFT Metadata:</h3>
              <div className="text-sm space-y-1">
                <p><strong>Token ID:</strong> {metadataQuery.metadata.tokenId?.toString()}</p>
                <p><strong>ICRC97 Name:</strong> {metadataQuery.metadata.parsedMetadata.icrc97.name}</p>
                <p><strong>Description:</strong> {metadataQuery.metadata.parsedMetadata.icrc97.description}</p>
                <p><strong>Image:</strong> {metadataQuery.metadata.parsedMetadata.icrc97.image}</p>
                {metadataQuery.metadata.parsedMetadata.icrc97.attributes?.length > 0 && (
                  <div>
                    <strong>Attributes:</strong>
                    <ul className="ml-4 mt-1">
                      {metadataQuery.metadata.parsedMetadata.icrc97.attributes.map((attr: any, i: number) => (
                        <li key={i}>• {attr.trait_type}: {attr.value}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* useNFTOwner Hook */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">useNFTOwner({canisterId}, owner)</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            <span className={`px-2 py-1 rounded text-xs ${
              ownerQuery.loading ? 'bg-yellow-100 text-yellow-800' :
              ownerQuery.error ? 'bg-red-100 text-red-800' :
              'bg-green-100 text-green-800'
            }`}>
              {ownerQuery.loading ? 'Loading...' : 
               ownerQuery.error ? 'Error' : 'Loaded'}
            </span>
          </div>
          
          {ownerQuery.error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              Error: {ownerQuery.error}
            </div>
          )}
          
          {ownerQuery.tokens && (
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">Owned NFTs:</h3>
              <div className="text-sm">
                <p><strong>Total Tokens:</strong> {ownerQuery.tokens.length}</p>
                {ownerQuery.tokens.length > 0 && (
                  <div>
                    <strong>Token IDs:</strong> {ownerQuery.tokens.slice(0, 10).map(t => t.toString()).join(', ')}
                    {ownerQuery.tokens.length > 10 && '...'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* useNFTOwnerOf Hook */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">useNFTOwnerOf({canisterId}, {tokenId})</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            <span className={`px-2 py-1 rounded text-xs ${
              ownerOfQuery.loading ? 'bg-yellow-100 text-yellow-800' :
              ownerOfQuery.error ? 'bg-red-100 text-red-800' :
              'bg-green-100 text-green-800'
            }`}>
              {ownerOfQuery.loading ? 'Loading...' : 
               ownerOfQuery.error ? 'Error' : 'Loaded'}
            </span>
          </div>
          
          {ownerOfQuery.error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              Error: {ownerOfQuery.error}
            </div>
          )}
          
          {ownerOfQuery.owner && (
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">Owner Information:</h3>
              <div className="text-sm space-y-1">
                <p><strong>Owner:</strong> {ownerOfQuery.owner.owner}</p>
                {ownerOfQuery.owner.subaccount && (
                  <p><strong>Subaccount:</strong> {JSON.stringify(ownerOfQuery.owner.subaccount)}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Code Examples */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">Usage Examples</h2>
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold mb-2">Collection Information</h3>
            <pre className="text-sm text-gray-700 overflow-x-auto">
{`const { collection, loading, error } = useNFTCollection(canisterId);

if (loading) return <Spinner />;
if (error) return <Error message={error} />;

return (
  <div>
    <h1>{collection.name}</h1>
    <p>{collection.description}</p>
    <p>Supply: {collection.totalSupply}</p>
  </div>
);`}
            </pre>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold mb-2">NFT Metadata Display</h3>
            <pre className="text-sm text-gray-700 overflow-x-auto">
{`const { metadata, loading, error } = useNFTMetadata(canisterId, tokenId);

if (loading) return <Skeleton />;
if (error) return <ErrorState />;

const { icrc97 } = metadata.parsedMetadata;
return (
  <NFTCard
    name={icrc97.name}
    image={icrc97.image}
    attributes={icrc97.attributes}
  />
);`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

const meta: Meta<typeof NFTHooksDemo> = {
  title: 'Hooks/NFT Management',
  component: NFTHooksDemo,
  tags: ['autodocs'],
  decorators: [withNFTProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## NFT Management Hooks

Comprehensive hooks for managing NFT collections, metadata, and ownership queries.

### Available Hooks

#### useNFTCollection(canisterId)
Fetches collection-level metadata and statistics.
- **collection**: Collection name, symbol, description, supply
- **loading**: Boolean loading state
- **error**: Error message if query fails

#### useNFTMetadata(canisterId, tokenId)
Retrieves individual NFT metadata with ICRC97 parsing.
- **metadata**: Parsed ICRC97 metadata with name, image, attributes
- **loading**: Boolean loading state  
- **error**: Error message if query fails

#### useNFTOwner(canisterId, owner)
Gets all NFTs owned by a specific principal.
- **tokens**: Array of token IDs owned by the principal
- **loading**: Boolean loading state
- **error**: Error message if query fails

#### useNFTOwnerOf(canisterId, tokenId)
Finds the owner of a specific NFT token.
- **owner**: Owner principal and subaccount information
- **loading**: Boolean loading state
- **error**: Error message if query fails

### Usage Patterns

#### Collection Display
\`\`\`typescript
function CollectionHeader({ canisterId }) {
  const { collection, loading, error } = useNFTCollection(canisterId);
  
  if (loading) return <CollectionSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div>
      <img src={collection.logo} alt={collection.name} />
      <h1>{collection.name} ({collection.symbol})</h1>
      <p>{collection.description}</p>
      <div>Total Supply: {collection.totalSupply.toString()}</div>
    </div>
  );
}
\`\`\`

#### NFT Card Component
\`\`\`typescript
function NFTCard({ canisterId, tokenId }) {
  const { metadata, loading, error } = useNFTMetadata(canisterId, tokenId);
  
  if (loading) return <CardSkeleton />;
  if (error) return <ErrorCard error={error} />;
  
  const { icrc97 } = metadata.parsedMetadata;
  
  return (
    <div className="nft-card">
      <img src={icrc97.image} alt={icrc97.name} />
      <h3>{icrc97.name}</h3>
      <p>{icrc97.description}</p>
      {icrc97.attributes?.map(attr => (
        <span key={attr.trait_type}>
          {attr.trait_type}: {attr.value}
        </span>
      ))}
    </div>
  );
}
\`\`\`

#### Owner Portfolio
\`\`\`typescript
function UserPortfolio({ userPrincipal, canisterId }) {
  const { tokens, loading, error } = useNFTOwner(canisterId, userPrincipal);
  
  if (loading) return <PortfolioSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div>
      <h2>Your NFTs ({tokens.length})</h2>
      <div className="grid">
        {tokens.map(tokenId => (
          <NFTCard key={tokenId} canisterId={canisterId} tokenId={tokenId} />
        ))}
      </div>
    </div>
  );
}
\`\`\`

#### Ownership Verification
\`\`\`typescript
function NFTActions({ canisterId, tokenId, currentUser }) {
  const { owner, loading } = useNFTOwnerOf(canisterId, tokenId);
  
  const userOwnsNFT = owner?.owner === currentUser?.principal.toString();
  
  return (
    <div>
      {loading ? (
        <Spinner />
      ) : userOwnsNFT ? (
        <OwnerActions tokenId={tokenId} />
      ) : (
        <PurchaseButton tokenId={tokenId} />
      )}
    </div>
  );
}
\`\`\`

### Performance Considerations
- Use React Query for automatic caching and background updates
- Implement proper loading and error states
- Consider pagination for large collections
- Batch multiple metadata queries when possible
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
        story: 'Interactive demo of NFT management hooks with real-time query examples.',
      },
    },
  },
};

export const LoadingStates: Story = {
  decorators: [
    (Story) => (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-bold mb-4">Loading States</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Collection Loading</h3>
                <div className="bg-gray-200 h-4 rounded animate-pulse"></div>
                <div className="bg-gray-200 h-4 w-3/4 rounded animate-pulse"></div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Metadata Loading</h3>
                <div className="bg-gray-200 h-32 rounded animate-pulse"></div>
                <div className="bg-gray-200 h-4 rounded animate-pulse"></div>
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
        story: 'Loading states for all NFT hooks during data fetching.',
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
            <h2 className="text-xl font-bold mb-4">Error States</h2>
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 p-4 rounded">
                <h3 className="font-semibold text-red-800">Collection Not Found</h3>
                <p className="text-sm text-red-600">The specified canister ID does not exist or is not an NFT collection.</p>
              </div>
              <div className="bg-red-50 border border-red-200 p-4 rounded">
                <h3 className="font-semibold text-red-800">Token Not Found</h3>
                <p className="text-sm text-red-600">The specified token ID does not exist in this collection.</p>
              </div>
              <div className="bg-red-50 border border-red-200 p-4 rounded">
                <h3 className="font-semibold text-red-800">Network Error</h3>
                <p className="text-sm text-red-600">Failed to connect to the Internet Computer network.</p>
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
        story: 'Error states and error handling patterns for NFT hooks.',
      },
    },
  },
};
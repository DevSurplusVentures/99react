import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useMarketMutations } from '../../hooks/useMarketMutations';
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

// Mock data
const MOCK_INTENT_DATA = {
  id: 'intent-1',
  tokenId: BigInt(1),
  canisterId: 'rdmx6-jaaaa-aaaah-qcaaa-cai',
  price: BigInt(1000000000), // 1 ICP
  currency: 'ICP',
  seller: Principal.fromText('rdmx6-jaaaa-aaaah-qcaaa-cai'),
  buyer: null,
  status: 'active' as const,
  createdAt: BigInt(Date.now() * 1000000),
  expiresAt: BigInt((Date.now() + 7 * 24 * 60 * 60 * 1000) * 1000000),
};

// Providers wrapper
const withMarketProviders = (Story: any) => (
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
 * MarketHooksDemo - Demonstrates marketplace and intent hook usage patterns
 */
function MarketHooksDemo() {
  const [canisterId, setCanisterId] = useState('rdmx6-jaaaa-aaaah-qcaaa-cai');
  const [tokenId, setTokenId] = useState('1');
  const [intentId, setIntentId] = useState('intent-1');
  const [userPrincipal, setUserPrincipal] = useState('rdmx6-jaaaa-aaaah-qcaaa-cai');
  const [priceAmount, setPriceAmount] = useState('1.0');

  // Hook usage examples
  const priceQuery = useListingPrice(canisterId, BigInt(tokenId || '1'));
  const marketplaceQuery = useMarketplace(canisterId);
  const userListingsQuery = useUserListings(userPrincipal);
  const intentStatusQuery = useIntentStatus(intentId);
  const intentHistoryQuery = useIntentHistory(canisterId, BigInt(tokenId || '1'));

  const [actionStatus, setActionStatus] = useState<'idle' | 'creating' | 'updating' | 'cancelling' | 'success' | 'error'>('idle');
  const [actionError, setActionError] = useState<string | null>(null);

  const handleCreateIntent = async () => {
    setActionStatus('creating');
    setActionError(null);
    
    try {
      // Mock intent creation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Creating intent for:', {
        canisterId,
        tokenId,
        price: parseFloat(priceAmount) * 1e8, // Convert to e8s
        currency: 'ICP'
      });
      
      setActionStatus('success');
    } catch (error) {
      setActionStatus('error');
      setActionError(error instanceof Error ? error.message : 'Intent creation failed');
    }
  };

  const handleUpdatePrice = async () => {
    setActionStatus('updating');
    setActionError(null);
    
    try {
      // Mock price update
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Updating price for intent:', intentId, 'to:', priceAmount);
      setActionStatus('success');
    } catch (error) {
      setActionStatus('error');
      setActionError(error instanceof Error ? error.message : 'Price update failed');
    }
  };

  const handleCancelIntent = async () => {
    setActionStatus('cancelling');
    setActionError(null);
    
    try {
      // Mock intent cancellation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Cancelling intent:', intentId);
      setActionStatus('success');
    } catch (error) {
      setActionStatus('error');
      setActionError(error instanceof Error ? error.message : 'Intent cancellation failed');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">Market Hook Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              Intent ID
            </label>
            <input
              type="text"
              value={intentId}
              onChange={(e) => setIntentId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="intent-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User Principal
            </label>
            <input
              type="text"
              value={userPrincipal}
              onChange={(e) => setUserPrincipal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="User principal"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price (ICP)
            </label>
            <input
              type="number"
              step="0.1"
              value={priceAmount}
              onChange={(e) => setPriceAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="1.0"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* useListingPrice Hook */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-bold mb-4">useListingPrice({canisterId}, {tokenId})</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Status:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                priceQuery.loading ? 'bg-yellow-100 text-yellow-800' :
                priceQuery.error ? 'bg-red-100 text-red-800' :
                priceQuery.price ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-600'
              }`}>
                {priceQuery.loading ? 'Loading...' : 
                 priceQuery.error ? 'Error' :
                 priceQuery.price ? 'Listed' : 'Not Listed'}
              </span>
            </div>
            
            {priceQuery.error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                Error: {priceQuery.error}
              </div>
            )}
            
            {priceQuery.price && (
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold mb-2">Current Listing:</h3>
                <div className="text-sm space-y-1">
                  <p><strong>Price:</strong> {(Number(priceQuery.price.amount) / 1e8).toFixed(2)} {priceQuery.price.currency}</p>
                  <p><strong>Intent ID:</strong> {priceQuery.price.intentId}</p>
                  <p><strong>Status:</strong> {priceQuery.price.status}</p>
                  <p><strong>Expires:</strong> {new Date(Number(priceQuery.price.expiresAt) / 1000000).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* useMarketplace Hook */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-bold mb-4">useMarketplace({canisterId})</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Status:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                marketplaceQuery.loading ? 'bg-yellow-100 text-yellow-800' :
                marketplaceQuery.error ? 'bg-red-100 text-red-800' :
                'bg-green-100 text-green-800'
              }`}>
                {marketplaceQuery.loading ? 'Loading...' : 
                 marketplaceQuery.error ? 'Error' : 'Loaded'}
              </span>
            </div>
            
            {marketplaceQuery.error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                Error: {marketplaceQuery.error}
              </div>
            )}
            
            {marketplaceQuery.data && (
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold mb-2">Marketplace Stats:</h3>
                <div className="text-sm space-y-1">
                  <p><strong>Active Listings:</strong> {marketplaceQuery.data.activeListings || 0}</p>
                  <p><strong>Floor Price:</strong> {marketplaceQuery.data.floorPrice ? `${(Number(marketplaceQuery.data.floorPrice) / 1e8).toFixed(2)} ICP` : 'N/A'}</p>
                  <p><strong>Volume (24h):</strong> {marketplaceQuery.data.volume24h ? `${(Number(marketplaceQuery.data.volume24h) / 1e8).toFixed(2)} ICP` : 'N/A'}</p>
                  <p><strong>Total Sales:</strong> {marketplaceQuery.data.totalSales || 0}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* useUserListings Hook */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">useUserListings({userPrincipal})</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            <span className={`px-2 py-1 rounded text-xs ${
              userListingsQuery.loading ? 'bg-yellow-100 text-yellow-800' :
              userListingsQuery.error ? 'bg-red-100 text-red-800' :
              'bg-green-100 text-green-800'
            }`}>
              {userListingsQuery.loading ? 'Loading...' : 
               userListingsQuery.error ? 'Error' : 
               `${userListingsQuery.listings?.length || 0} Listings`}
            </span>
          </div>
          
          {userListingsQuery.error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              Error: {userListingsQuery.error}
            </div>
          )}
          
          {userListingsQuery.listings && userListingsQuery.listings.length > 0 && (
            <div className="bg-gray-50 p-4 rounded max-h-64 overflow-y-auto">
              <h3 className="font-semibold mb-2">User's Active Listings:</h3>
              <div className="space-y-2">
                {userListingsQuery.listings.map((listing, index) => (
                  <div key={index} className="bg-white p-3 rounded border text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p><strong>Token #{listing.tokenId.toString()}</strong></p>
                        <p className="text-gray-600">{listing.canisterId}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{(Number(listing.price) / 1e8).toFixed(2)} ICP</p>
                        <p className="text-xs text-gray-500">
                          Expires {new Date(Number(listing.expiresAt) / 1000000).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {userListingsQuery.listings && userListingsQuery.listings.length === 0 && (
            <div className="bg-gray-50 p-4 rounded text-center text-gray-500">
              No active listings found for this user
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* useIntentStatus Hook */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-bold mb-4">useIntentStatus({intentId})</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Status:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                intentStatusQuery.loading ? 'bg-yellow-100 text-yellow-800' :
                intentStatusQuery.error ? 'bg-red-100 text-red-800' :
                'bg-green-100 text-green-800'
              }`}>
                {intentStatusQuery.loading ? 'Loading...' : 
                 intentStatusQuery.error ? 'Error' : 'Loaded'}
              </span>
            </div>
            
            {intentStatusQuery.error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                Error: {intentStatusQuery.error}
              </div>
            )}
            
            {intentStatusQuery.intent && (
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold mb-2">Intent Details:</h3>
                <div className="text-sm space-y-1">
                  <p><strong>Status:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      intentStatusQuery.intent.status === 'active' ? 'bg-green-100 text-green-800' :
                      intentStatusQuery.intent.status === 'fulfilled' ? 'bg-blue-100 text-blue-800' :
                      intentStatusQuery.intent.status === 'cancelled' ? 'bg-gray-100 text-gray-600' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {intentStatusQuery.intent.status}
                    </span>
                  </p>
                  <p><strong>Price:</strong> {(Number(intentStatusQuery.intent.price) / 1e8).toFixed(2)} {intentStatusQuery.intent.currency}</p>
                  <p><strong>Token:</strong> #{intentStatusQuery.intent.tokenId.toString()}</p>
                  <p><strong>Seller:</strong> <span className="font-mono text-xs">{intentStatusQuery.intent.seller.toString()}</span></p>
                  {intentStatusQuery.intent.buyer && (
                    <p><strong>Buyer:</strong> <span className="font-mono text-xs">{intentStatusQuery.intent.buyer.toString()}</span></p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* useIntentHistory Hook */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-bold mb-4">useIntentHistory({canisterId}, {tokenId})</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Status:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                intentHistoryQuery.loading ? 'bg-yellow-100 text-yellow-800' :
                intentHistoryQuery.error ? 'bg-red-100 text-red-800' :
                'bg-green-100 text-green-800'
              }`}>
                {intentHistoryQuery.loading ? 'Loading...' : 
                 intentHistoryQuery.error ? 'Error' :
                 `${intentHistoryQuery.history?.length || 0} Records`}
              </span>
            </div>
            
            {intentHistoryQuery.error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                Error: {intentHistoryQuery.error}
              </div>
            )}
            
            {intentHistoryQuery.history && intentHistoryQuery.history.length > 0 && (
              <div className="bg-gray-50 p-4 rounded max-h-64 overflow-y-auto">
                <h3 className="font-semibold mb-2">Trading History:</h3>
                <div className="space-y-2">
                  {intentHistoryQuery.history.map((record, index) => (
                    <div key={index} className="bg-white p-3 rounded border text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{record.type}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(Number(record.timestamp) / 1000000).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{(Number(record.price) / 1e8).toFixed(2)} ICP</p>
                          <p className="text-xs text-gray-500">{record.status}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {intentHistoryQuery.history && intentHistoryQuery.history.length === 0 && (
              <div className="bg-gray-50 p-4 rounded text-center text-gray-500">
                No trading history found for this token
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Market Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">Market Actions</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Action Status:</span>
            <span className={`px-2 py-1 rounded text-xs ${
              actionStatus === 'idle' ? 'bg-gray-100 text-gray-600' :
              actionStatus === 'creating' || actionStatus === 'updating' || actionStatus === 'cancelling' ? 'bg-yellow-100 text-yellow-800' :
              actionStatus === 'success' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {actionStatus === 'idle' ? 'Ready' :
               actionStatus === 'creating' ? 'Creating Intent...' :
               actionStatus === 'updating' ? 'Updating Price...' :
               actionStatus === 'cancelling' ? 'Cancelling...' :
               actionStatus === 'success' ? 'Success' : 'Error'}
            </span>
          </div>

          {actionError && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              Error: {actionError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleCreateIntent}
              disabled={actionStatus !== 'idle'}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Create Intent
            </button>
            <button
              onClick={handleUpdatePrice}
              disabled={actionStatus !== 'idle'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Update Price
            </button>
            <button
              onClick={handleCancelIntent}
              disabled={actionStatus !== 'idle'}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Cancel Intent
            </button>
          </div>
        </div>
      </div>

      {/* Code Examples */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">Usage Examples</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold mb-2">Check Token Listing</h3>
            <pre className="text-sm text-gray-700 overflow-x-auto">
{`const { price, loading, error } = useListingPrice(
  canisterId, 
  tokenId
);

if (loading) return <PriceLoader />;
if (error) return <PriceError />;

if (!price) {
  return <div>Token not listed</div>;
}

return (
  <div className="listing-card">
    <div className="price">
      {price.amount / 1e8} {price.currency}
    </div>
    <div className="status">
      {price.status}
    </div>
  </div>
);`}
            </pre>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold mb-2">Marketplace Overview</h3>
            <pre className="text-sm text-gray-700 overflow-x-auto">
{`const { data, loading } = useMarketplace(canisterId);

if (loading) return <MarketplaceLoader />;

return (
  <div className="marketplace-stats">
    <div>
      Active Listings: {data.activeListings}
    </div>
    <div>
      Floor Price: {data.floorPrice / 1e8} ICP
    </div>
    <div>
      24h Volume: {data.volume24h / 1e8} ICP
    </div>
  </div>
);`}
            </pre>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold mb-2">User's Active Listings</h3>
            <pre className="text-sm text-gray-700 overflow-x-auto">
{`const { listings, loading } = useUserListings(
  userPrincipal
);

if (loading) return <ListingsLoader />;

return (
  <div className="user-listings">
    {listings.map(listing => (
      <div key={listing.intentId} className="listing">
        <div>Token #{listing.tokenId}</div>
        <div>{listing.price / 1e8} ICP</div>
        <button onClick={() => cancel(listing.intentId)}>
          Cancel
        </button>
      </div>
    ))}
  </div>
);`}
            </pre>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold mb-2">Intent Status Tracking</h3>
            <pre className="text-sm text-gray-700 overflow-x-auto">
{`const { intent, loading } = useIntentStatus(intentId);

if (loading) return <IntentLoader />;

const getStatusColor = (status) => {
  switch (status) {
    case 'active': return 'text-green-600';
    case 'fulfilled': return 'text-blue-600';
    case 'cancelled': return 'text-gray-600';
    default: return 'text-red-600';
  }
};

return (
  <div className="intent-status">
    <span className={getStatusColor(intent.status)}>
      {intent.status.toUpperCase()}
    </span>
    <div>{intent.price / 1e8} ICP</div>
  </div>
);`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

const meta: Meta<typeof MarketHooksDemo> = {
  title: 'Hooks/Market & Intent',
  component: MarketHooksDemo,
  tags: ['autodocs'],
  decorators: [withMarketProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## Market & Intent Hooks

Comprehensive hooks for marketplace functionality including listings, intents, and trading operations.

### Available Hooks

#### useListingPrice(canisterId, tokenId)
Retrieves current listing price and status for a specific NFT token.
- **price**: Current listing price data with intent details
- **loading**: Boolean loading state
- **error**: Error message if query fails

#### useMarketplace(canisterId)
Provides marketplace statistics and overview data for a collection.
- **data**: Marketplace stats (floor price, volume, active listings)
- **loading**: Boolean loading state  
- **error**: Error message if query fails

#### useUserListings(userPrincipal)
Fetches all active listings created by a specific user.
- **listings**: Array of user's active intent listings
- **loading**: Boolean loading state
- **error**: Error message if query fails

#### useIntentStatus(intentId)
Tracks status and details of a specific marketplace intent.
- **intent**: Full intent details and current status
- **loading**: Boolean loading state
- **error**: Error message if query fails

#### useIntentHistory(canisterId, tokenId)
Retrieves complete trading history for a specific NFT token.
- **history**: Array of historical trading records
- **loading**: Boolean loading state
- **error**: Error message if query fails

### Usage Patterns

#### Price Display Component
\`\`\`typescript
function TokenPriceCard({ canisterId, tokenId }) {
  const { price, loading, error } = useListingPrice(canisterId, tokenId);
  
  if (loading) return <PriceSkeleton />;
  if (error) return <PriceError error={error} />;
  
  if (!price) {
    return (
      <div className="not-listed">
        <span>Not currently listed</span>
        <CreateListingButton canisterId={canisterId} tokenId={tokenId} />
      </div>
    );
  }
  
  return (
    <div className="price-card">
      <div className="price">
        {(price.amount / 1e8).toFixed(2)} {price.currency}
      </div>
      <div className="status">
        Status: {price.status}
      </div>
      <div className="expires">
        Expires: {new Date(Number(price.expiresAt) / 1000000).toLocaleDateString()}
      </div>
      {price.status === 'active' && (
        <PurchaseButton intentId={price.intentId} price={price.amount} />
      )}
    </div>
  );
}
\`\`\`

#### Marketplace Dashboard
\`\`\`typescript
function MarketplaceDashboard({ canisterId }) {
  const { data: marketplace, loading } = useMarketplace(canisterId);
  
  if (loading) return <DashboardSkeleton />;
  
  const formatPrice = (price) => (price / 1e8).toFixed(2);
  
  return (
    <div className="marketplace-dashboard">
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Active Listings</h3>
          <div className="value">{marketplace.activeListings}</div>
        </div>
        <div className="stat-card">
          <h3>Floor Price</h3>
          <div className="value">
            {marketplace.floorPrice ? formatPrice(marketplace.floorPrice) : '--'} ICP
          </div>
        </div>
        <div className="stat-card">
          <h3>24h Volume</h3>
          <div className="value">
            {marketplace.volume24h ? formatPrice(marketplace.volume24h) : '--'} ICP
          </div>
        </div>
        <div className="stat-card">
          <h3>Total Sales</h3>
          <div className="value">{marketplace.totalSales}</div>
        </div>
      </div>
      
      <RecentSalesTable canisterId={canisterId} />
      <ActiveListingsTable canisterId={canisterId} />
    </div>
  );
}
\`\`\`

#### User Listings Manager
\`\`\`typescript
function UserListingsManager({ userPrincipal }) {
  const { listings, loading, refetch } = useUserListings(userPrincipal);
  const [cancellingIntent, setCancellingIntent] = useState(null);
  
  const handleCancelListing = async (intentId) => {
    setCancellingIntent(intentId);
    
    try {
      // Cancel intent mutation
      await cancelIntent(intentId);
      await refetch();
      setCancellingIntent(null);
    } catch (error) {
      console.error('Cancel failed:', error);
      setCancellingIntent(null);
    }
  };
  
  if (loading) return <ListingsLoader />;
  
  if (!listings || listings.length === 0) {
    return (
      <div className="no-listings">
        <span>No active listings</span>
        <CreateListingButton />
      </div>
    );
  }
  
  return (
    <div className="listings-manager">
      <h2>Your Active Listings ({listings.length})</h2>
      
      <div className="listings-grid">
        {listings.map((listing) => (
          <div key={listing.intentId} className="listing-card">
            <div className="token-info">
              <div className="token-id">#{listing.tokenId.toString()}</div>
              <div className="collection">{listing.canisterId}</div>
            </div>
            
            <div className="price-info">
              <div className="price">
                {(listing.price / 1e8).toFixed(2)} {listing.currency}
              </div>
              <div className="expires">
                Expires {new Date(Number(listing.expiresAt) / 1000000).toLocaleDateString()}
              </div>
            </div>
            
            <div className="actions">
              <button 
                onClick={() => handleUpdatePrice(listing.intentId)}
                className="update-btn"
              >
                Update Price
              </button>
              <button 
                onClick={() => handleCancelListing(listing.intentId)}
                disabled={cancellingIntent === listing.intentId}
                className="cancel-btn"
              >
                {cancellingIntent === listing.intentId ? 'Cancelling...' : 'Cancel'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
\`\`\`

#### Intent Status Monitor
\`\`\`typescript
function IntentStatusMonitor({ intentId }) {
  const { intent, loading, error } = useIntentStatus(intentId);
  
  if (loading) return <StatusLoader />;
  if (error) return <StatusError error={error} />;
  if (!intent) return <IntentNotFound />;
  
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'active':
        return { color: 'green', text: 'Active', description: 'Available for purchase' };
      case 'fulfilled':
        return { color: 'blue', text: 'Fulfilled', description: 'Successfully sold' };
      case 'cancelled':
        return { color: 'gray', text: 'Cancelled', description: 'Listing cancelled' };
      case 'expired':
        return { color: 'red', text: 'Expired', description: 'Listing expired' };
      default:
        return { color: 'red', text: 'Unknown', description: 'Unknown status' };
    }
  };
  
  const statusDisplay = getStatusDisplay(intent.status);
  
  return (
    <div className="intent-monitor">
      <div className="header">
        <h3>Intent Status</h3>
        <div className={\`status-badge status-\${statusDisplay.color}\`}>
          {statusDisplay.text}
        </div>
      </div>
      
      <div className="details">
        <div className="detail-row">
          <span>Intent ID:</span>
          <span className="mono">{intentId}</span>
        </div>
        <div className="detail-row">
          <span>Token:</span>
          <span>#{intent.tokenId.toString()}</span>
        </div>
        <div className="detail-row">
          <span>Price:</span>
          <span>{(intent.price / 1e8).toFixed(2)} {intent.currency}</span>
        </div>
        <div className="detail-row">
          <span>Seller:</span>
          <span className="mono">{intent.seller.toString()}</span>
        </div>
        {intent.buyer && (
          <div className="detail-row">
            <span>Buyer:</span>
            <span className="mono">{intent.buyer.toString()}</span>
          </div>
        )}
      </div>
      
      <div className="status-description">
        {statusDisplay.description}
      </div>
      
      {intent.status === 'active' && (
        <div className="actions">
          <PurchaseButton intent={intent} />
          {/* Show cancel/update for owner */}
        </div>
      )}
    </div>
  );
}
\`\`\`

#### Trading History Component
\`\`\`typescript
function TokenTradingHistory({ canisterId, tokenId }) {
  const { history, loading, error } = useIntentHistory(canisterId, tokenId);
  
  if (loading) return <HistoryLoader />;
  if (error) return <HistoryError error={error} />;
  
  if (!history || history.length === 0) {
    return (
      <div className="no-history">
        <span>No trading history available</span>
      </div>
    );
  }
  
  const formatDate = (timestamp) => {
    return new Date(Number(timestamp) / 1000000).toLocaleString();
  };
  
  const getTypeIcon = (type) => {
    switch (type) {
      case 'listed': return '📝';
      case 'sold': return '💰';
      case 'cancelled': return '❌';
      case 'price_updated': return '📊';
      default: return '📋';
    }
  };
  
  return (
    <div className="trading-history">
      <h3>Trading History</h3>
      
      <div className="history-list">
        {history.map((record, index) => (
          <div key={index} className="history-item">
            <div className="type">
              <span className="icon">{getTypeIcon(record.type)}</span>
              <span className="text">{record.type}</span>
            </div>
            
            <div className="details">
              <div className="price">
                {(record.price / 1e8).toFixed(2)} ICP
              </div>
              <div className="timestamp">
                {formatDate(record.timestamp)}
              </div>
              <div className="status">
                {record.status}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="history-stats">
        <div>Total Events: {history.length}</div>
        <div>
          Last Sale: {
            history.find(h => h.type === 'sold')
              ? formatDate(history.find(h => h.type === 'sold').timestamp)
              : 'Never'
          }
        </div>
      </div>
    </div>
  );
}
\`\`\`

### Advanced Features
- Real-time price updates
- Intent expiration handling
- Batch listing operations
- Advanced filtering and sorting
- Price history analysis
- Market trend indicators
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
        story: 'Interactive demo of market and intent hooks with comprehensive marketplace functionality.',
      },
    },
  },
};

export const MarketplaceOverview: Story = {
  decorators: [
    (Story) => (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-bold mb-4">Marketplace Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
                <h3 className="text-sm font-medium opacity-90">Active Listings</h3>
                <p className="text-2xl font-bold">247</p>
                <p className="text-xs opacity-80">+12 from yesterday</p>
              </div>
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
                <h3 className="text-sm font-medium opacity-90">Floor Price</h3>
                <p className="text-2xl font-bold">0.85 ICP</p>
                <p className="text-xs opacity-80">-5% from yesterday</p>
              </div>
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
                <h3 className="text-sm font-medium opacity-90">24h Volume</h3>
                <p className="text-2xl font-bold">1,234 ICP</p>
                <p className="text-xs opacity-80">+23% from yesterday</p>
              </div>
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg">
                <h3 className="text-sm font-medium opacity-90">Total Sales</h3>
                <p className="text-2xl font-bold">8,956</p>
                <p className="text-xs opacity-80">All time</p>
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
        story: 'Marketplace overview showing key statistics and market health indicators.',
      },
    },
  },
};

export const IntentLifecycle: Story = {
  decorators: [
    (Story) => (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-bold mb-4">Intent Lifecycle States</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <h3 className="font-semibold text-green-800">Active</h3>
                </div>
                <p className="text-sm text-green-600">Intent is live and available for purchase</p>
                <div className="mt-2 text-xs text-green-500">
                  • Can be purchased<br/>
                  • Can be cancelled<br/>
                  • Price can be updated
                </div>
              </div>
              
              <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <h3 className="font-semibold text-blue-800">Fulfilled</h3>
                </div>
                <p className="text-sm text-blue-600">Intent was successfully purchased</p>
                <div className="mt-2 text-xs text-blue-500">
                  • Transaction completed<br/>
                  • NFT transferred<br/>
                  • Payment processed
                </div>
              </div>
              
              <div className="p-4 border border-gray-200 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <h3 className="font-semibold text-gray-800">Cancelled</h3>
                </div>
                <p className="text-sm text-gray-600">Intent was cancelled by seller</p>
                <div className="mt-2 text-xs text-gray-500">
                  • No longer available<br/>
                  • Seller initiated<br/>
                  • Can create new intent
                </div>
              </div>
              
              <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <h3 className="font-semibold text-red-800">Expired</h3>
                </div>
                <p className="text-sm text-red-600">Intent reached expiration time</p>
                <div className="mt-2 text-xs text-red-500">
                  • Time limit reached<br/>
                  • Auto-cancelled<br/>
                  • Can relist token
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
        story: 'Visual representation of intent lifecycle states and transitions.',
      },
    },
  },
};
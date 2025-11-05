import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useManageMarket, useMintFakeTokens } from '../../hooks/useMarketMutations';
import { useMarketListingNFT } from '../../hooks/useMarketListingNFT';
import { useOwnerListingNFT } from '../../hooks/useOwnerListingNFT';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IdentityKitProvider } from '@nfid/identitykit/react';
import { IdentityKitAuthType } from '@nfid/identitykit';
import { AgentProvider } from '../../provider/AgentProvider';
import '@nfid/identitykit/react/styles.css';

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

function MarketHooksDemo() {
  const [marketCanisterId, setMarketCanisterId] = useState('ryjl3-tyaaa-aaaaa-aaaba-cai');
  const [tokenCanisterId, setTokenCanisterId] = useState('ryjl3-tyaaa-aaaaa-aaaba-cai');
  const [tokenId, setTokenId] = useState('1');
  const [ownerPrincipal, setOwnerPrincipal] = useState('ryjl3-tyaaa-aaaaa-aaaba-cai');
  const { user } = useAuth();

  const marketListing = useMarketListingNFT(marketCanisterId, tokenCanisterId, BigInt(tokenId || '1'));
  const ownerListings = useOwnerListingNFT(marketCanisterId, ownerPrincipal, { status: 'open' });
  const manageMarket = useManageMarket(marketCanisterId);
  const mintFakeTokens = useMintFakeTokens(marketCanisterId);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">ICRC-8 Market Hook Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Market Canister ID</label>
            <input type="text" value={marketCanisterId} onChange={(e) => setMarketCanisterId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Token Canister ID</label>
            <input type="text" value={tokenCanisterId} onChange={(e) => setTokenCanisterId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Token ID</label>
            <input type="text" value={tokenId} onChange={(e) => setTokenId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Owner Principal</label>
            <input type="text" value={ownerPrincipal} onChange={(e) => setOwnerPrincipal(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono" />
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${user ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {user ? '✓ Authenticated' : '⚠ Not Authenticated'}
          </span>
          {user && <span className="text-sm text-gray-600 font-mono">{user.principal.toText().slice(0, 20)}...</span>}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">useMarketListingNFT</h2>
        <div className="space-y-3">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${marketListing.loading ? 'bg-yellow-100 text-yellow-800' : marketListing.error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            Status: {marketListing.loading ? 'Loading...' : marketListing.error ? 'Error' : 'Loaded'}
          </div>
          {marketListing.error && <div className="bg-red-50 p-3 rounded border border-red-200 text-sm text-red-700"><strong>Error:</strong> {String(marketListing.error)}</div>}
          {marketListing.listing && (
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">Listing Data:</h3>
              <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-60">{JSON.stringify(marketListing.listing, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2)}</pre>
            </div>
          )}
          {!marketListing.loading && !marketListing.error && !marketListing.listing && <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm text-blue-700"><strong>Info:</strong> No listing found</div>}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">useOwnerListingNFT</h2>
        <div className="space-y-3">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${ownerListings.loading ? 'bg-yellow-100 text-yellow-800' : ownerListings.error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            Status: {ownerListings.loading ? 'Loading...' : ownerListings.error ? 'Error' : 'Loaded'}
          </div>
          {ownerListings.error && <div className="bg-red-50 p-3 rounded border border-red-200 text-sm text-red-700"><strong>Error:</strong> {String(ownerListings.error)}</div>}
          {ownerListings.listings && (
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">Owner Listings (status: open):</h3>
              <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-60">{JSON.stringify(ownerListings.listings, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2)}</pre>
            </div>
          )}
          {!ownerListings.loading && !ownerListings.error && !ownerListings.listings && <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm text-blue-700"><strong>Info:</strong> No listings found</div>}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">Market Mutations</h2>
        <div className="space-y-4">
          <div className="border-t pt-4 first:border-t-0 first:pt-0">
            <h3 className="font-semibold mb-2">useManageMarket</h3>
            <p className="text-sm text-gray-600 mb-3">Mutation for list, end, execute, withdraw market intents</p>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${manageMarket.isPending ? 'bg-yellow-100 text-yellow-800' : manageMarket.isError ? 'bg-red-100 text-red-800' : manageMarket.isSuccess ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {manageMarket.isPending ? 'Pending...' : manageMarket.isError ? 'Error' : manageMarket.isSuccess ? 'Success' : 'Idle'}
            </div>
            {manageMarket.isError && <div className="mt-2 bg-red-50 p-2 rounded text-xs text-red-700">{String(manageMarket.error)}</div>}
            {!user && <div className="mt-2 bg-yellow-50 p-2 rounded text-xs text-yellow-700">⚠ Authentication required</div>}
          </div>
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">useMintFakeTokens</h3>
            <p className="text-sm text-gray-600 mb-3">Test utility for minting fake tokens</p>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${mintFakeTokens.isPending ? 'bg-yellow-100 text-yellow-800' : mintFakeTokens.isError ? 'bg-red-100 text-red-800' : mintFakeTokens.isSuccess ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {mintFakeTokens.isPending ? 'Pending...' : mintFakeTokens.isError ? 'Error' : mintFakeTokens.isSuccess ? 'Success' : 'Idle'}
            </div>
            {mintFakeTokens.isError && <div className="mt-2 bg-red-50 p-2 rounded text-xs text-red-700">{String(mintFakeTokens.error)}</div>}
            {!user && <div className="mt-2 bg-yellow-50 p-2 rounded text-xs text-yellow-700">⚠ Authentication required</div>}
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
        component: 'ICRC-8 Market Hooks for managing NFT marketplace intents.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof MarketHooksDemo>;

export const Interactive: Story = {
  render: () => <MarketHooksDemo />,
};

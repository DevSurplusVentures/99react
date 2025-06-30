import React, { createContext, useContext } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CollectionDetail } from '../components/CollectionDetail';
import type { CollectionMetadata } from '../core/CollectionMetadata';

// --- Mock test metadata
const testCollection: CollectionMetadata = {
  name: 'Test Monkeys',
  symbol: 'MONK',
  description: 'A collection of test monkeys for NFT demos.\nThey are silly and fun! 🐒',
  logo: 'https://api.dicebear.com/7.x/thumbs/svg?seed=Monkey',
  totalSupply: 123n,
  supplyCap: 500n,
  atomicBatchTransfers: true,
  maxQueryBatchSize: 20n,
  raw: [],
};

// --- Storybook mock for the useNFTCollection hook
function useNFTCollectionMocked(canisterId: string) {
  // Use the same logic as mockUseNFTCollection
  switch (canisterId) {
    case 'abcdef-test-collection':
      return { collection: testCollection, loading: false, error: null };
    case 'xxx-nologo':
      return { collection: { ...testCollection, logo: undefined, symbol: undefined }, loading: false, error: null };
    case 'loading-demo-collection':
      return { collection: null, loading: true, error: null };
    case 'error-demo-collection':
      return { collection: null, loading: false, error: 'Mock error' };
    case 'missing-collection':
      return { collection: null, loading: false, error: null };
    default:
      return { collection: null, loading: false, error: null };
  }
}

// --- Context and Provider for mocking useNFTCollection ---
const NFTCollectionHookContext = createContext<typeof useNFTCollectionMocked | null>(null);

export function useNFTCollection(canisterId: string) {
  const ctx = useContext(NFTCollectionHookContext);
  if (ctx) return ctx(canisterId);
  return useNFTCollectionMocked(canisterId);
}

const NFTCollectionHookProvider = ({ children }: { children: React.ReactNode }) => (
  <NFTCollectionHookContext.Provider value={useNFTCollectionMocked}>
    {children}
  </NFTCollectionHookContext.Provider>
);

export default {
  component: CollectionDetail,
  title: 'NFT/CollectionDetail',
  decorators: [
    (Story) => (
      <NFTCollectionHookProvider>
        <Story />
      </NFTCollectionHookProvider>
    ),
  ],
} as Meta<typeof CollectionDetail>;

type Story = StoryObj<typeof CollectionDetail>;

/** Default view - all fields present */
export const Default: Story = {
  args: {
    canisterId: 'abcdef-test-collection',
  },
};

/** No logo field, no symbol */
export const NoLogo: Story = {
  args: {
    canisterId: 'xxx-nologo',
  },
};

/** Loading state (simulate via manual prop) */
export const Loading: Story = {
  args: {
    canisterId: 'loading-demo-collection',
  },
  render: (args) => (
    <CollectionDetail {...args} loadingComponent={<div className="py-8 text-center text-blue-400">Loading (story override)...</div>} />
  ),
};

/** Error state (simulate via manual prop) */
export const Error: Story = {
  args: {
    canisterId: 'error-demo-collection',
  },
  render: (args) => (
    <CollectionDetail {...args} errorComponent={<div className="py-8 text-center text-red-600">Custom error (story)</div>} />
  ),
};

/** No collection object at all (null) */
export const NotFound: Story = {
  args: {
    canisterId: 'missing-collection',
  },
};

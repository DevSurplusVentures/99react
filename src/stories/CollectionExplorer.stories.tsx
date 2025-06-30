import React, { createContext, useContext } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CollectionExplorer } from '../components/CollectionExplorer';
import type { CollectionMetadata } from '../core/CollectionMetadata';

const SAMPLE_COLLECTIONS: { canisterId: string; collection: Partial<CollectionMetadata> }[] = [
  {
    canisterId: 'aaaaa-aa',
    collection: {
      name: 'Cats',
      symbol: 'CATS',
      description: 'The Cat NFT collection',
      logo: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f408.png',
    },
  },
  {
    canisterId: 'bbbbb-bb',
    collection: {
      name: 'Dogs',
      symbol: 'DOGS',
      description: 'Doggos rule',
      logo: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f415.png',
    },
  },
  {
    canisterId: 'ccccc-cc',
    collection: {
      name: 'Bananas',
      symbol: 'BNNA',
      logo: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f34c.png',
      description: 'Peelable NFT fruit, when available.'
    },
  },
];

// --- Storybook mock for the useNFTCollection hook
const mockMap: Record<string, CollectionMetadata> = Object.fromEntries(
  SAMPLE_COLLECTIONS.map(({ canisterId, collection }) => [
    canisterId,
    ({
      name: collection.name,
      symbol: collection.symbol,
      description: collection.description,
      logo: collection.logo,
      raw: []
    } as CollectionMetadata),
  ])
);

function mockUseNFTCollection(canisterId: string) {
  if (mockMap[canisterId]) {
    return { collection: mockMap[canisterId], loading: false, error: null };
  }
  if (canisterId === 'zzzxx-zz') {
    return { collection: null, loading: false, error: 'Mock error' };
  }
  if (canisterId === 'ccccc-cc') {
    return { collection: null, loading: true, error: null };
  }
  return { collection: null, loading: false, error: null };
}

// --- Context and Provider for mocking useNFTCollection ---
const NFTCollectionHookContext = createContext<typeof mockUseNFTCollection | null>(null);

export function useNFTCollectionMocked(canisterId: string) {
  const ctx = useContext(NFTCollectionHookContext);
  if (ctx) return ctx(canisterId);
  // fallback to default mock if not in provider
  return mockUseNFTCollection(canisterId);
}

const NFTCollectionHookProvider = ({ children }: { children: React.ReactNode }) => (
  <NFTCollectionHookContext.Provider value={mockUseNFTCollection}>
    {children}
  </NFTCollectionHookContext.Provider>
);

export default {
  title: 'NFT/CollectionExplorer',
  component: CollectionExplorer,
  decorators: [
    (Story) => (
      <NFTCollectionHookProvider>
        <Story />
      </NFTCollectionHookProvider>
    ),
  ],
} as Meta<typeof CollectionExplorer>;

export const Default: StoryObj<typeof CollectionExplorer> = {
  args: {
    canisterIds: SAMPLE_COLLECTIONS.map((c) => c.canisterId),
    onSelectCollection: (cid, col) => alert(`Selected: ${col?.name || cid}`),
  },
  name: 'Default (some loading)',
};

export const Empty: StoryObj<typeof CollectionExplorer> = {
  args: {
    canisterIds: [],
  },
  name: 'Empty',
};

export const FullLoading: StoryObj<typeof CollectionExplorer> = {
  args: {
    canisterIds: ['ccccc-cc'],
  },
  name: 'All Loading',
};

export const Error: StoryObj<typeof CollectionExplorer> = {
  args: {
    canisterIds: ['zzzxx-zz'],
  },
  name: 'Error State',
};

export const AllSuccess: StoryObj<typeof CollectionExplorer> = {
  args: {
    canisterIds: ['aaaaa-aa', 'bbbbb-bb'],
    onSelectCollection: (cid, col) => alert(`Selected: ${col?.name || cid}`),
  },
  name: 'All Loaded',
};
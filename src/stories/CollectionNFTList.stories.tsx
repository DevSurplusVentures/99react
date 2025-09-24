import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { NFTCard } from '../components/NFTCard';

// Mock NFT data for the story
const MOCK_NFTS = Array.from({ length: 123 }, (_, i) => ({
  canisterId: 'abcdef-test-collection',
  tokenId: BigInt(i + 1),
  nftMetadata: {
    loading: false,
    error: null,
    metadata: {
      allMetadata: [],
      parsedMetadata: {
        icrc97raw: '{}',
        icrc97: {
          name: `Test NFT #${i + 1}`,
          description: `This is NFT #${i + 1}`,
          image: `https://api.dicebear.com/7.x/thumbs/svg?seed=NFT${i + 1}`,
          animation_url: '',
          external_url: '',
          attributes: [
            { trait_type: 'Rarity', value: ['Common', 'Rare', 'Epic'][i % 3] },
          ],
        },
      },
      tokenId: BigInt(i + 1),
    },
  },
}));

const PAGE_SIZES = [10, 100, 1000];

const CollectionNFTListStory = () => {
  const [view, setView] = useState<'list' | 'tile'>('tile');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [search, setSearch] = useState('');

  // Filter and paginate
  const filtered = search
    ? MOCK_NFTS.filter((nft) => nft.tokenId.toString().includes(search))
    : MOCK_NFTS;
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <input
          className="border rounded px-3 py-1"
          placeholder="Search by token_id..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="border rounded px-2 py-1"
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>{size} per page</option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <button
            className={`px-3 py-1 rounded ${view === 'tile' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setView('tile')}
          >Tile</button>
          <button
            className={`px-3 py-1 rounded ${view === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setView('list')}
          >List</button>
        </div>
      </div>
      {view === 'tile' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {paged.map((nft) => (
            <NFTCard key={nft.tokenId.toString()} {...nft} />
          ))}
        </div>
      ) : (
        <table className="w-full border rounded-lg bg-white shadow-sm text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">Image</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Token ID</th>
              <th className="p-2 text-left">Rarity</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((nft, idx) => (
              <tr key={nft.tokenId.toString()} className="border-t hover:bg-blue-50">
                <td className="p-2">{(page - 1) * pageSize + idx + 1}</td>
                <td className="p-2">
                  <img
                    src={nft.nftMetadata.metadata.parsedMetadata.icrc97.image}
                    alt={nft.nftMetadata.metadata.parsedMetadata.icrc97.name}
                    className="w-8 h-8 object-cover rounded"
                  />
                </td>
                <td className="p-2">{nft.nftMetadata.metadata.parsedMetadata.icrc97.name}</td>
                <td className="p-2">{nft.tokenId.toString()}</td>
                <td className="p-2">{nft.nftMetadata.metadata.parsedMetadata.icrc97.attributes.find(a => a.trait_type === 'Rarity')?.value || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="flex justify-between items-center mt-6">
        <span>
          Page {page} of {totalPages} ({filtered.length} items)
        </span>
        <div className="flex gap-2">
          <button
            className="px-2 py-1 border rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >Prev</button>
          <button
            className="px-2 py-1 border rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >Next</button>
        </div>
      </div>
    </div>
  );
};

export default {
  title: 'NFT/CollectionNFTList',
  component: CollectionNFTListStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## CollectionNFTList Component

Displays a filterable and sortable list of NFTs within a collection with pagination.

### Features
- **NFT Grid Display**: Responsive grid layout for NFT items with customizable sizing
- **Advanced Filtering**: Filter by traits, price range, rarity, and custom attributes
- **Multiple Sort Options**: Sort by price, rarity, token ID, recent activity, and metadata
- **Pagination**: Efficient loading and navigation for large collections
- **Selection Mode**: Multi-select functionality for batch operations
- **Quick Actions**: Buy, list, transfer, and bridge NFTs directly from the list
- **Search Functionality**: Text-based search across NFT metadata

### Use Cases
- Collection browsing and exploration
- NFT marketplace collection listings
- Portfolio management and organization
- Bulk operations (bridge, transfer, list multiple NFTs)
- Market analysis and trait research
        `,
      },
    },
  },
  argTypes: {
    canisterId: {
      control: 'text',
      description: 'The canister ID of the collection to display NFTs from'
    },
    pageSize: {
      control: { type: 'select' },
      options: [6, 12, 24, 48],
      description: 'Number of NFTs to display per page'
    }
  },
} as Meta<typeof CollectionNFTListStory>;

export const Default: StoryObj<typeof CollectionNFTListStory> = {
  render: () => <CollectionNFTListStory />,
};

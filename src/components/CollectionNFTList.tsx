import React, { useState } from 'react';
import { NFTCard } from '../components/NFTCard';
import { useNFTMetadata } from '../hooks/useNFTMetadata';
import { useNFTOwner } from '../hooks/useNFTOwner';
import { useMarketListingNFT } from '../hooks/useMarketListingNFT';
import { MarketListingPrice } from './MarketListingPrice';

export interface CollectionNFTListProps {
  canisterId: string;
  tokenIds: bigint[];
  loading?: boolean;
  error?: any;
}

const PAGE_SIZES = [10, 100, 1000];

const marketId = 'uxrrr-q7777-77774-qaaaq-cai'; // Replace with your actual market canister ID

export const CollectionNFTList: React.FC<CollectionNFTListProps> = ({ canisterId, tokenIds, loading, error }) => {
  const [view, setView] = useState<'list' | 'tile'>('tile');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [search, setSearch] = useState('');

  // Filter and paginate
  const filtered = search
    ? tokenIds.filter((id) => id.toString().includes(search))
    : tokenIds;
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  console.log("loading,error", loading, error);

  if (loading) return <div className="py-8 text-center text-blue-400">Loading NFTs...</div>;
  if (error) return <div className="py-8 text-center text-red-600">Error loading NFTs</div>;

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
          {paged.map((tokenId) => (
            <NFTCard key={tokenId.toString()} canisterId={canisterId} tokenId={tokenId} marketId={marketId} />
          ))}
        </div>
      ) : (
        <table className="w-full border rounded-lg bg-white shadow-sm text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">Image</th>
              <th className="p-2 text-left">Name</th>
              
              <th className="p-2 text-left">Owner</th>
              <th className="p-2 text-left">Market Listing</th>
              <th className="p-2 text-left">Description</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((tokenId, idx) => (
              <NFTListRow key={tokenId.toString()} canisterId={canisterId} tokenId={tokenId} index={(page - 1) * pageSize + idx + 1} />
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

// Helper row for the table view
const NFTListRow: React.FC<{ canisterId: string; tokenId: bigint; index: number }> = ({ canisterId, tokenId, index }) => {
  const { metadata, loading: metaLoading } = useNFTMetadata(canisterId, tokenId);
  const { owner, loading: ownerLoading, error: ownerError } = useNFTOwner(canisterId, tokenId);
  const marketId = 'uxrrr-q7777-77774-qaaaq-cai';
  const { listing, loading: marketLoading, error: marketError } = useMarketListingNFT(marketId, canisterId, tokenId);
  const image = metadata?.parsedMetadata?.icrc97?.image;
  const name = metadata?.parsedMetadata?.icrc97?.name;
  const description = metadata?.parsedMetadata?.icrc97?.description;

  return (
    <tr className="border-t hover:bg-blue-50">
      <td className="p-2 font-medium text-gray-900">{index}</td>
      <td className="p-2">
        {metaLoading ? (
          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
        ) : image ? (
          <img
            src={image}
            alt={name || 'NFT'}
            className="w-8 h-8 object-cover rounded"
          />
        ) : (
          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">?</div>
        )}
      </td>
      <td className="p-2 text-gray-900">
        {name || <span className="text-gray-400">...</span>}
        <div className="text-xs text-gray-500">ID: {tokenId.toString()}</div>
      </td>
      <td className="p-2">
        {ownerLoading ? (
          <span className="text-xs text-gray-400">Loading...</span>
        ) : ownerError ? (
          <span className="text-xs text-red-500">Error</span>
        ) : owner ? (
          <span className="text-xs text-gray-700 truncate" title={owner.owner}>Owner: {owner.owner}</span>
        ) : (
          <span className="text-xs text-gray-400">Unknown</span>
        )}
      </td>
      <td className="p-2">
        {marketLoading ? (
          <span className="text-xs text-gray-400">Loading...</span>
        ) : marketError ? (
          <span className="text-xs text-red-500">Error</span>
        ) : (
          <span className="text-xs text-green-600">
            <MarketListingPrice
              listing={listing}
              marketCanisterId={marketId}
              intentId={listing?.intent_id}
              nftCanisterId={canisterId}
              tokenId={tokenId}
              owner={owner}
            />
          </span>
        )}
      </td>
      <td className="p-2 text-gray-700">
        {description ? (
          <span className="text-xs">{description}</span>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )}
      </td>
    </tr>
  );
};

export default CollectionNFTList;

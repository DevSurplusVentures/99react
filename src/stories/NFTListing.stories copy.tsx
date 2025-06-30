import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
// Placeholder for future atomic card etc.

/**
 * NFT Listing Wireframe
 * Core Marketplace view showing a grid of NFTs for discovery/browsing.
 * Replace placeholder content with real data and atomic components as developed.
 */
const meta: Meta = {
  title: 'Marketplace/NFT Listing',
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs', 'wireframe'],
};
export default meta;
type Story = StoryObj;

const mockNFTs = Array(6).fill(0).map((_, idx) => ({
  name: `NFT #${idx + 1}`,
  image: '', // Placeholder image link
  price: `${(idx + 1) * 0.05} ICP`,
  owner: 'xxxx...',
}));

export const Default: Story = {
  render: () => (
    <main className="p-8">
      <h2 className="text-2xl font-bold mb-4">NFT Marketplace</h2>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {mockNFTs.map((nft, idx) => (
          <div key={idx} className="rounded-lg border border-gray-300 bg-white p-4">
            <div className="h-36 bg-gray-200 mb-2 rounded flex items-center justify-center">
              <span className="text-gray-400">Image</span>
            </div>
            <div className="font-bold">{nft.name}</div>
            <div>Owner: <span className="text-xs text-gray-500">{nft.owner}</span></div>
            <div className="font-bold">{nft.price}</div>
            <button className="mt-2 w-full px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition">View/Purchase</button>
          </div>
        ))}
      </div>
    </main>
  ),
};

export const Loading: Story = {
  render: () => (
    <main className="p-8">
      <h2 className="text-2xl font-bold mb-4">NFT Marketplace</h2>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array(6).fill(0).map((_, idx) => (
          <div key={idx} className="rounded-lg border border-gray-300 bg-white p-4 opacity-60">
            <div className="h-36 bg-gray-100 mb-2 rounded" />
            <div className="bg-gray-200 h-5 mb-1 rounded" />
            <div className="bg-gray-200 h-4 w-20 mb-1 rounded" />
            <div className="bg-gray-200 h-5 w-10 mb-1 rounded" />
            <div className="bg-gray-200 h-6 w-full rounded" />
          </div>
        ))}
      </div>
    </main>
  ),
};

export const Empty: Story = {
  render: () => (
    <main className="p-8">
      <h2 className="text-2xl font-bold mb-4">NFT Marketplace</h2>
      <div className="py-10 text-center text-gray-500">
        <span>No NFTs found.</span>
      </div>
    </main>
  ),
};

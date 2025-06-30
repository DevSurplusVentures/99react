import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

export interface OwnedNFTCardProps {
  name: string;
  id: string;
  status: string;
  className?: string;
  style?: React.CSSProperties;
}

export const OwnedNFTCard: React.FC<OwnedNFTCardProps> = ({ name, id, status, className = '', style }) => (
  <div className={`rounded-lg border border-gray-300 bg-blue-50 p-4 flex-shrink-0 w-[220px] ${className}`} style={style}>
    <div className="h-24 bg-gray-200 mb-2 rounded flex items-center justify-center">
      <span className="text-gray-400">Image</span>
    </div>
    <div><b>{name}</b> <span className="text-xs text-gray-500">#{id}</span></div>
    {status === 'listed' ? (
      <span className="text-blue-600 font-medium mt-1 text-sm block">Listed for Sale</span>
    ) : (
      <span className="text-green-700 font-medium mt-1 text-sm block">Owned</span>
    )}
  </div>
);

const meta: Meta = {
  title: 'User/Owned NFTs',
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs', 'wireframe'],
};
export default meta;
type Story = StoryObj;

const ownedNFTs = [
  { name: 'My NFT 1', id: '001', status: 'owned' },
  { name: 'My NFT 2', id: '002', status: 'listed' },
];

export const Default: Story = {
  render: () => (
    <main className="p-8">
      <h2 className="text-2xl font-bold mb-4">Your NFTs</h2>
      <div className="flex gap-6 flex-wrap">
        {ownedNFTs.map((nft, idx) => (
          <OwnedNFTCard key={idx} {...nft} />
        ))}
      </div>
    </main>
  ),
};

export const Styled: Story = {
  render: () => (
    <main className="p-8 bg-gray-900 min-h-screen">
      <h2 className="text-2xl font-bold mb-4 text-white">Your NFTs (Styled)</h2>
      <div className="flex gap-6 flex-wrap">
        {ownedNFTs.map((nft, idx) => (
          <OwnedNFTCard
            key={idx}
            {...nft}
            className="border-blue-400 bg-blue-950 text-white"
            style={{}}
          />
        ))}
      </div>
    </main>
  ),
};

export const Empty: Story = {
  render: () => (
    <main className="p-8">
      <h2 className="text-2xl font-bold mb-4">Your NFTs</h2>
      <div className="text-gray-400">No NFTs owned yet.</div>
    </main>
  ),
};

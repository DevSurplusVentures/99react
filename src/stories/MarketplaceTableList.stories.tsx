import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

export interface MarketplaceTableListRowProps {
  name: string;
  owner: string;
  price: string;
  lastSale: string;
  className?: string;
  style?: React.CSSProperties;
}

export const MarketplaceTableListRow: React.FC<MarketplaceTableListRowProps> = ({ name, owner, price, lastSale, className = '', style }) => (
  <tr className={className} style={style}>
    <td className="px-3 py-2">
      <div className="h-8 w-8 bg-gray-200 rounded flex items-center justify-center">
        <span role="img" aria-label="NFT">🖼️</span>
      </div>
    </td>
    <td className="px-3 py-2">{name}</td>
    <td className="px-3 py-2">{owner}</td>
    <td className="px-3 py-2">{price}</td>
    <td className="px-3 py-2">{lastSale}</td>
    <td className="px-3 py-2"><button className="px-3 py-1 rounded bg-blue-600 text-white border-none">Buy</button></td>
  </tr>
);

const meta: Meta = {
  title: 'Marketplace/NFT Table List',
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs', 'wireframe'],
};
export default meta;
type Story = StoryObj;

const nfts = [
  { id: '1', name: 'Bored Ape', price: '2.1 ICP', owner: 'aa...', lastSale: '2.3 ICP' },
  { id: '2', name: 'Crypto Frog', price: '0.6 ICP', owner: 'bb...', lastSale: '0.64 ICP' },
  { id: '3', name: 'Pixel Artifact', price: '5.5 ICP', owner: 'cc...', lastSale: '4.9 ICP' },
];

export const Default: Story = {
  render: () => (
    <section className="p-8">
      <h2 className="text-2xl font-bold mb-4">NFTs (List View)</h2>
      <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2"></th>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-left">Owner</th>
            <th className="px-3 py-2 text-left">Price</th>
            <th className="px-3 py-2 text-left">Last Sale</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {nfts.map((nft, idx) => (
            <MarketplaceTableListRow key={nft.id} {...nft} />
          ))}
        </tbody>
      </table>
    </section>
  ),
};

export const Styled: Story = {
  render: () => (
    <section style={{ padding: 32, background: '#222' }}>
      <h2 style={{ color: '#fff' }}>NFTs (Styled List View)</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#0e2233', borderRadius: 6 }}>
        <thead>
          <tr style={{ color: '#00eaff' }}>
            <th></th>
            <th>Name</th>
            <th>Owner</th>
            <th>Price</th>
            <th>Last Sale</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {nfts.map((nft, idx) => (
            <MarketplaceTableListRow
              key={nft.id}
              {...nft}
              className="border-b border-blue-400"
              style={{ color: '#fff' }}
            />
          ))}
        </tbody>
      </table>
    </section>
  ),
};

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

export interface MarketLeaderBoardRowProps {
  rank: number;
  name: string;
  volume: string;
  floor: string;
  change: string;
  className?: string;
  style?: React.CSSProperties;
}

export const MarketLeaderBoardRow: React.FC<MarketLeaderBoardRowProps> = ({ rank, name, volume, floor, change, className = '', style }) => {
  return (
    <tr className={className} style={style}>
      <td className="px-3 py-2 text-gray-600 font-semibold">{rank ?? '-'}</td>
      <td className="px-3 py-2 font-medium">{name ?? '-'}</td>
      <td className="px-3 py-2">{volume ?? '-'}</td>
      <td className="px-3 py-2">{floor ?? '-'}</td>
      <td className={`px-3 py-2 font-semibold ${typeof change === 'string' && change.startsWith('+') ? 'text-green-700' : 'text-red-600'}`}>{change ?? '-'}</td>
    </tr>
  );
};

const meta: Meta = {
  title: 'Marketplace/Leader Board',
  parameters: { layout: 'centered' },
  tags: ['autodocs', 'wireframe'],
};
export default meta;
type Story = StoryObj;

const leaderboard = [
  { rank: 1, name: 'Ape Club', volume: '1,320 ICP', floor: '2.1 ICP', change: '+12%' },
  { rank: 2, name: 'Pixel Artifacts', volume: '258 ICP', floor: '0.23 ICP', change: '-2%' },
  { rank: 3, name: 'Crypto Frogs', volume: '980 ICP', floor: '6 ICP', change: '+5%' },
];

export const Default: Story = {
  render: () => (
    <section className="p-8">
      <h3 className="text-xl font-bold mb-4">Top NFT Collections</h3>
      <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Collection</th>
            <th className="px-3 py-2 text-left">Vol</th>
            <th className="px-3 py-2 text-left">Floor</th>
            <th className="px-3 py-2 text-left">7d Change</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((row) => (
            <MarketLeaderBoardRow key={row.rank} {...row} />
          ))}
        </tbody>
      </table>
    </section>
  ),
};

export const Styled: Story = {
  render: () => (
    <section className="p-8 bg-gray-900">
      <h3 className="text-xl font-bold text-white mb-4">Top NFT Collections (Styled)</h3>
      <table className="min-w-full border border-gray-700 rounded-lg overflow-hidden">
        <thead className="bg-gray-800 text-blue-400">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Collection</th>
            <th className="px-3 py-2 text-left">Vol</th>
            <th className="px-3 py-2 text-left">Floor</th>
            <th className="px-3 py-2 text-left">7d Change</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((row) => (
            <MarketLeaderBoardRow
              key={row.rank}
              {...row}
              className="border-b border-blue-400"
              style={{ color: '#fff' }}
            />
          ))}
        </tbody>
      </table>
    </section>
  ),
};

export const WithMissingData: Story = {
  render: () => (
    <section className="p-8">
      <h3 className="text-xl font-bold mb-4">Top NFT Collections (With Missing Data)</h3>
      <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Collection</th>
            <th className="px-3 py-2 text-left">Vol</th>
            <th className="px-3 py-2 text-left">Floor</th>
            <th className="px-3 py-2 text-left">7d Change</th>
          </tr>
        </thead>
        <tbody>
          <MarketLeaderBoardRow rank={1} name="Ape Club" volume="1,320 ICP" floor="2.1 ICP" change={undefined as any} />
          <MarketLeaderBoardRow rank={2} name={undefined as any} volume={undefined as any} floor="0.23 ICP" change="-2%" />
          <MarketLeaderBoardRow rank={undefined as any} name="Crypto Frogs" volume="980 ICP" floor={undefined as any} change={undefined as any} />
          <MarketLeaderBoardRow rank={4} name={null as any} volume={null as any} floor={null as any} change={null as any} />
        </tbody>
      </table>
    </section>
  ),
};

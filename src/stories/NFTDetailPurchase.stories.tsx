import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

/**
 * NFT Detail & Purchase Wireframe
 * Detail card for a specific NFT, with purchase/transfer actions.
 */
const meta: Meta = {
  title: 'Marketplace/NFT Detail & Purchase',
  parameters: { layout: 'centered' },
  tags: ['autodocs', 'wireframe'],
};
export default meta;
type Story = StoryObj;

const mockNFT = {
  name: 'NFT #1',
  description: 'This is a cool on-chain NFT asset, ICRC-7 compatible.',
  image: '',
  price: '0.25 ICP',
  owner: 'aaaa...bbb',
};

export const Default: Story = {
  render: () => (
    <main className="p-8 flex justify-center">
      <section className="border border-gray-300 rounded-lg p-6 w-[350px] bg-gray-50">
        <div className="h-44 bg-gray-200 rounded mb-2 flex items-center justify-center">
          <span className="text-gray-400">NFT Image</span>
        </div>
        <div className="font-bold">{mockNFT.name}</div>
        <div className="text-gray-600 my-2">{mockNFT.description}</div>
        <div>Owner: <span className="text-gray-500 text-xs">{mockNFT.owner}</span></div>
        <div className="font-bold">{mockNFT.price}</div>
        <button className="mt-4 w-full px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition">Purchase</button>
      </section>
    </main>
  ),
};

export const Purchasing: Story = {
  render: () => (
    <section className="border border-gray-300 rounded-lg p-6 w-[350px] bg-blue-50 opacity-70">
      <div className="h-44 bg-gray-200 rounded mb-2 flex items-center justify-center">
        <span className="text-gray-400">NFT Image</span>
      </div>
      <div className="font-bold">{mockNFT.name}</div>
      <div className="text-gray-600 my-2">{mockNFT.description}</div>
      <div>Owner: <span className="text-gray-500 text-xs">{mockNFT.owner}</span></div>
      <div className="font-bold">{mockNFT.price}</div>
      <button className="mt-4 w-full px-3 py-2 rounded bg-blue-600 text-white opacity-70 cursor-not-allowed">Processing...</button>
    </section>
  ),
};

export const Error: Story = {
  render: () => (
    <section className="border border-red-500 rounded-lg p-6 w-[350px] bg-red-50">
      <div className="h-44 bg-gray-200 rounded mb-2 flex items-center justify-center">
        <span className="text-gray-400">NFT Image</span>
      </div>
      <div className="font-bold">{mockNFT.name}</div>
      <div className="text-gray-600 my-2">{mockNFT.description}</div>
      <div className="text-red-500 mb-2">Error: Failed to purchase.</div>
      <button className="mt-4 w-full px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition">Retry</button>
    </section>
  ),
};

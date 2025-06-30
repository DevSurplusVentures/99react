import { Meta, StoryObj } from '@storybook/react';
import { Header } from './Header';
import ProductCard from './ProductCard';
import React from 'react';

const meta: Meta = {
  title: 'Showcase/PageDemo',
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <div className="min-h-screen bg-gray-50 p-8">
      <Header user={{ name: 'Jane Doe' }} onLogin={() => {}} onLogout={() => {}} onCreateAccount={() => {}} />
      <h1 className="font-bold text-3xl my-8">Marketplace Demo Page</h1>
      <div className="flex gap-8 flex-wrap mb-10">
        <ProductCard
          title="Wireless Headphones"
          price={99.99}
          image="/globe.svg"
          onAddToCart={() => {}}
          className="rounded-lg border border-gray-300 bg-white"
        />
        <ProductCard
          title="Premium Sneakers"
          price={150}
          image="/globe.svg"
          onAddToCart={() => {}}
          className="rounded-lg border border-gray-300 bg-white"
        >
          <span className="text-gray-400 text-xs">Limited Edition</span>
        </ProductCard>
      </div>
    </div>
  ),
};
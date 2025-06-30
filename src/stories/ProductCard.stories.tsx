import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import ProductCard, { ProductCardProps } from './ProductCard';

const meta: Meta<typeof ProductCard> = {
  title: 'Marketplace/ProductCard',
  component: ProductCard,
  argTypes: {
    onAddToCart: { action: 'clicked' },
    className: { control: 'text' },
    children: { control: false },
  },
};
export default meta;

type Story = StoryObj<typeof ProductCard>;

export const Default: Story = {
  render: () => (
    <ProductCard
      title="Wireless Headphones"
      price={99.99}
      image="/globe.svg"
      onAddToCart={() => {}}
      className="rounded-lg border border-gray-300 bg-white"
    />
  ),
};

export const Styled: Story = {
  render: () => (
    <ProductCard
      title="Premium Sneakers"
      price={150}
      image="/globe.svg"
      onAddToCart={() => {}}
      className="rounded-lg border border-blue-400 bg-blue-950 text-white"
      style={{}}
    >
      <span className="text-gray-400 text-xs">Limited Edition</span>
    </ProductCard>
  ),
};

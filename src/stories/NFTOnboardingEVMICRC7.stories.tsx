import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

/**
 * NFT Onboarding (EVM <> ICRC-7) Wireframe
 * Wizard-style UI for onboarding/migrating NFTs between EVM and ICRC-7
 */
const meta: Meta = {
  title: 'Onboarding/EVM-ICRC7 Migration',
  parameters: { layout: 'centered' },
  tags: ['autodocs', 'wireframe'],
};
export default meta;
type Story = StoryObj;

export const StepperEVMtoICRC7: Story = {
  render: () => (
    <section className="border border-gray-300 rounded-xl p-8 min-w-[420px] bg-blue-50">
      <h3 className="text-lg font-bold mb-4">Migrate NFT from EVM to ICRC-7</h3>
      <ol className="list-decimal ml-6 my-6 text-base">
        <li>Select EVM Wallet</li>
        <li>Choose NFT to Migrate</li>
        <li>Confirm Transfer</li>
        <li>Receive on ICP/ICRC-7</li>
      </ol>
      <div className="my-4 text-gray-800">Step 2: Choose NFT to migrate</div>
      <div className="h-15 bg-gray-200 rounded mb-3 flex items-center justify-center">
        <span className="text-gray-400">NFT asset row placeholder</span>
      </div>
      <div className="h-15 bg-gray-200 rounded mb-3 flex items-center justify-center">
        <span className="text-gray-400">NFT asset row placeholder</span>
      </div>
      <button className="mt-5 w-full px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition">Next</button>
    </section>
  )
};

export const StepperICRC7toEVM: Story = {
  render: () => (
    <section className="border border-gray-300 rounded-xl p-8 min-w-[420px] bg-blue-50">
      <h3 className="text-lg font-bold mb-4">Migrate NFT from ICRC-7 to EVM</h3>
      <ol className="list-decimal ml-6 my-6 text-base">
        <li>Select ICP Wallet</li>
        <li>Choose NFT to Migrate</li>
        <li>Confirm Transfer</li>
        <li>Receive on EVM</li>
      </ol>
      <div className="my-4 text-gray-800">Step 3: Confirm Transfer</div>
      <div className="h-12 bg-gray-200 rounded mb-3 flex items-center justify-center">
        <span className="text-gray-400">Transfer Confirmation UI Placeholder</span>
      </div>
      <button className="mt-5 w-full px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition">Transfer</button>
    </section>
  )
};

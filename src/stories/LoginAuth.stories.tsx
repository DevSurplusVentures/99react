import type { Meta, StoryObj } from '@storybook/react';
import LoginAuth from './LoginAuth';
import React from 'react';

/**
 * Authentication/Login Wireframe
 * Auth component supporting agnostic wallet login (ICP, EVM, etc)
 */
const meta: Meta = {
  title: 'User/Auth/Login',
  parameters: { layout: 'centered' },
  tags: ['autodocs', 'wireframe'],
};
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <LoginAuth className="" />
  ),
};

export const Loading: Story = {
  render: () => (
    <section className="min-w-[340px] border border-gray-300 rounded-lg p-7 bg-gray-50 flex flex-col gap-4 opacity-60">
      <h3 className="text-lg font-bold">Sign In</h3>
      <div className="p-2.5 bg-gray-200 rounded" />
      <div className="p-2.5 bg-gray-200 rounded" />
      <div className="p-2.5 bg-gray-200 rounded" />
    </section>
  )
};

export const LoggedIn: Story = {
  render: () => (
    <section className="min-w-[340px] border border-gray-300 rounded-lg p-7 bg-gray-50 flex flex-col gap-4">
      <h3 className="text-lg font-bold">Welcome!</h3>
      <span>Logged in as <b>principal:abcdef-123...</b></span>
      <button className="w-full p-2.5 bg-white rounded border border-gray-200">Log out</button>
    </section>
  )
};

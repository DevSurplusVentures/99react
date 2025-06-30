import type { Meta, StoryObj } from '@storybook/react';
import { TailwindButton } from './TailwindButton';

const meta = {
  title: 'Example/TailwindButton',
  component: TailwindButton,
  tags: ['autodocs'],
  argTypes: {
    primary: { control: 'boolean' },
    size: { control: { type: 'select', options: ['small', 'medium', 'large'] } },
    label: { control: 'text' },
  },
} satisfies Meta<typeof TailwindButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    primary: true,
    label: 'Tailwind Button',
  },
};

export const Secondary: Story = {
  args: {
    primary: false,
    label: 'Tailwind Button',
  },
};

export const Large: Story = {
  args: {
    size: 'large',
    label: 'Large Button',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
    label: 'Small Button',
  },
};
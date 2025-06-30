import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

export interface TraitsGroupProps {
  label: string;
  options: { name: string; count: number }[];
  className?: string;
  style?: React.CSSProperties;
}

export const TraitsGroup: React.FC<TraitsGroupProps> = ({ label, options = [], className = '', style }) => (
  <div className={className} style={style}>
    <details>
      <summary className="font-semibold cursor-pointer">{label}</summary>
      <div className="py-2 flex flex-col gap-1">
        {(options || []).map((opt, oidx) => (
          <label key={oidx} className="flex items-center cursor-pointer">
            <input type="checkbox" className="mr-1.5" />
            {opt.name} <span className="text-gray-500 ml-1.5 text-xs">{opt.count}</span>
          </label>
        ))}
      </div>
    </details>
  </div>
);

const meta: Meta = {
  title: 'Marketplace/Traits Explorer',
  parameters: { layout: 'centered' },
  tags: ['autodocs', 'wireframe'],
};
export default meta;
type Story = StoryObj;

const traitGroups = [
  { label: 'Background', options: [{ name: 'Blue', count: 42 }, { name: 'Pink', count: 31 }] },
  { label: 'Eyes', options: [{ name: 'Laser', count: 10 }, { name: 'Closed', count: 12 }, { name: 'Open', count: 50 }] },
  { label: 'Hat', options: [{ name: 'Cap', count: 24 }, { name: 'Crown', count: 6 }] }
];

export const Default: Story = {
  render: () => (
    <aside className="p-8">
      <h3 className="text-lg font-bold mb-4">Filter by Traits</h3>
      {traitGroups.map((group, gidx) => (
        <TraitsGroup key={gidx} label={group.label} options={group.options || []} className="mb-4 p-4 rounded-lg border border-gray-200 bg-white" />
      ))}
    </aside>
  ),
};

export const Styled: Story = {
  render: () => (
    <aside className="p-8 bg-gray-900 min-h-screen">
      <h3 className="text-lg font-bold mb-4 text-cyan-400">Filter by Traits (Styled)</h3>
      {traitGroups.map((group, gidx) => (
        <TraitsGroup
          key={gidx}
          label={group.label}
          options={group.options || []}
          className="mb-4 p-4 rounded-lg border border-cyan-400 bg-gray-950 text-white"
        />
      ))}
    </aside>
  ),
};

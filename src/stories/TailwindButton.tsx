import React from 'react';

export interface TailwindButtonProps {
  label: string;
  primary?: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

const sizeClasses = {
  small: 'px-4 py-2 text-xs',
  medium: 'px-5 py-2.5 text-sm',
  large: 'px-6 py-3 text-base',
};

export const TailwindButton = ({
  label,
  primary = false,
  size = 'medium',
  ...props
}: TailwindButtonProps) => {
  const mode = primary
    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
    : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100';
  return (
    <button
      type="button"
      className={`rounded-full font-bold ${sizeClasses[size]} ${mode}`}
      {...props}
    >
      {label}
    </button>
  );
};
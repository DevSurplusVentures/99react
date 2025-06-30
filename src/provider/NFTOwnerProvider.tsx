import React, { createContext, useContext, ReactNode } from 'react';
import { Account } from '../core/Account';

interface NFTOwnerProviderProps {
  children: ReactNode;
  // Optionally accept a value map for mocking, test, or custom overrides
  value?: Record<string, Account|null>;
}

const NFTOwnerContext = createContext<Record<string, Account|null> | undefined>(undefined);

export const NFTOwnerProvider = ({ children, value }: NFTOwnerProviderProps) => (
  <NFTOwnerContext.Provider value={value}>{children}</NFTOwnerContext.Provider>
);

export function useNFTOwnerContext() {
  return useContext(NFTOwnerContext);
}
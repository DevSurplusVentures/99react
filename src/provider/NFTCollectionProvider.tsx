import React, { createContext, useContext, ReactNode } from 'react';
import { CollectionMetadata } from '../core/CollectionMetadata';

interface NFTCollectionProviderProps {
  children: ReactNode;
  value?: CollectionMetadata | null;
}

const NFTCollectionContext = createContext<CollectionMetadata | null | undefined>(undefined);

export const NFTCollectionProvider = ({ children, value }: NFTCollectionProviderProps) => (
  <NFTCollectionContext.Provider value={value}>{children}</NFTCollectionContext.Provider>
);

export function useNFTCollectionContext() {
  return useContext(NFTCollectionContext);
}
import React, { createContext, useContext, ReactNode } from 'react';
import { useNFTBatcher } from '../core/NFTMetadataBatcher';
// Not required to override for most apps, provided for extension points

const NFTBatcherContext = createContext<ReturnType<typeof useNFTBatcher> | undefined>(undefined);

export const NFTBatcherProvider = ({ children, canisterId }: { children: ReactNode; canisterId: string }) => {
  const batcher = useNFTBatcher(canisterId);
  return (
    <NFTBatcherContext.Provider value={batcher}>{children}</NFTBatcherContext.Provider>
  );
};

export function useNFTBatcherContext() {
  const context = useContext(NFTBatcherContext);
  if (!context) {
    throw new Error('useNFTBatcherContext must be used within an NFTBatcherProvider');
  }
  return context;
}
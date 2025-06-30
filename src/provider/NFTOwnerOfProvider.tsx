import React, { createContext, useContext, ReactNode } from 'react';

/**
 * Provider for supplying mock or eager data about all NFTs a given user owns in a collection.
 * @param value - map of account key to tokenIds
 */
type NFTOwnerOfMap = Record<string, bigint[]>;

const NFTOwnerOfContext = createContext<NFTOwnerOfMap | undefined>(undefined);

export const NFTOwnerOfProvider = ({ children, value }: { children: ReactNode; value?: NFTOwnerOfMap }) => (
  <NFTOwnerOfContext.Provider value={value}>{children}</NFTOwnerOfContext.Provider>
);

export function useNFTOwnerOfContext() {
  return useContext(NFTOwnerOfContext);
}
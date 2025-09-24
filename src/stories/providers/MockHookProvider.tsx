import React, { createContext, useContext } from 'react';
import { Principal } from '@dfinity/principal';

// Mock data
const mockUserPrincipal = Principal.fromText('2223e-iaaaa-aaaac-awyra-cai');

// Context for providing mock hook implementations
interface MockHookContextValue {
  useAuth: () => any;
  useMetaMask: () => any;
  use99Mutations: () => any;
  useFungibleToken: () => any;
  useOrchestratorAllowance: () => any;
}

const MockHookContext = createContext<MockHookContextValue | null>(null);

export function MockHookProvider({ children }: { children: React.ReactNode }) {
  const mockHooks: MockHookContextValue = {
    useAuth: () => ({
      user: {
        principal: mockUserPrincipal,
      },
      isAuthenticated: true,
    }),
    
    useMetaMask: () => ({
      activeAddress: '0x742b35cc6bb90d88b8e0f9c4c9e51e48b6b90e85',
      isUnlocked: true,
      isConnected: true,
    }),
    
    use99Mutations: () => ({
      getCkNFTCanister: {
        mutateAsync: async () => [mockUserPrincipal],
      },
      getBurnFundingAddress: {
        mutateAsync: async () => '0xadf4de73a3dc0927bc250cd781ee889a91d27751',
      },
    }),
    
    useFungibleToken: () => ({
      useBalance: () => ({ 
        data: BigInt('1000000000000000'), // 1000T cycles
        isLoading: false,
        isError: false,
      }),
    }),
    
    useOrchestratorAllowance: () => ({
      data: {
        amount: BigInt('2000000000000000'),
        isExpired: false,
        isSufficient: true,
      },
    }),
  };

  return (
    <MockHookContext.Provider value={mockHooks}>
      {children}
    </MockHookContext.Provider>
  );
}

// Export mock hooks that components can use
export function useMockAuth() {
  const context = useContext(MockHookContext);
  return context?.useAuth() ?? {
    user: { principal: mockUserPrincipal },
    isAuthenticated: true,
  };
}

export function useMockMetaMask() {
  const context = useContext(MockHookContext);
  return context?.useMetaMask() ?? {
    activeAddress: '0x742b35cc6bb90d88b8e0f9c4c9e51e48b6b90e85',
    isUnlocked: true,
    isConnected: true,
  };
}

export function useMock99Mutations() {
  const context = useContext(MockHookContext);
  return context?.use99Mutations() ?? {
    getCkNFTCanister: { mutateAsync: async () => [mockUserPrincipal] },
    getBurnFundingAddress: { mutateAsync: async () => '0xadf4de73a3dc0927bc250cd781ee889a91d27751' },
  };
}

export function useMockFungibleToken() {
  const context = useContext(MockHookContext);
  return context?.useFungibleToken() ?? {
    useBalance: () => ({ 
      data: BigInt('1000000000000000'),
      isLoading: false,
      isError: false,
    }),
  };
}

export function useMockOrchestratorAllowance() {
  const context = useContext(MockHookContext);
  return context?.useOrchestratorAllowance() ?? {
    data: {
      amount: BigInt('2000000000000000'),
      isExpired: false,
      isSufficient: true,
    },
  };
}
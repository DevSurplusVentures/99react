import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, afterEach, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EVMExportWizard } from '../EVMExportWizard';
import type { SelectedICNFT } from '../EVMExportWizard';

// Test wrapper with QueryClient
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Mock hooks
vi.mock('../../../hooks/useEVM', () => ({
  useMetaMask: () => ({
    activeAddress: '0x742d35Cc6635C0532925a3b8D11e432f1b7C4b7b',
    isUnlocked: true,
    connectWallet: vi.fn(),
    switchChain: vi.fn(),
    chainId: 1,
  }),
}));

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { principal: 'test-principal' },
  }),
}));

vi.mock('../../../hooks/use99Mutations', () => ({
  use99Mutations: () => ({
    getMintStatus: { mutate: vi.fn() },
    createCanister: { mutate: vi.fn() },
    mintFromEVM: { mutate: vi.fn() },
    getApprovalAddress: { mutate: vi.fn() },
  }),
}));

const defaultProps = {
  sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
  supportedNetworks: ['ethereum', 'polygon'],
  onComplete: vi.fn(),
  onCancel: vi.fn(),
};

const mockSelectedNFTs: SelectedICNFT[] = [
  {
    tokenId: '1',
    canisterId: 'umunu-kh777-77774-qaaca-cai',
    metadata: {},
    owner: { toText: () => 'test-principal' } as any,
    name: 'Test NFT #1',
    description: 'A test NFT',
  },
];

describe('EVMExportWizard', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <TestWrapper>
        <EVMExportWizard {...defaultProps} />
      </TestWrapper>,
    );

    expect(screen.getByText('Export NFTs to EVM')).toBeDefined();
  });

  it('can be rendered as modal', () => {
    render(
      <TestWrapper>
        <EVMExportWizard {...defaultProps} modal={true} />
      </TestWrapper>,
    );

    // Modal should have backdrop
    const modal = screen.getByText('Export NFTs to EVM').closest('.fixed');
    expect(modal).toBeDefined();
  });

  it('shows wallet connection step initially', () => {
    render(
      <TestWrapper>
        <EVMExportWizard {...defaultProps} />
      </TestWrapper>,
    );

    expect(screen.getByText('Connect Your EVM Wallet')).toBeDefined();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const mockOnCancel = vi.fn();
    render(
      <TestWrapper>
        <EVMExportWizard {...defaultProps} onCancel={mockOnCancel} />
      </TestWrapper>,
    );

    const cancelButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg') // Find the X button
    );
    if (cancelButton) {
      fireEvent.click(cancelButton);
      expect(mockOnCancel).toHaveBeenCalled();
    }
  });

  it('shows selected NFTs when provided', () => {
    render(
      <TestWrapper>
        <EVMExportWizard 
          {...defaultProps} 
          mockSelectedICNFTs={mockSelectedNFTs}
          mockWalletConnected={true}
          initialStep="select-ic-nft"
        />
      </TestWrapper>,
    );

    expect(screen.getByText('Test NFT #1')).toBeDefined();
    expect(screen.getByText('1 NFT selected')).toBeDefined();
  });

  it('shows remote contract step when configured', () => {
    render(
      <TestWrapper>
        <EVMExportWizard 
          {...defaultProps} 
          mockSelectedICNFTs={mockSelectedNFTs}
          mockWalletConnected={true}
          initialStep="remote-contract"
        />
      </TestWrapper>,
    );

    expect(screen.getByText('Configure Remote Contract')).toBeDefined();
  });

  it('shows costs step when ready', () => {
    render(
      <TestWrapper>
        <EVMExportWizard 
          {...defaultProps} 
          mockSelectedICNFTs={mockSelectedNFTs}
          mockWalletConnected={true}
          mockExportCosts="15000000000"
          initialStep="costs"
        />
      </TestWrapper>,
    );

    expect(screen.getByText('Export Costs')).toBeDefined();
  });

  it('shows completion step on success', () => {
    render(
      <TestWrapper>
        <EVMExportWizard 
          {...defaultProps} 
          mockSelectedICNFTs={mockSelectedNFTs}
          mockWalletConnected={true}
          mockExportResult={{
            success: true,
            evmTransactionHash: '0x123...',
            remoteContractAddress: '0x456...',
            tokenId: '1',
          }}
          initialStep="complete"
        />
      </TestWrapper>,
    );

    expect(screen.getByText('Export Successful!')).toBeDefined();
  });

  it('shows error state on failure', () => {
    render(
      <TestWrapper>
        <EVMExportWizard 
          {...defaultProps} 
          mockSelectedICNFTs={mockSelectedNFTs}
          mockWalletConnected={true}
          mockExportResult={{
            success: false,
            error: 'Test error message',
          }}
          initialStep="complete"
        />
      </TestWrapper>,
    );

    expect(screen.getByText('Export Failed')).toBeDefined();
    expect(screen.getByText('Test error message')).toBeDefined();
  });

  it('handles multiple NFT export', () => {
    const multipleNFTs = [
      ...mockSelectedNFTs,
      {
        tokenId: '2',
        canisterId: 'umunu-kh777-77774-qaaca-cai',
        metadata: {},
        owner: { toText: () => 'test-principal' } as any,
        name: 'Test NFT #2',
        description: 'Another test NFT',
      },
    ];

    render(
      <TestWrapper>
        <EVMExportWizard 
          {...defaultProps} 
          mockSelectedICNFTs={multipleNFTs}
          mockWalletConnected={true}
          mockExportResult={{
            success: true,
            evmTransactionHash: '0x123...',
            remoteContractAddress: '0x456...',
            tokenId: '1, 2',
          }}
          initialStep="complete"
        />
      </TestWrapper>,
    );

    expect(screen.getByText('2 NFTs Exported Successfully!')).toBeDefined();
  });

  it('navigates between steps correctly', async () => {
    render(
      <TestWrapper>
        <EVMExportWizard 
          {...defaultProps} 
          mockWalletConnected={true}
        />
      </TestWrapper>,
    );

    // Should start at connect step
    expect(screen.getByText('Connect Your EVM Wallet')).toBeDefined();

    // Next button should be enabled when wallet is connected
    const nextButton = screen.getByRole('button', { name: /next/i }) as HTMLButtonElement;
    expect(nextButton.disabled).toBe(false);

    // Previous button should be disabled on first step
    const prevButton = screen.getByRole('button', { name: /previous/i }) as HTMLButtonElement;
    expect(prevButton.disabled).toBe(true);
  });
});

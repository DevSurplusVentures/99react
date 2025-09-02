import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EVMImportWizard } from '../EVMImportWizard';

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

describe('EVMImportWizard', () => {
  const defaultProps = {
    canisterId: 'test-canister-id',
    supportedNetworks: ['ethereum', 'polygon'],
    onComplete: jest.fn(),
    onCancel: jest.fn(),
  };

  it('renders the wizard with initial step', () => {
    render(
      <EVMImportWizard {...defaultProps} />,
      { wrapper: TestWrapper }
    );

    // Check for the main heading
    expect(screen.getByText('Import NFTs from EVM')).toBeInTheDocument();
    
    // Check for the first step
    expect(screen.getByText('Connect Your EVM Wallet')).toBeInTheDocument();
    
    // Check for the progress indicator
    expect(screen.getByText('Step 1 of 6: Connect your EVM wallet')).toBeInTheDocument();
  });

  it('renders in modal mode when modal prop is true', () => {
    render(
      <EVMImportWizard {...defaultProps} modal={true} />,
      { wrapper: TestWrapper }
    );

    // Modal should have the overlay styles
    const modalOverlay = screen.getByRole('dialog', { hidden: true }) || 
                        document.querySelector('[class*="fixed"][class*="inset-0"]');
    expect(modalOverlay).toBeInTheDocument();
  });

  it('shows correct step indicators', () => {
    render(
      <EVMImportWizard {...defaultProps} />,
      { wrapper: TestWrapper }
    );

    // Should show 6 steps in the progress indicator
    const stepNumbers = screen.getAllByText(/^[1-6]$/);
    expect(stepNumbers).toHaveLength(6);
  });

  it('calls onCancel when cancel button is clicked', () => {
    const mockOnCancel = jest.fn();
    
    render(
      <EVMImportWizard {...defaultProps} onCancel={mockOnCancel} />,
      { wrapper: TestWrapper }
    );

    const cancelButton = screen.getByRole('button', { name: /close/i });
    cancelButton.click();
    
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});

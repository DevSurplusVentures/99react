import type { Meta, StoryObj } from '@storybook/react';
import { EVMExportWizard } from '../components/bridge/EVMExportWizard';

const meta: Meta<typeof EVMExportWizard> = {
  title: 'Bridge/EVMExportWizard',
  component: EVMExportWizard,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    onComplete: { action: 'export completed' },
    onCancel: { action: 'export cancelled' },
  },
};

export default meta;
type Story = StoryObj<typeof EVMExportWizard>;

// Mock selected IC NFTs for testing
const mockSelectedICNFTs = [
  {
    tokenId: '1',
    canisterId: 'umunu-kh777-77774-qaaca-cai',
    metadata: {
      name: 'Bored Ape #1234',
      description: 'A rare Bored Ape NFT from the BAYC collection',
    },
    owner: { toText: () => 'test-principal' } as any,
    image: 'https://via.placeholder.com/300x300/4F46E5/FFFFFF?text=BAYC+1234',
    name: 'Bored Ape #1234',
    description: 'A rare Bored Ape NFT from the BAYC collection',
  },
  {
    tokenId: '2',
    canisterId: 'umunu-kh777-77774-qaaca-cai',
    metadata: {
      name: 'CryptoPunk #5678',
      description: 'A classic CryptoPunk from the legendary collection',
    },
    owner: { toText: () => 'test-principal' } as any,
    image: 'https://via.placeholder.com/300x300/10B981/FFFFFF?text=Punk+5678',
    name: 'CryptoPunk #5678',
    description: 'A classic CryptoPunk from the legendary collection',
  },
];

// Basic export wizard
export const Default: Story = {
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    supportedNetworks: ['ethereum', 'polygon', 'arbitrum'],
    modal: false,
  },
};

// With wallet connected
export const WalletConnected: Story = {
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    supportedNetworks: ['ethereum', 'polygon', 'arbitrum'],
    mockWalletConnected: true,
    modal: false,
  },
};

// With selected NFTs
export const WithSelectedNFTs: Story = {
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    supportedNetworks: ['ethereum', 'polygon', 'arbitrum'],
    mockWalletConnected: true,
    mockSelectedICNFTs,
    initialStep: 'select-ic-nft',
    modal: false,
  },
};

// Remote contract step
export const RemoteContractStep: Story = {
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    supportedNetworks: ['ethereum', 'polygon', 'arbitrum'],
    mockWalletConnected: true,
    mockSelectedICNFTs,
    initialStep: 'remote-contract',
    modal: false,
  },
};

// Costs step
export const CostsStep: Story = {
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    supportedNetworks: ['ethereum', 'polygon', 'arbitrum'],
    mockWalletConnected: true,
    mockSelectedICNFTs,
    mockExportCosts: '15000000000',
    initialStep: 'costs',
    modal: false,
  },
};

// Export in progress
export const ExportInProgress: Story = {
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    supportedNetworks: ['ethereum', 'polygon', 'arbitrum'],
    mockWalletConnected: true,
    mockSelectedICNFTs,
    mockExportCosts: '15000000000',
    initialStep: 'export',
    modal: false,
  },
};

// Success
export const ExportComplete: Story = {
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    supportedNetworks: ['ethereum', 'polygon', 'arbitrum'],
    mockWalletConnected: true,
    mockSelectedICNFTs,
    mockExportResult: {
      success: true,
      evmTransactionHash: '0x1234567890abcdef1234567890abcdef12345678',
      remoteContractAddress: '0x9876543210fedcba9876543210fedcba98765432',
      tokenId: '1, 2',
    },
    initialStep: 'complete',
    modal: false,
  },
};

// Failure
export const ExportFailed: Story = {
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    supportedNetworks: ['ethereum', 'polygon', 'arbitrum'],
    mockWalletConnected: true,
    mockSelectedICNFTs,
    mockExportResult: {
      success: false,
      error: 'Insufficient cycles balance. Please top up your cycles and try again.',
    },
    initialStep: 'complete',
    modal: false,
  },
};

// Single NFT export
export const SingleNFTExport: Story = {
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    supportedNetworks: ['ethereum', 'polygon'],
    mockWalletConnected: true,
    mockSelectedICNFTs: [mockSelectedICNFTs[0]],
    mockExportResult: {
      success: true,
      evmTransactionHash: '0x1234567890abcdef1234567890abcdef12345678',
      remoteContractAddress: '0x9876543210fedcba9876543210fedcba98765432',
      tokenId: '1',
    },
    initialStep: 'complete',
    modal: false,
  },
};

// Modal version
export const ModalVersion: Story = {
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    supportedNetworks: ['ethereum', 'polygon', 'arbitrum'],
    mockWalletConnected: true,
    modal: true,
  },
};

// Limited networks
export const LimitedNetworks: Story = {
  args: {
    sourceCanisterId: 'umunu-kh777-77774-qaaca-cai',
    supportedNetworks: ['ethereum'],
    mockWalletConnected: true,
    initialStep: 'remote-contract',
    modal: false,
  },
};

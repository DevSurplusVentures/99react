import { FC, ReactNode, useMemo } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
  TrustWalletAdapter,
  LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

export type SolanaCluster = 'mainnet-beta' | 'devnet' | 'testnet';

interface SolanaWalletProviderProps {
  children: ReactNode;
  cluster?: SolanaCluster;
  endpoint?: string;
}

/**
 * SolanaWalletProvider
 * 
 * Provides Solana wallet connection functionality using the industry-standard
 * @solana/wallet-adapter packages (maintained by Solana Labs).
 * 
 * This is the Solana ecosystem's equivalent of RainbowKit/wagmi for EVM chains.
 * It's used by ALL major Solana dApps: Jupiter, Magic Eden, Phantom, Marinade, etc.
 * 
 * Supported Wallets (auto-detected if installed):
 * - Phantom, Solflare, Coinbase, Trust, Ledger (explicitly configured)
 * - Backpack, Trezor, Torus, Nightly, Slope, Coin98, Alpha (via wallet standard)
 * - 35+ total wallets supported out of the box
 * 
 * Note: Backpack implements the Wallet Standard and is automatically detected.
 * No separate adapter needed - it will appear in the modal if users have it installed.
 * 
 * Features:
 * - Multi-wallet support with auto-detection
 * - Network switching (mainnet-beta, devnet, testnet)
 * - Custom RPC endpoint support
 * - Built-in wallet modal UI (like RainbowKit)
 * - Automatic connection persistence
 * 
 * Usage:
 * ```tsx
 * <SolanaWalletProvider cluster="mainnet-beta">
 *   <App />
 * </SolanaWalletProvider>
 * ```
 * 
 * @param children - React children components
 * @param cluster - Solana network cluster (default: 'devnet')
 * @param endpoint - Optional custom RPC endpoint URL
 */
export const SolanaWalletProvider: FC<SolanaWalletProviderProps> = ({
  children,
  cluster = 'devnet',
  endpoint,
}) => {
  // Determine the network and RPC endpoint
  const network = useMemo(() => {
    switch (cluster) {
      case 'mainnet-beta':
        return WalletAdapterNetwork.Mainnet;
      case 'devnet':
        return WalletAdapterNetwork.Devnet;
      case 'testnet':
        return WalletAdapterNetwork.Testnet;
      default:
        return WalletAdapterNetwork.Devnet;
    }
  }, [cluster]);

  // Use custom endpoint or generate default cluster URL
  const rpcEndpoint = useMemo(
    () => endpoint || clusterApiUrl(network),
    [endpoint, network]
  );

  // Configure supported wallets
  // Using wallet-adapter's auto-detection, these wallets will only appear if installed
  // This provides the best UX as users only see wallets they actually have
  const wallets = useMemo(
    () => [
      /**
       * Phantom Wallet - Most popular Solana wallet (~6M users)
       * Browser extension and mobile app support
       */
      new PhantomWalletAdapter(),

      /**
       * Solflare Wallet - Feature-rich wallet with hardware support
       * Multi-chain support, Ledger integration
       */
      new SolflareWalletAdapter({ network }),

      /**
       * Coinbase Wallet - Major exchange wallet
       * Wide user base, multi-chain support
       */
      new CoinbaseWalletAdapter(),

      /**
       * Trust Wallet - Popular mobile wallet
       * Multi-chain support, large user base
       */
      new TrustWalletAdapter(),

      /**
       * Ledger - Hardware wallet support
       * Maximum security for high-value NFTs
       */
      new LedgerWalletAdapter(),

      /**
       * Note: More wallets are automatically detected via the Wallet Standard.
       * 
       * Wallets auto-detected (if installed):
       * - Backpack (implements Wallet Standard - no adapter needed)
       * - Torus, Trezor, Nightly, Slope, Coin98, Alpha
       * - Any wallet that implements the Wallet Standard protocol
       * 
       * The @solana/wallet-adapter packages handle auto-detection automatically.
       * No need to explicitly add adapters for Wallet Standard compliant wallets.
       */
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={rpcEndpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

/**
 * Helper function to get cluster name from WalletAdapterNetwork enum
 * @param network - WalletAdapterNetwork enum value
 * @returns Solana cluster name
 */
export function getClusterName(network: WalletAdapterNetwork): SolanaCluster {
  switch (network) {
    case WalletAdapterNetwork.Mainnet:
      return 'mainnet-beta';
    case WalletAdapterNetwork.Devnet:
      return 'devnet';
    case WalletAdapterNetwork.Testnet:
      return 'testnet';
    default:
      return 'devnet';
  }
}

/**
 * Helper function to validate Solana cluster name
 * @param cluster - Cluster name to validate
 * @returns true if valid cluster name
 */
export function isValidCluster(cluster: string): cluster is SolanaCluster {
  return ['mainnet-beta', 'devnet', 'testnet'].includes(cluster);
}

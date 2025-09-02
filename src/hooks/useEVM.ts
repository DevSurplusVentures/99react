import { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import '../types/global.d.ts';

// Types for chain configuration
export interface ChainConfig {
  chainId: number;
  name: string;
  rpc: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrls: string[];
}

// Standard ERC721 ABI fragments
const ERC721_ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function approve(address to, uint256 tokenId)",
  "function setApprovalForAll(address operator, bool approved)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  "function transferFrom(address from, address to, uint256 tokenId)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function tokenByIndex(uint256 index) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)"
];

// Hook to detect and connect to MetaMask
export function useMetaMask() {
  const [isDetected, setIsDetected] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeAddress, setActiveAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    if (window.ethereum) {
      setIsDetected(true);
      
      // Check initial accounts
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        setIsUnlocked(accounts.length > 0);
        setActiveAddress(accounts[0] || null);
      });

      // Check initial chain
      window.ethereum.request({ method: 'eth_chainId' }).then((chainId: string) => {
        setChainId(parseInt(chainId, 16));
      });

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        setIsUnlocked(accounts.length > 0);
        setActiveAddress(accounts[0] || null);
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', (chainId: string) => {
        setChainId(parseInt(chainId, 16));
      });
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) throw new Error('MetaMask not detected');
    
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    setActiveAddress(accounts[0]);
    setIsUnlocked(true);
    return accounts[0];
  };

  const switchChain = async (targetChainId: number) => {
    if (!window.ethereum) throw new Error('MetaMask not detected');
    
    const chainIdHex = '0x' + targetChainId.toString(16);
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (error: any) {
      // Chain not added to MetaMask
      if (error.code === 4902) {
        throw new Error(`Chain ${targetChainId} not added to MetaMask`);
      }
      throw error;
    }
  };

  return {
    isDetected,
    isUnlocked,
    activeAddress,
    chainId,
    connectWallet,
    switchChain,
  };
}

// Hook to get ethers provider and signer
export function useEthersProvider(chainConfig?: ChainConfig) {
  const { activeAddress, chainId } = useMetaMask();

  const provider = useMemo(() => {
    if (chainConfig) {
      return new ethers.JsonRpcProvider(chainConfig.rpc);
    }
    if (window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    return null;
  }, [chainConfig]);

  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  // Update signer when dependencies change
  useEffect(() => {
    if (!window.ethereum || !activeAddress) {
      setSigner(null);
      return;
    }
    
    // Ensure we're on the correct chain
    if (chainConfig && chainId !== chainConfig.chainId) {
      setSigner(null);
      return;
    }
    
    const getSigner = async () => {
      try {
        const browserProvider = new ethers.BrowserProvider(window.ethereum!);
        const signerInstance = await browserProvider.getSigner();
        setSigner(signerInstance);
      } catch (error) {
        console.error('Failed to get signer:', error);
        setSigner(null);
      }
    };

    getSigner();
  }, [activeAddress, chainId, chainConfig]);

  return { provider, signer };
}

// Hook to interact with ERC721 contracts
export function useERC721Contract(
  contractAddress: string,
  chainConfig: ChainConfig,
  requireSigner = false
) {
  const { provider, signer } = useEthersProvider(chainConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contract = useMemo(() => {
    if (!provider) return null;
    
    const providerOrSigner = requireSigner ? signer : provider;
    if (requireSigner && !providerOrSigner) {
      return null;
    }
    
    return new ethers.Contract(contractAddress, ERC721_ABI, providerOrSigner);
  }, [contractAddress, provider, signer, requireSigner]);

  const getOwner = async (tokenId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!contract) throw new Error('Contract not available');
      
      const owner = await contract.ownerOf(tokenId);
      return owner.toLowerCase();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getTokenURI = async (tokenId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!contract) throw new Error('Contract not available');
      
      const uri = await contract.tokenURI(tokenId);
      return uri;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getApproved = async (tokenId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!contract) throw new Error('Contract not available');
      
      const approved = await contract.getApproved(tokenId);
      return approved.toLowerCase();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const approve = async (to: string, tokenId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!contract) throw new Error('Contract not available');
      
      const tx = await contract.approve(to, tokenId);
      await tx.wait();
      return tx.hash;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const safeTransferFrom = async (from: string, to: string, tokenId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!contract) throw new Error('Contract not available');
      
      const tx = await contract.safeTransferFrom(from, to, tokenId);
      await tx.wait();
      return tx.hash;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getContractInfo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!contract) throw new Error('Contract not available');
      
      const [name, symbol] = await Promise.all([
        contract.name(),
        contract.symbol(),
      ]);
      
      return { name, symbol };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    contract,
    isLoading,
    error,
    getOwner,
    getTokenURI,
    getApproved,
    approve,
    safeTransferFrom,
    getContractInfo,
  };
}

// Hook to manage gas fees and estimates
export function useGasFees(chainConfig: ChainConfig) {
  const { provider } = useEthersProvider(chainConfig);
  const [feeData, setFeeData] = useState<ethers.FeeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateFeeData = async () => {
    if (!provider) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const fees = await provider.getFeeData();
      setFeeData(fees);
      return fees;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const estimateGas = async (transaction: ethers.TransactionRequest) => {
    if (!provider) throw new Error('Provider not available');
    
    setIsLoading(true);
    setError(null);
    try {
      const gasEstimate = await provider.estimateGas(transaction);
      return gasEstimate;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getBalance = async (address: string) => {
    if (!provider) throw new Error('Provider not available');
    
    setIsLoading(true);
    setError(null);
    try {
      const balance = await provider.getBalance(address);
      return balance;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    updateFeeData();
  }, [provider]);

  return {
    feeData,
    isLoading,
    error,
    updateFeeData,
    estimateGas,
    getBalance,
  };
}

// Hook to track transaction status
export function useTransactionStatus() {
  const [transactions, setTransactions] = useState<Map<string, {
    hash: string;
    status: 'pending' | 'confirmed' | 'failed';
    confirmations: number;
    requiredConfirmations: number;
  }>>(new Map());

  const addTransaction = (
    hash: string, 
    requiredConfirmations = 12,
    provider?: ethers.Provider
  ) => {
    setTransactions(prev => new Map(prev.set(hash, {
      hash,
      status: 'pending',
      confirmations: 0,
      requiredConfirmations,
    })));

    // Start tracking if provider available
    if (provider) {
      trackTransaction(hash, provider, requiredConfirmations);
    }
  };

  const trackTransaction = async (
    hash: string, 
    provider: ethers.Provider,
    requiredConfirmations = 12
  ) => {
    try {
      const receipt = await provider.waitForTransaction(hash, requiredConfirmations);
      
      if (receipt) {
        // Get confirmations as a number
        const confirmationsValue = await receipt.confirmations();
          
        setTransactions(prev => new Map(prev.set(hash, {
          hash,
          status: receipt.status === 1 ? 'confirmed' : 'failed',
          confirmations: confirmationsValue,
          requiredConfirmations,
        })));
      }
    } catch (error) {
      setTransactions(prev => new Map(prev.set(hash, {
        hash,
        status: 'failed',
        confirmations: 0,
        requiredConfirmations,
      })));
    }
  };

  const getTransaction = (hash: string) => {
    return transactions.get(hash);
  };

  return {
    transactions,
    addTransaction,
    trackTransaction,
    getTransaction,
  };
}

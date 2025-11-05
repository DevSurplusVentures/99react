import { useState, useEffect, useMemo } from 'react';
import { ExternalLink, CheckCircle, Loader2, Plus, AlertCircle, Wallet } from 'lucide-react';
import { Principal } from '@dfinity/principal';
import type { SelectedICNFT, RemoteContractInfo } from './EVMExportWizard';
import type { Network, ContractPointer } from '../../declarations/orchestrator/orchestrator.did';
import { useAnonymousActor, useAuthenticatedActor } from '../../hooks/useActor';
import { idlFactory as orchestratorIdlFactory } from '../../declarations/orchestrator/orchestrator.did.js';
import type { _SERVICE as OrchestratorService } from '../../declarations/orchestrator/orchestrator.did';
import { useMetaMask } from '../../hooks/useEVM';
import { ethers } from 'ethers';
import { useAuth } from '../../hooks/useAuth';
import { useFungibleToken } from '../../hooks/useFungibleToken';
import ICRC99NFT from '../../contracts/ICRC99NFT.json';

// Get supported networks configuration
const getSupportedNetworks = () => ({
  1: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpc: 'https://eth.llamarpc.com',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['https://etherscan.io'],
  },
  137: {
    chainId: 137,
    name: 'Polygon',
    rpc: 'https://polygon-rpc.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorerUrls: ['https://polygonscan.com'],
  },
  56: {
    chainId: 56,
    name: 'BSC',
    rpc: 'https://bsc-dataseed.binance.org',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    blockExplorerUrls: ['https://bscscan.com'],
  },
  10: {
    chainId: 10,
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['https://optimistic.etherscan.io'],
  },
  8453: {
    chainId: 8453,
    name: 'Base',
    rpc: 'https://mainnet.base.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['https://basescan.org'],
  },
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpc: 'https://arb1.arbitrum.io/rpc',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['https://arbiscan.io'],
  },
  31337: {
    chainId: 31337,
    name: 'Hardhat Local',
    rpc: 'http://localhost:8545',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['http://localhost:8545'],
  },
});

// Format cycles with appropriate suffix (TCycles for trillions) - matching CanisterCostStep
const formatCycles = (cycles: bigint): string => {
  const decimals = 12; // Cycles have 12 decimals
  const divisor = BigInt(10 ** decimals);
  const whole = cycles / divisor;
  const fraction = cycles % divisor;
  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 3);
  return `${whole.toLocaleString()}.${fractionStr}`;
};

// Helper function to format cycles for display
const formatCyclesDisplay = (amount: bigint): string => {
  const decimals = 12; // Cycles have 12 decimals
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 3);
  return `${whole.toLocaleString()}.${fractionStr} TC`;
};

export interface RemoteContractStepProps {
  /** Selected NFTs to export */
  selectedNFTs: SelectedICNFT[];
  /** Target chain ID */
  targetChainId: string;
  /** Remote contract information */
  remoteContractInfo: RemoteContractInfo | null;
  /** Callback when remote contract info changes */
  onRemoteContractInfoChange: (info: RemoteContractInfo) => void;
  /** Source canister ID for contract lookup */
  sourceCanisterId: string;
  /** Source contract pointer (derived from ICRC-99 or IC fallback) */
  sourceContractPointer: ContractPointer | null;
}

interface ExistingContract {
  address: string;
  network: Network;
  name: string;
  symbol: string;
  totalSupply: number;
  verified: boolean;
  deploymentTx: string;
}

export function RemoteContractStep({
  selectedNFTs,
  targetChainId,
  remoteContractInfo,
  onRemoteContractInfoChange,
  sourceCanisterId,
  sourceContractPointer,
}: RemoteContractStepProps) {
  const [existingContract, setExistingContract] = useState<ExistingContract | null>(null);
  const [contractCheckComplete, setContractCheckComplete] = useState(false);
  const [isCheckingContract, setIsCheckingContract] = useState(false);
  
  // Remote contract creation state
  const [cyclesNeededForRemote, setCyclesNeededForRemote] = useState<bigint | null>(null);
  const [ethNeededForRemote, setEthNeededForRemote] = useState<bigint | null>(null);
  const [estimatedRemoteGas, setEstimatedRemoteGas] = useState<bigint | null>(null);
  const [remoteFundingAddress, setRemoteFundingAddress] = useState<string | null>(null);
  const [remoteFundingBalance, setRemoteFundingBalance] = useState<bigint | null>(null);
  const [cyclesApproval, setCyclesApproval] = useState<bigint | null>(null);
  const [isCreatingRemote, setIsCreatingRemote] = useState(false);
  const [isApprovingCycles, setIsApprovingCycles] = useState(false);
  const [isPollingForContract, setIsPollingForContract] = useState(false);
  const [createdContractTxHash, setCreatedContractTxHash] = useState<string | null>(null);
  const [hasEstimatedCosts, setHasEstimatedCosts] = useState(false);
  
  // Hooks
  const { activeAddress, isUnlocked, chainId } = useMetaMask();
  const { user } = useAuth();

  // Use the enhanced fungible token hook for cycles ledger - same as CanisterCostStep
  const CYCLES_LEDGER_CANISTER_ID = process.env.CYCLES_LEDGER_CANISTER_ID || 'um5iw-rqaaa-aaaaq-qaaba-cai';
  const cyclesToken = useFungibleToken(CYCLES_LEDGER_CANISTER_ID);
  const { useBalance, useApprove } = cyclesToken;
  
  // Get user's cycles balance
  const balanceQuery = useBalance(
    user?.principal ? { owner: user.principal, subaccount: [] } : undefined
  );
  
  // Get approve mutation
  const approveMutation = useApprove();
  
  // Helper functions to match the CanisterCostStep interface
  const cyclesBalance = balanceQuery.data;
  const isLoadingBalance = balanceQuery.isLoading;

  console.log('🔄 RemoteContractStep initialized with:', {
    selectedNFTs,
    targetChainId,
    remoteContractInfo,
    sourceCanisterId,
  });

  // Initialize orchestrator actors
  const orchestratorCanisterId = process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai';
  const unauthenticatedOrchActor = useAnonymousActor<OrchestratorService>(
    orchestratorCanisterId,
    orchestratorIdlFactory
  );
  const authenticatedOrchActor = useAuthenticatedActor<OrchestratorService>(
    orchestratorCanisterId,
    orchestratorIdlFactory
  );

  // Create Network object from chain ID - memoize to prevent infinite loops
  const targetNetwork: Network | null = useMemo(() => {
    if (!targetChainId) return null;
    try {
      return { Ethereum: [BigInt(targetChainId)] };
    } catch (error) {
      console.error('Failed to convert targetChainId to BigInt:', targetChainId, error);
      return null;
    }
  }, [targetChainId]);

  console.log('🔍 Contract check state:', {
    isCheckingContract, 
    existingContract, 
    contractCheckComplete,
    unauthenticatedOrchActor: !!unauthenticatedOrchActor,
    targetChainId,
    sourceCanisterId
  });

  // Check for existing contract when network or canister changes - following App.tsx pattern
  useEffect(() => {
    const checkForExistingContract = async () => {
      if (!targetChainId || !sourceCanisterId || !unauthenticatedOrchActor || !sourceContractPointer || !targetNetwork) {
        setExistingContract(null);
        setContractCheckComplete(false);
        return;
      }

      // Prevent multiple simultaneous checks
      if (isCheckingContract) {
        return;
      }

      setIsCheckingContract(true);
      setContractCheckComplete(false);

      try {
        console.log('🔍 Checking for existing ckNFT canister...', {
          sourceCanisterId,
          targetNetwork,
          sourceContractPointer
        });

        // Use the ICRC-99-derived source contract pointer for lookup
        // This checks if there's already a bridge from the native chain to the target network
        const canisterIdResult = await unauthenticatedOrchActor.get_ck_nft_canister([sourceContractPointer]);
        
        console.log('🔍 ckNFT canister lookup result:', canisterIdResult);

        if (Array.isArray(canisterIdResult) && canisterIdResult[0] && canisterIdResult[0][0]) {
          // Canister exists - now check if remote contract has been deployed
          const canisterId = canisterIdResult[0][0];
          
          console.log('✅ Found existing ckNFT canister:', canisterId.toString());
          console.log('🔍 Now checking for remote contract on target network...');
          
          // Check if a remote contract has been deployed for this canister on the target network
          const remoteContractResult = await unauthenticatedOrchActor.get_remote([[canisterId, targetNetwork]]);
          
          console.log('🔍 Remote contract lookup result:', remoteContractResult);
          
          if (remoteContractResult && remoteContractResult[0] && remoteContractResult[0][0] != null) {
            // Remote contract exists - we have a complete bridge setup
            const remoteContract = remoteContractResult[0][0];
            
            console.log('✅ Found existing remote contract:', remoteContract);
            
            // Check if remote contract actually has a valid address
            const hasValidAddress = remoteContract.address && remoteContract.address[0];
            
            const contract: ExistingContract = {
              address: hasValidAddress ? remoteContract.address![0]! : `ckNFT-${canisterId.toString().slice(0, 8)}...`,
              network: targetNetwork,
              name: `CK-${sourceCanisterId.slice(0, 5)}...`,
              symbol: 'CKNFT',
              totalSupply: 0, // Would be fetched from remote contract
              verified: true,
              deploymentTx: hasValidAddress ? remoteContract.address![0]! : canisterId.toString(),
            };
            
            setExistingContract(contract);
            
            // Remote contract is already deployed only if it has a valid address
            if (hasValidAddress) {
              onRemoteContractInfoChange({
                address: remoteContract.address![0]!,
                network: targetNetwork,
                deployed: true,
              });
            } else {
              // ckNFT canister exists but remote contract not fully deployed yet
              onRemoteContractInfoChange({
                network: targetNetwork,
                deployed: false,
              });
            }
          } else {
            // ckNFT canister exists but no remote contract yet - need to deploy remote
            console.log('📋 ckNFT canister exists but no remote contract found - will need to deploy remote contract');
            setExistingContract(null);
            
            onRemoteContractInfoChange({
              network: targetNetwork,
              deployed: false,
            });
          }
        } else {
          console.log('📋 No existing ckNFT canister found - will need to deploy new bridge');
          setExistingContract(null);
          
          onRemoteContractInfoChange({
            network: targetNetwork,
            deployed: false,
          });
        }
      } catch (err) {
        console.error('❌ Error checking for existing canister:', err);
        setExistingContract(null);
        
        // Call parent callback directly here - following App.tsx pattern
        onRemoteContractInfoChange({
          network: targetNetwork,
          deployed: false,
        });
      } finally {
        setIsCheckingContract(false);
        setContractCheckComplete(true);
      }
    };

    // Only run if we don't have contract info yet and we're not already checking
    if (!isCheckingContract && !contractCheckComplete) {
      console.log('🔄 Checking for existing contract on target network:', targetNetwork);
      checkForExistingContract();
    }

    // NOTE: Deliberately NOT including onRemoteContractInfoChange in dependencies to prevent loops
    // This follows the same pattern as App.tsx where callback functions are not dependencies
  }, [targetChainId, sourceCanisterId, unauthenticatedOrchActor, remoteContractInfo, isCheckingContract, contractCheckComplete, sourceContractPointer]);

  // Estimate costs for remote contract creation when no existing contract found
  useEffect(() => {
    // Only run once per component mount and only if we haven't estimated costs yet
    if (hasEstimatedCosts || existingContract) {
      return;
    }

    const estimateRemoteContractCosts = async () => {
      if (!unauthenticatedOrchActor || !sourceCanisterId || !targetChainId || isCheckingContract || !contractCheckComplete || !sourceContractPointer || !targetNetwork) {
        return;
      }

      try {
        console.log('💰 Estimating remote contract creation costs (one time only)...', {
          sourceCanisterId,
          targetChainId,
          sourceContractPointer,
        });

        // Set flag immediately to prevent re-runs
        setHasEstimatedCosts(true);

        // Use the ICRC-99-derived source contract pointer for cost estimation
        const cyclesResult = await unauthenticatedOrchActor.get_remote_cost(sourceContractPointer, targetNetwork);
        setCyclesNeededForRemote(cyclesResult);
        console.log('💰 Cycles needed for remote contract:', cyclesResult.toString());

        // Get remote funding address using get_icrc99_address
        const icrc99FundingAddress = await unauthenticatedOrchActor.get_icrc99_address(
          Principal.fromText(sourceCanisterId), 
          targetNetwork
        );

        if (icrc99FundingAddress && icrc99FundingAddress[0]) {
          setRemoteFundingAddress(icrc99FundingAddress[0]);
          console.log('💰 Remote funding address:', icrc99FundingAddress[0]);
        }

        // Estimate gas costs using MetaMask provider for more accurate estimates
        console.log('💰 Estimating gas using MetaMask provider...');
        
        try {
          const supportedNetworks = getSupportedNetworks();
          const targetNetwork = supportedNetworks[parseInt(targetChainId) as keyof typeof supportedNetworks];
          
          if (!targetNetwork) {
            throw new Error(`Unsupported network: ${targetChainId}`);
          }

          // Create provider for gas estimation
          const gasProvider = new ethers.JsonRpcProvider(targetNetwork.rpc);
          
          // Create contract instance for gas estimation
          const contractInterface = new ethers.Interface(ICRC99NFT.abi);
          const constructorArgs = contractInterface.encodeDeploy(['ICDevs.AI NFT', 'ICDEV']);
          const deploymentData = `${ICRC99NFT.bytecode}${constructorArgs.slice(2)}`;
          
          // Get current address for estimation (use first NFT's funding address as fallback)
          const fromAddress = remoteFundingAddress || ethers.ZeroAddress;
          
          // Estimate gas for contract deployment
          const estimatedGas = await gasProvider.estimateGas({
            data: deploymentData,
            from: fromAddress,
            value: 0
          });
          
          // Get current gas price from network
          const feeData = await gasProvider.getFeeData();
          const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || 20000000000n; // 20 gwei fallback
          
          setEstimatedRemoteGas(estimatedGas);
          
          // Add 20% buffer for safety
          const totalCost = estimatedGas * gasPrice * 120n / 100n;
          setEthNeededForRemote(totalCost);
          
          console.log('💰 MetaMask gas estimation complete:', {
            estimatedGas: estimatedGas.toString(),
            gasPrice: gasPrice.toString(),
            totalCost: totalCost.toString(),
            totalCostETH: `${Number(totalCost) / 1e18} ETH`,
            network: targetNetwork.name
          });
          
        } catch (estimationError) {
          console.warn('MetaMask gas estimation failed, using fallback:', estimationError);
          
          // Fallback to previous estimation method
          const contractSize = ICRC99NFT.bytecode.length / 2; // bytes
          const estimatedGas = BigInt(Math.max(800000, contractSize * 25)); // Base 800k gas + size-based estimate
          const fallbackGasPrice = 20000000000n; // 20 gwei
          
          setEstimatedRemoteGas(estimatedGas);
          
          const totalCost = estimatedGas * fallbackGasPrice * 120n / 100n; // 20% buffer
          setEthNeededForRemote(totalCost);
          
          console.log('💰 Fallback gas estimation complete:', {
            estimatedGas: estimatedGas.toString(),
            gasPrice: fallbackGasPrice.toString(),
            totalCost: totalCost.toString(),
            totalCostETH: `${Number(totalCost) / 1e18} ETH`,
          });
        }

      } catch (error) {
        console.error('Error estimating remote contract costs:', error);
        // Reset flag on error so user can retry
        setHasEstimatedCosts(false);
      }
    };

    estimateRemoteContractCosts();
  }, [unauthenticatedOrchActor, sourceCanisterId, targetChainId, existingContract, isCheckingContract, contractCheckComplete, sourceContractPointer, hasEstimatedCosts, targetNetwork]);

  // Separate effect to check funding balance when connected to correct network
  useEffect(() => {
    const checkFundingBalance = async () => {
      if (!remoteFundingAddress || remoteFundingBalance !== null || !chainId || chainId.toString() !== targetChainId || !window.ethereum) {
        return; // Already checked, not connected to right network, or no MetaMask
      }

      try {
        console.log('💰 Checking funding balance for address:', remoteFundingAddress);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const balance = await provider.getBalance(remoteFundingAddress);
        setRemoteFundingBalance(balance);
        console.log('💰 Current funding balance:', ethers.formatEther(balance), 'ETH');
      } catch (error) {
        console.error('Error checking funding balance:', error);
      }
    };

    checkFundingBalance();
  }, [remoteFundingAddress, chainId, targetChainId, remoteFundingBalance]);

  // Use allowance hook from the fungible token to check approval
  const allowanceQuery = cyclesToken.useAllowance(
    user?.principal 
      ? {
          account: { owner: user.principal, subaccount: [] },
          spender: { owner: Principal.fromText(orchestratorCanisterId), subaccount: [] }
        }
      : undefined
  );

  // Poll for newly created contract after remote creation
  const pollForNewContract = async (txHash: string, maxAttempts: number = 10, intervalMs: number = 5000) => {
    setIsPollingForContract(true);
    let attempts = 0;
    
    console.log('🔍 Starting to poll for new contract...', { txHash, maxAttempts, intervalMs });

    const pollInterval = setInterval(async () => {
      attempts++;
      console.log(`🔍 Polling attempt ${attempts}/${maxAttempts} for contract creation...`);

      try {
        // First, check if the transaction has been mined on the target network
        if (chainId && chainId.toString() === targetChainId && window.ethereum) {
          try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const receipt = await provider.getTransactionReceipt(txHash);
            
            if (receipt) {
              console.log('✅ Transaction mined on target network:', receipt);
              console.log('📋 Contract address from receipt:', receipt.contractAddress);
            } else {
              console.log('⏳ Transaction not yet mined on target network');
            }
          } catch (error) {
            console.warn('Could not check transaction status on target network:', error);
          }
        }

        // Check if the orchestrator now recognizes the new contract using get_remote
        if (unauthenticatedOrchActor && sourceCanisterId && targetChainId && targetNetwork) {
          try {
            // First get the ckNFT canister ID
            const contractPointer = {
              contract: sourceCanisterId,
              network: targetNetwork,
            };

            const canisterIdResult = await unauthenticatedOrchActor.get_ck_nft_canister([contractPointer]);
            
            if (Array.isArray(canisterIdResult) && canisterIdResult[0] && canisterIdResult[0][0]) {
              const canisterId = canisterIdResult[0][0];
              console.log('✅ Found ckNFT canister:', canisterId.toString());
              
              // Now check if the remote contract has been deployed using get_remote
              const remoteResult = await unauthenticatedOrchActor.get_remote([[canisterId, targetNetwork]]);
              
              if (Array.isArray(remoteResult) && remoteResult[0] && remoteResult[0][0]) {
                const remoteContract = remoteResult[0][0];
                
                // Extract the address from the remote contract state
                const remoteAddress = remoteContract.address && remoteContract.address.length > 0 ? remoteContract.address[0] : null;
                
                if (remoteAddress) {
                  console.log('🎉 Found newly deployed remote contract:', remoteAddress);
                  
                  // Create contract info with the actual remote contract address
                  const contract: ExistingContract = {
                    address: remoteAddress,
                    network: targetNetwork,
                    name: `CK-${sourceCanisterId.slice(0, 5)}...`,
                    symbol: 'CKNFT',
                    totalSupply: 0,
                    verified: true,
                    deploymentTx: txHash,
                  };
                  
                  setExistingContract(contract);
                  
                  // Update parent callback
                  onRemoteContractInfoChange({
                    address: remoteAddress,
                    network: targetNetwork,
                    deployed: true,
                  });

                  // Clear polling state
                  clearInterval(pollInterval);
                  setIsPollingForContract(false);
                  setCreatedContractTxHash(null);
                  return;
                } else {
                  console.log('⏳ Remote contract found but address not yet available');
                }
              } else {
                console.log('⏳ ckNFT canister exists but remote contract not yet deployed');
              }
            } else {
              console.log('⏳ ckNFT canister not yet created');
            }
          } catch (error) {
            console.warn('Error checking for remote contract:', error);
          }
        }

        if (attempts >= maxAttempts) {
          console.warn('⚠️ Max polling attempts reached, stopping poll');
          clearInterval(pollInterval);
          setIsPollingForContract(false);
          setCreatedContractTxHash(null);
        }
      } catch (error) {
        console.error('Error during contract polling:', error);
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setIsPollingForContract(false);
          setCreatedContractTxHash(null);
        }
      }
    }, intervalMs);

    // Cleanup function
    return () => {
      clearInterval(pollInterval);
      setIsPollingForContract(false);
    };
  };

  // Update cycles approval state when allowance data changes
  useEffect(() => {
    if (allowanceQuery.data?.allowance !== undefined) {
      setCyclesApproval(allowanceQuery.data.allowance);
      console.log('💰 Current cycles allowance:', allowanceQuery.data.allowance.toString());
    } else if (allowanceQuery.data === null || allowanceQuery.error) {
      // No allowance set or error occurred
      setCyclesApproval(BigInt(0));
    }
  }, [allowanceQuery.data, allowanceQuery.error]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      // This will cleanup any running polling when component unmounts
      setIsPollingForContract(false);
      setCreatedContractTxHash(null);
    };
  }, []);

  // Create remote contract
  const createRemote = async () => {
    if (!user?.principal || !authenticatedOrchActor || !targetChainId || !sourceCanisterId || !sourceContractPointer || !targetNetwork) {
      console.error('Missing required information for remote creation');
      return;
    }

    try {
      setIsCreatingRemote(true);
      console.log('🚀 Creating remote contract...');

      // Use the ICRC-99-derived source contract pointer passed from the wizard
      console.log('📋 Using source contract pointer from ICRC-99 check:', sourceContractPointer);
      console.log('📋 Target network for remote creation:', targetNetwork);

      // Enhanced gas calculation following your pattern
      let remoteFeeData: { maxFeePerGas?: bigint; l1DataFee?: bigint } = {};
      let ethFeeData: { gasPrice?: bigint } = {};
      let estimatedRemoteGas = 2000000n; // Default 2M gas
      let estimatedRemoteSize = 1000n; // Estimate contract size in bytes

      if (chainId && chainId.toString() === targetChainId && window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const feeData = await provider.getFeeData();
          
          // Get enhanced fee data for gas calculation
          remoteFeeData = {
            maxFeePerGas: feeData.maxFeePerGas || feeData.gasPrice || 50000000000n,
            l1DataFee: 16n, // Default L1 data fee for L2 chains
          };
          
          ethFeeData = {
            gasPrice: feeData.gasPrice || 20000000000n,
          };
          
          // Try to estimate gas for contract deployment (simplified)
          try {
            // This would ideally estimate the actual deployment transaction
            estimatedRemoteGas = 1800000n; // Conservative estimate for NFT contract deployment
          } catch (gasEstimateError) {
            console.warn('Could not estimate deployment gas, using default:', gasEstimateError);
          }
          
          console.log('� Enhanced gas data:', {
            maxFeePerGas: remoteFeeData.maxFeePerGas?.toString(),
            gasPrice: ethFeeData.gasPrice?.toString(),
            estimatedGas: estimatedRemoteGas.toString(),
            estimatedSize: estimatedRemoteSize.toString(),
          });
        } catch (error) {
          console.warn('Could not get enhanced gas data, using fallback:', error);
        }
      }

      // Calculate optimized gas parameters following your formula
      let feePerGas: bigint;
      let gasLimit: bigint;
      let maxPriorityFeePerGas: bigint;

      if (remoteFeeData.maxFeePerGas && ethFeeData.gasPrice) {
        // Your enhanced calculation: feePerGas = maxFeePerGas + 2M + L1DataComponent
        const l1DataComponent = remoteFeeData.l1DataFee && remoteFeeData.l1DataFee > 0n
          ? (ethFeeData.gasPrice * 16n * (estimatedRemoteSize + 300n)) / ((estimatedRemoteGas * 120n) / 100n)
          : 0n;
        
        feePerGas = remoteFeeData.maxFeePerGas + 2000000n + l1DataComponent;
        gasLimit = estimatedRemoteGas;
        maxPriorityFeePerGas = 2000000n; // 2M as per your example
        
        console.log('✨ Using enhanced gas calculation:', {
          baseMaxFeePerGas: remoteFeeData.maxFeePerGas.toString(),
          l1DataComponent: l1DataComponent.toString(),
          finalFeePerGas: feePerGas.toString(),
          gasLimit: gasLimit.toString(),
        });
      } else {
        // Fallback to simpler calculation
        feePerGas = 50000000000n; // 50 gwei
        gasLimit = 2000000n; // 2M gas
        maxPriorityFeePerGas = 2000000000n; // 2 gwei
        
        console.log('⚠️ Using fallback gas calculation');
      }

      // Call the actual orchestrator to create the remote contract using enhanced parameters
      const result = await authenticatedOrchActor.create_remote(
        sourceContractPointer,
        targetNetwork,
        feePerGas, // Enhanced calculated fee per gas
        gasLimit,  // Estimated or default gas limit
        maxPriorityFeePerGas, // Priority fee
        user?.principal ? [{ owner: user.principal, subaccount: [] }] : [] // Pass the user's account that approved cycles
      );
      
      console.log('✅ Remote contract creation initiated:', result);
      
      // The result should contain transaction hash or deployment information
      // Let's extract the transaction hash if available
      let txHash: string | null = null;
      
      // Check if result contains transaction hash (format may vary)
      if (typeof result === 'object' && result !== null) {
        // Handle different possible result formats
        if ('Ok' in result && typeof result.Ok === 'string') {
          txHash = result.Ok;
        } else if ('transactionHash' in result) {
          txHash = (result as any).transactionHash;
        } else if (typeof result === 'string') {
          txHash = result;
        }
      } else if (typeof result === 'string') {
        txHash = result;
      }
      
      if (txHash) {
        console.log('📋 Got transaction hash:', txHash);
        setCreatedContractTxHash(txHash);
        
        // Start polling for the new contract
        pollForNewContract(txHash);
        
        // Update remote contract info to show deployment in progress
        // Don't set address yet - wait for polling to find the actual contract address
        onRemoteContractInfoChange({
          network: targetNetwork,
          deployed: false, // Mark as not yet fully deployed
        });
      } else {
        console.warn('⚠️ No transaction hash received from create_remote, result:', result);
        
        // Fallback: Don't set an address from an unknown result object
        // The contract should be picked up by polling or manual refresh
        onRemoteContractInfoChange({
          network: targetNetwork,
          deployed: false, // Mark as not deployed since we don't have proper address
        });
      }
      
    } catch (error) {
      console.error('❌ Error creating remote contract:', error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to create remote contract: ${errorMessage}`);
      
      throw error; // Re-throw to show error to user
    } finally {
      setIsCreatingRemote(false);
    }
  };

  // Approve cycles for remote contract creation - using real ICRC2 approval like CanisterCostStep
  const approveCycles = async () => {
    if (!cyclesNeededForRemote || !orchestratorCanisterId) {
      throw new Error('Cannot approve cycles - missing requirements');
    }

    try {
      setIsApprovingCycles(true);
      console.log('💰 Approving cycles for remote creation...', {
        amount: cyclesNeededForRemote.toString(),
        spender: orchestratorCanisterId,
      });

      // Use the real ICRC2 approval from the cycles ledger - same as CanisterCostStep
      const orchestratorPrincipal = Principal.fromText(orchestratorCanisterId);
      const approvalAmount = (cyclesNeededForRemote * BigInt(110)) / BigInt(100); // 110% buffer like CanisterCostStep
      const expiresAt = BigInt(Date.now() * 1000000) + BigInt(24 * 60 * 60 * 1000000000); // 1 day
      
      const result = await approveMutation.mutateAsync({
        fee: [],
        memo: [],
        from_subaccount: [],
        created_at_time: [],
        amount: approvalAmount,
        expected_allowance: [],
        expires_at: [expiresAt],
        spender: {
          owner: orchestratorPrincipal,
          subaccount: []
        }
      });

      // The mutation should automatically invalidate and refetch the allowance query
      // But we can also manually trigger a refetch to be sure
      allowanceQuery.refetch();
      
      console.log('✅ Cycles approval successful');
      return result;
      
    } catch (error) {
      console.error('Error approving cycles:', error);
      throw error;
    } finally {
      setIsApprovingCycles(false);
    }
  };

  // Fund remote contract
  const fundRemoteContract = async () => {
    if (!remoteFundingAddress || !ethNeededForRemote || !window.ethereum) {
      console.error('Missing required information for funding');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Add 20% buffer to the required amount
      const fundingAmount = (ethNeededForRemote * 120n) / 100n;
      
      console.log('💰 Funding remote contract:', {
        to: remoteFundingAddress,
        value: ethers.formatEther(fundingAmount),
      });

      const tx = await signer.sendTransaction({
        to: remoteFundingAddress,
        value: fundingAmount,
      });

      console.log('💰 Funding transaction sent:', tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('💰 Funding transaction confirmed:', receipt);
      
      // Update balance
      const newBalance = await provider.getBalance(remoteFundingAddress);
      setRemoteFundingBalance(newBalance);
      
    } catch (error) {
      console.error('Error funding remote contract:', error);
    }
  };

  const canProceed = targetChainId && remoteContractInfo && contractCheckComplete && !isCheckingContract;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Remote Contract Configuration</h3>
        <p className="text-gray-600">
          Checking for existing contracts and configuring the target EVM deployment.
        </p>
      </div>

      {/* Selected NFTs Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">Export Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-600">NFTs to Export:</span>
            <span className="ml-2 font-medium text-blue-800">
              {selectedNFTs.length} NFT{selectedNFTs.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div>
            <span className="text-blue-600">Source Canister:</span>
            <span className="ml-2 font-medium text-blue-800 font-mono text-xs">
              {sourceCanisterId}
            </span>
          </div>
        </div>
        
        {selectedNFTs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedNFTs.slice(0, 3).map((nft) => (
              <span
                key={`${nft.canisterId}-${nft.tokenId}`}
                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md"
              >
                {nft.name || `Token ${nft.tokenId}`}
              </span>
            ))}
            {selectedNFTs.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md">
                +{selectedNFTs.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Target Network Display */}
      {targetChainId && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-2">Target Network</h4>
          <div className="flex items-center">
            <span className="text-2xl mr-3">🔗</span>
            <div>
              <h5 className="font-medium text-gray-900">
                Network: Chain {targetChainId}
              </h5>
              <p className="text-sm text-gray-600">
                Chain ID: {targetChainId}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contract Status Check */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Contract Status</h4>
        
        {isCheckingContract && (
          <div className="flex items-center py-4">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin mr-3" />
            <div>
              <p className="font-medium text-gray-900">Checking for existing contracts...</p>
              <p className="text-sm text-gray-600">
                Searching for contracts linked to canister {sourceCanisterId}
              </p>
            </div>
          </div>
        )}

        {/* Existing Contract Found */}
        {!isCheckingContract && existingContract && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
              <div className="flex-1">
                <h5 className="font-medium text-green-800 mb-1">Existing Contract Found</h5>
                <p className="text-sm text-green-700 mb-3">
                  A contract already exists for this canister on the target network. 
                  Your NFTs will be exported to this existing contract.
                </p>
                
                <div className="bg-white border border-green-200 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <h6 className="font-medium text-gray-900">{existingContract.name}</h6>
                        <span className="ml-2 text-sm text-gray-500">({existingContract.symbol})</span>
                        {existingContract.verified && (
                          <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 font-mono mb-2">{existingContract.address}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Total Supply: {existingContract.totalSupply}</span>
                        <a
                          href={`#`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 inline-flex items-center"
                        >
                          View on Explorer <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Existing Contract - Will Deploy New */}
        {!isCheckingContract && !existingContract && contractCheckComplete && (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start">
                <Plus className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h5 className="font-medium text-amber-800 mb-1">New Contract Required</h5>
                  <p className="text-sm text-amber-700 mb-3">
                    No existing contract found for this canister on the target network. 
                    A new ERC-721 contract will be deployed during the export process.
                  </p>
                  
                  <div className="bg-white border border-amber-200 rounded-lg p-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-amber-600">Chain ID:</span>
                        <span className="ml-2 font-medium text-amber-800">
                          {targetChainId}
                        </span>
                      </div>
                      <div>
                        <span className="text-amber-600">Standard:</span>
                        <span className="ml-2 font-medium text-amber-800">ERC-721</span>
                      </div>
                      <div>
                        <span className="text-amber-600">NFTs:</span>
                        <span className="ml-2 font-medium text-amber-800">
                          {selectedNFTs.length} token{selectedNFTs.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-amber-600">Gas Fee:</span>
                        <span className="ml-2 font-medium text-amber-800">
                          {ethNeededForRemote ? `~${ethers.formatEther(ethNeededForRemote)} ETH` : '~0.02 ETH'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Remote Contract Creation Costs - Always show, even if estimation failed */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="font-medium text-blue-800 mb-3">Remote Contract Creation Costs</h5>
              
              <div className="space-y-3">
                {/* Cycles Cost */}
                <div className="flex items-center justify-between p-3 bg-white border border-blue-200 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-900">Cycles Required</span>
                    <p className="text-sm text-gray-600">For orchestrator contract deployment</p>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-blue-800">
                      {cyclesNeededForRemote 
                        ? `${(Number(cyclesNeededForRemote) / 1e12).toFixed(3)} T`
                        : 'Estimating...'
                      }
                    </span>
                    <p className="text-xs text-gray-500">cycles</p>
                  </div>
                </div>

                {/* ETH Cost */}
                <div className="flex items-center justify-between p-3 bg-white border border-blue-200 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-900">ETH Required</span>
                    <p className="text-sm text-gray-600">For EVM contract deployment gas</p>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-blue-800">
                      {ethNeededForRemote 
                        ? `${ethers.formatEther(ethNeededForRemote)} ETH`
                        : 'Estimating...'
                      }
                    </span>
                    <p className="text-xs text-gray-500">
                      {estimatedRemoteGas ? `~${estimatedRemoteGas.toString()} gas` : '~800k gas'}
                    </p>
                  </div>
                </div>

                {/* Funding Address */}
                {remoteFundingAddress ? (
                  <div className="p-3 bg-white border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">Funding Address</span>
                      {remoteFundingBalance !== null && (
                        <span className={`text-sm font-medium ${
                          remoteFundingBalance >= (ethNeededForRemote || 0n) 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {ethers.formatEther(remoteFundingBalance)} ETH
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 font-mono break-all">
                      {remoteFundingAddress}
                    </p>
                    {remoteFundingBalance !== null && ethNeededForRemote && remoteFundingBalance < ethNeededForRemote && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                        <div className="flex items-center">
                          <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                          <span className="text-sm text-red-700 font-medium">
                            Insufficient ETH balance
                          </span>
                        </div>
                        <p className="text-xs text-red-600 mt-1">
                          Need {ethers.formatEther(ethNeededForRemote - remoteFundingBalance)} more ETH
                        </p>
                      </div>
                    )}
                    
                    {remoteFundingBalance !== null && ethNeededForRemote && remoteFundingBalance >= ethNeededForRemote && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-sm text-green-700 font-medium">
                            Sufficient ETH balance
                          </span>
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                          Ready for contract deployment
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-white border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">Funding Address</span>
                      <span className="text-sm text-gray-500">Loading...</span>
                    </div>
                    <p className="text-xs text-gray-600">Retrieving funding address...</p>
                  </div>
                )}

                {/* Fund Button - only show if insufficient balance */}
                {remoteFundingAddress && ethNeededForRemote && activeAddress && isUnlocked && 
                 remoteFundingBalance !== null && remoteFundingBalance < ethNeededForRemote && (
                  <button
                    onClick={fundRemoteContract}
                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Fund Remote Contract
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cycles Approval Section - only show if no existing contract found */}
      {contractCheckComplete && !existingContract && cyclesNeededForRemote && (
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-3">Cycles Approval</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Required:</span>
              <span className="text-sm font-mono">
                {formatCyclesDisplay(cyclesNeededForRemote)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Approved:</span>
              <span className="text-sm font-mono">
                {cyclesApproval !== null ? formatCyclesDisplay(cyclesApproval) : '...'} 
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Your Balance:</span>
              <span className="text-sm font-mono">
                {isLoadingBalance ? (
                  'Loading...'
                ) : cyclesBalance !== undefined ? (
                  formatCyclesDisplay(cyclesBalance)
                ) : (
                  'Unable to load'
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span className={`text-sm font-medium ${
                cyclesApproval !== null && cyclesApproval >= cyclesNeededForRemote
                  ? 'text-green-500'
                  : 'text-orange-500'
              }`}>
                {cyclesApproval !== null 
                  ? (cyclesApproval >= cyclesNeededForRemote ? 'Sufficient' : 'Insufficient')
                  : 'Checking...'
                }
              </span>
            </div>

            {/* Action Buttons */}
            {isPollingForContract ? (
              <div className="w-full mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-700 font-medium">
                    Waiting for contract deployment...
                  </span>
                </div>
                <p className="text-xs text-blue-600 text-center mt-1">
                  Checking target network for new contract
                </p>
                {createdContractTxHash && (
                  <p className="text-xs text-blue-500 text-center mt-1 font-mono">
                    TX: {createdContractTxHash.slice(0, 10)}...{createdContractTxHash.slice(-8)}
                  </p>
                )}
              </div>
            ) : cyclesApproval !== null && cyclesApproval >= cyclesNeededForRemote ? (
              <button
                onClick={createRemote}
                disabled={isCreatingRemote}
                className="w-full mt-4 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isCreatingRemote ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Remote Contract...
                  </>
                ) : (
                  'Create Remote Contract'
                )}
              </button>
            ) : (
              <button
                onClick={approveCycles}
                disabled={isApprovingCycles || !user?.principal}
                className="w-full mt-4 flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {isApprovingCycles ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving Cycles...
                  </>
                ) : (
                  'Approve Cycles'
                )}
              </button>
            )}

            {/* Insufficient approval message */}
            {cyclesApproval !== null && cyclesApproval < cyclesNeededForRemote && (
              <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <p className="text-sm text-orange-600 mb-2">
                  Insufficient cycles approval. Click "Approve Cycles" above to approve{' '}
                  {formatCycles(cyclesNeededForRemote)} TCycles for the orchestrator canister.
                </p>
                {!user?.principal && (
                  <p className="text-xs text-orange-500 mb-2">
                    🔐 Please connect your wallet to approve cycles.
                  </p>
                )}
                <div className="text-xs text-orange-500">
                  <p className="mb-1">💡 About cycles approval:</p>
                  <p>• Allows the orchestrator to spend cycles on your behalf</p>
                  <p>• Only the approved amount can be spent</p>
                  <p>• Required for remote contract deployment</p>
                </div>
              </div>
            )}

            {/* Success message when cycles are approved */}
            {cyclesApproval !== null && cyclesApproval >= cyclesNeededForRemote && (
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-sm text-green-600 font-medium">
                    Cycles approved successfully!
                  </span>
                </div>
                <p className="text-xs text-green-500 mt-1">
                  Ready to create the remote contract.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Summary */}
      {canProceed && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="font-medium text-green-800">Configuration Complete</span>
          </div>
          <div className="mt-2 text-sm text-green-700">
            <p>✓ Target ChainId: {targetChainId}</p>
            <p>✓ Contract: {existingContract ? 'Use existing contract' : 'Deploy new contract'}</p>
            <p>✓ Ready to calculate export costs</p>
          </div>
        </div>
      )}
    </div>
  );
}

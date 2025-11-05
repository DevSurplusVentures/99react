import { useState, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import { AlertCircle, CheckCircle, Loader2, CreditCard, Zap, ArrowRight, Wallet, Clock } from 'lucide-react';
import { Principal } from '@dfinity/principal';
import type { SelectedICNFT, RemoteContractInfo } from './EVMExportWizard';
import type { Network, ContractPointer } from '../../declarations/orchestrator/orchestrator.did';
import { use99Mutations, useOrchestratorAllowance } from '../../hooks/use99Mutations';
import { useFungibleToken } from '../../hooks/useFungibleToken';
import { useAuth } from '../../hooks/useAuth';

export interface ExportCostsStepProps {
  /** Selected NFTs to export */
  selectedNFTs: SelectedICNFT[];
  /** Target network for export */
  targetNetwork: Network | null;
  /** Remote contract information */
  remoteContractInfo: RemoteContractInfo | null;
  /** Source contract pointer (native chain from ICRC-99) */
  sourceContractPointer: ContractPointer | null;
  /** Callback when costs are calculated */
  onCostsCalculated: (costs: bigint) => void;
}

interface CostBreakdown {
  remoteContractDeployment?: bigint;
  castOperations: bigint;
  evmGasFees: bigint;
  evmGasFeesETH: string; // Add ETH amount for display
  total: bigint;
}

interface GasPriceInfo {
  network: string;
  gasPrice: string;
  usdPrice: string;
  estimatedConfirmationTime: string;
}

export function ExportCostsStep({
  selectedNFTs,
  targetNetwork,
  remoteContractInfo,
  sourceContractPointer,
  onCostsCalculated,
}: ExportCostsStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);
  const [gasPriceInfo, setGasPriceInfo] = useState<GasPriceInfo | null>(null);
  const [paymentApproved, setPaymentApproved] = useState(false);
  const [approvalInProgress, setApprovalInProgress] = useState(false);
  const [cyclesBalance, setCyclesBalance] = useState<bigint | null>(null);
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [estimatedGasETH, setEstimatedGasETH] = useState<string | null>(null);
  const [fundingAddress, setFundingAddress] = useState<string | null>(null);
  const [allowanceStatus, setAllowanceStatus] = useState<{
    amount: bigint;
    isExpired: boolean;
    isSufficient: boolean;
  } | null>(null);

  // Use the 99 mutations hook for orchestrator queries
  const mutations = use99Mutations(process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai');
  
  // Get user authentication state
  const { user } = useAuth();
  
  // Cycles ledger integration for balance and allowance tracking
  const CYCLES_LEDGER_CANISTER_ID = process.env.CYCLES_LEDGER_CANISTER_ID || 'um5iw-rqaaa-aaaaq-qaaba-cai';
  const cyclesToken = useFungibleToken(CYCLES_LEDGER_CANISTER_ID);
  
  // Get user's cycles balance
  const userAccount = user?.principal ? {
    owner: typeof user.principal === 'string' ? Principal.fromText(user.principal) : user.principal,
    subaccount: [] as []
  } : undefined;
  
  const balanceQuery = cyclesToken.useBalance(userAccount);
  
  // Get current allowance for the orchestrator
  const allowanceQuery = useOrchestratorAllowance(costBreakdown?.total);
  
  // Track cycles balance and allowance status
  useEffect(() => {
    if (balanceQuery.data !== undefined) {
      setCyclesBalance(balanceQuery.data);
    }
  }, [balanceQuery.data]);
  
  useEffect(() => {
    console.log('🔍 useEffect [allowanceQuery.data, costBreakdown?.total] triggered:', {
      hasAllowanceData: !!allowanceQuery.data,
      allowanceDataRef: allowanceQuery.data,
      allowanceAmount: allowanceQuery.data?.allowance?.toString(),
      isExpired: allowanceQuery.data?.isExpired,
      costBreakdownTotal: costBreakdown?.total?.toString(),
      allowanceQueryDataKeys: allowanceQuery.data ? Object.keys(allowanceQuery.data) : 'no data',
    });
    
    if (allowanceQuery.data && costBreakdown?.total) {
      const newAllowanceStatus = {
        amount: allowanceQuery.data.allowance,
        isExpired: allowanceQuery.data.isExpired,
        isSufficient: allowanceQuery.data.allowance >= costBreakdown.total,
      };
      
      console.log('🔍 Setting new allowance status:', newAllowanceStatus);
      setAllowanceStatus(newAllowanceStatus);
      
      // Auto-update payment approval status based on allowance
      const hasValidAllowance = allowanceQuery.data.allowance >= costBreakdown.total && !allowanceQuery.data.isExpired;
      console.log('🔍 Setting payment approved:', hasValidAllowance);
      setPaymentApproved(hasValidAllowance);
    }
  }, [allowanceQuery.data, costBreakdown?.total]);

  const networkName = useMemo(() => {
    if (!targetNetwork || !('Ethereum' in targetNetwork)) return 'Unknown';
    const chainId = Number(targetNetwork.Ethereum[0]);
    const networkMap: Record<number, string> = {
      1: 'Ethereum',
      137: 'Polygon',
      56: 'BNB Smart Chain',
      42161: 'Arbitrum',
      10: 'Optimism',
      8453: 'Base',
    };
    return networkMap[chainId] || `Chain ${chainId}`;
  }, [targetNetwork]);

  // Create contract pointer for remote contract operations
  const remoteContractPointer: ContractPointer | null = useMemo(() => {
    if (!remoteContractInfo?.address) return null;
    
    return {
      network: targetNetwork!,
      contract: remoteContractInfo.address,
    };
  }, [remoteContractInfo, targetNetwork]);

  // Calculate export costs using real orchestrator functions
  useEffect(() => {
    const calculateCosts = async () => {
      if (!selectedNFTs.length || !targetNetwork || !remoteContractInfo || !sourceContractPointer) {
        setCostBreakdown(null);
        onCostsCalculated(0n);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log('🔍 Calculating export costs for:', {
          nftCount: selectedNFTs.length,
          network: networkName,
          remoteContract: remoteContractInfo,
          sourceContract: sourceContractPointer,
          hasSourceContractPointer: !!sourceContractPointer,
          sourceContractAddress: sourceContractPointer?.contract,
        });

        let remoteContractDeployment: bigint | undefined;
        let castOperations: bigint = 0n;

        // 1. Calculate remote contract deployment cost (if needed)
        if (!remoteContractInfo.deployed && remoteContractPointer) {
          console.log('📊 Getting remote contract deployment cost...');
          try {
            const deploymentCost = await mutations.getRemoteCost.mutateAsync({
              pointer: sourceContractPointer, // Use source contract as the basis
              network: targetNetwork,
            });
            remoteContractDeployment = BigInt(deploymentCost);
            console.log('💰 Remote contract deployment cost:', remoteContractDeployment.toString());
          } catch (deploymentError) {
            console.error('Failed to get deployment cost:', deploymentError);
            // Use estimated cost if orchestrator call fails
            remoteContractDeployment = 5_000_000_000n; // 5B cycles
          }
        }

        // 2. Calculate real cast operation costs using icrc99_cast_cost
        try {
          console.log('📊 Getting real cast costs from ckNFT canisters...');
          
          // Get the ckNFT canister for the source contract
          const ckNFTCanisters = await mutations.getCkNFTCanister.mutateAsync([sourceContractPointer]);
          const ckNFTCanisterId = ckNFTCanisters[0];
          
          if (ckNFTCanisterId && remoteContractInfo?.address) {
            console.log(`🔍 Using ckNFT canister ${ckNFTCanisterId.toString()} for cast cost calculations`);
            
            // Calculate real cast cost for each selected NFT
            for (const nft of selectedNFTs) {
              try {
                const castCost = await mutations.getCastCost.mutateAsync({
                  ckNFTCanisterId: ckNFTCanisterId,
                  contract: remoteContractInfo.address,
                  network: targetNetwork,
                  tokenId: BigInt(nft.tokenId),
                });
                
                castOperations += castCost;
                console.log(`💰 Real cast cost for NFT ${nft.tokenId}: ${castCost.toString()}`);
              } catch (nftError) {
                console.error(`Error getting cast cost for NFT ${nft.tokenId}:`, nftError);
                // Fallback estimation for this NFT
                castOperations += 1_000_000_000n; // 1B cycles per NFT
              }
            }
            
            console.log('💰 Total real cast operations cost:', castOperations.toString());
          } else {
            console.warn(`No ckNFT canister found for source contract, using fallback estimation`);
            // Fallback to estimation if no ckNFT canister
            const fallbackCostPerNFT = 1_000_000_000n; // 1B cycles per NFT
            castOperations = BigInt(selectedNFTs.length) * fallbackCostPerNFT;
          }
          
        } catch (castError) {
          console.error('Failed to get real cast costs, using estimation:', castError);
          // Fallback: Use estimated costs based on network
          const baseCostPerCast = 1_000_000_000n; // 1B cycles per cast operation
          const networkMultipliers: Record<string, number> = {
            'Ethereum': 50,     // High gas costs
            'Polygon': 1,       // Low gas costs
            'BNB Smart Chain': 5,
            'Arbitrum': 0.5,    // L2 - lower costs
            'Optimism': 0.5,    // L2 - lower costs
            'Base': 0.5,        // L2 - lower costs
          };
          
          const networkMultiplier = BigInt(Math.floor((networkMultipliers[networkName] || 10) * 100));
          castOperations = BigInt(selectedNFTs.length) * baseCostPerCast * networkMultiplier / 100n;
        }

        // 3. Calculate real EVM gas fees in ETH and get funding address
        let evmGasFees: bigint = 0n;
        let evmGasFeesETH: string = '0.000';
        let icrc99FundingAddress: string | null = null;
        
        try {
          // Get funding address from the ckNFT canister that will handle this export
          console.log('🔍 Getting ckNFT canister for funding address...', {
            sourceContract: sourceContractPointer.contract,
            sourceContractNetwork: sourceContractPointer.network,
            targetNetwork: targetNetwork,
            mutations: !!mutations,
            userAuthenticated: !!user?.principal,
          });
          
          // First, get the ckNFT canister that represents this source contract
          const ckNFTCanisters = await mutations.getCkNFTCanister.mutateAsync([sourceContractPointer]);
          const ckNFTCanisterId = ckNFTCanisters[0];
          
          if (ckNFTCanisterId) {
            console.log('✅ Found ckNFT canister for funding address:', ckNFTCanisterId.toString());
            
            // Now get the funding address from this ckNFT canister
            icrc99FundingAddress = await mutations.getICRC99Address.mutateAsync({
              canister: ckNFTCanisterId,
              network: targetNetwork,
            });
            
            if (icrc99FundingAddress) {
              setFundingAddress(icrc99FundingAddress);
              console.log('💰 Got funding address from ckNFT canister:', icrc99FundingAddress);
            } else {
              console.warn('💰 No funding address returned from ckNFT canister');
              setFundingAddress(null);
            }
          } else {
            console.warn('⚠️ No ckNFT canister found for source contract, cannot get funding address');
            setFundingAddress(null);
          }
          
        } catch (fundingAddressError) {
          console.error('❌ Failed to get funding address from orchestrator:', fundingAddressError);
          console.error('💰 Error details:', {
            message: fundingAddressError instanceof Error ? fundingAddressError.message : String(fundingAddressError),
            sourceContractPointer,
            targetNetwork,
            userAuthenticated: !!user?.principal,
            mutationsAvailable: !!mutations?.getICRC99Address,
          });
          setFundingAddress(null);
          
          // Continue with gas estimation even if funding address fails
        }
        
        try {
          
          // Get real gas prices and estimate costs
          const chainId = ('Ethereum' in targetNetwork) ? Number(targetNetwork.Ethereum[0]) : null;
          
          if (chainId && window.ethereum) {
            const provider = new (await import('ethers')).ethers.BrowserProvider(window.ethereum);
            const feeData = await provider.getFeeData();
            
            // Import the ICRC99 NFT contract artifact for real gas estimation
            const contractArtifact = await import('../../contracts/ICRC99NFT.json');
            const contractAbi = contractArtifact.abi;
            const contractBytecode = contractArtifact.bytecode;
            
            let totalGasUnits = 0n;
            
            if (remoteContractInfo?.deployed && remoteContractInfo.address && icrc99FundingAddress) {
              // Contract already deployed - estimate gas for mint_icrc99 calls
              console.log('💰 Estimating gas for mint_icrc99 calls to existing contract:', remoteContractInfo.address);
              
              try {
                // Estimate gas for each NFT mint operation
                for (let i = 0; i < selectedNFTs.length; i++) {
                  const nft = selectedNFTs[i];
                  
                  // Create a sample metadata JSON for gas estimation
                  const sampleMetadata = JSON.stringify({
                    name: nft.name || `NFT ${nft.tokenId}`,
                    description: nft.description || "Bridged NFT from Internet Computer",
                    image: nft.image || "",
                    tokenId: nft.tokenId,
                  });
                  
                  // Estimate gas for mint_icrc99 function call
                  const { ethers } = await import('ethers');
                  const placeholderAddress = ethers.getAddress('0x742d35Cc6635C0532925a3b8D11e432f1b7C4b7b'); // Properly checksum the address
                  const estimatedGas = await provider.estimateGas({
                    to: remoteContractInfo.address,
                    data: new ethers.Interface(contractAbi).encodeFunctionData(
                      'mint_icrc99',
                      [BigInt(nft.tokenId), placeholderAddress, sampleMetadata]
                    ),
                    from: icrc99FundingAddress,
                  });
                  
                  totalGasUnits += estimatedGas;
                  console.log(`💰 Estimated gas for NFT ${nft.tokenId}: ${estimatedGas.toString()}`);
                }
                
                console.log(`💰 Total estimated gas for ${selectedNFTs.length} mint operations: ${totalGasUnits.toString()}`);
                
              } catch (mintGasError) {
                console.warn('Failed to estimate mint gas, using fallback:', mintGasError);
                // Fallback: Use more conservative estimate based on typical ERC721 mint costs
                const fallbackGasPerMint = 150_000n; // More realistic estimate for mint operations
                totalGasUnits = BigInt(selectedNFTs.length) * fallbackGasPerMint;
              }
              
            } else if (!remoteContractInfo?.deployed) {
              // Contract needs to be deployed - estimate deployment + mint gas
              console.log('💰 Estimating gas for contract deployment + mints');
              
              try {
                // Estimate deployment gas
                const deploymentBytecode = contractBytecode + 
                  "0000000000000000000000000000000000000000000000000000000000000040" +
                  "0000000000000000000000000000000000000000000000000000000000000080" +
                  "00000000000000000000000000000000000000000000000000000000000000054d794e465400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000054d794e4654000000000000000000000000000000000000000000000000000000";
                
                const deploymentGas = await provider.estimateGas({
                  data: deploymentBytecode,
                  from: icrc99FundingAddress || '0x742d35Cc6635C0532925a3b8D11e432f1b7C4b7b',
                });
                
                console.log('💰 Estimated deployment gas:', deploymentGas.toString());
                
                // Add gas for each mint operation (use real estimation when possible)
                let totalMintGas = 0n;
                try {
                  // Try to estimate mint gas more accurately
                  const sampleMetadata = JSON.stringify({
                    name: "Sample NFT",
                    description: "Sample bridged NFT",
                    image: "",
                    tokenId: 1,
                  });
                  
                  // Estimate gas for a single mint to get better baseline
                  const mintGasEstimate = await provider.estimateGas({
                    data: contractBytecode + 
                      new (await import('ethers')).ethers.Interface(contractAbi).encodeFunctionData(
                        'mint_icrc99',
                        [1n, '0x742d35Cc6635C0532925a3b8D11e432f1b7C4b7b', sampleMetadata]
                      ).slice(2), // Remove 0x prefix since we're appending
                    from: icrc99FundingAddress || '0x742d35Cc6635C0532925a3b8D11e432f1b7C4b7b',
                  });
                  
                  totalMintGas = BigInt(selectedNFTs.length) * mintGasEstimate;
                  console.log('💰 Estimated mint gas per NFT:', mintGasEstimate.toString());
                  
                } catch (mintEstimateError) {
                  console.warn('Failed to estimate individual mint gas:', mintEstimateError);
                  // Fallback to conservative estimate
                  const mintGasPerNFT = 120_000n; // More realistic estimate for mint calls
                  totalMintGas = BigInt(selectedNFTs.length) * mintGasPerNFT;
                }
                
                totalGasUnits = deploymentGas + totalMintGas;
                console.log('💰 Total gas (deployment + mints):', totalGasUnits.toString());
                
              } catch (deployGasError) {
                console.warn('Failed to estimate deployment gas, using fallback:', deployGasError);
                // Fallback: More realistic estimates based on typical contract sizes
                const fallbackDeploymentGas = 1_500_000n; // 1.5M gas for deployment (more realistic)
                const fallbackMintGas = 120_000n; // 120k gas per mint (more realistic)
                totalGasUnits = fallbackDeploymentGas + (BigInt(selectedNFTs.length) * fallbackMintGas);
              }
              
            } else {
              // No funding address available - use conservative estimates
              console.warn('💰 No funding address available, using conservative gas estimates');
              const fallbackGasPerNFT = 150_000n; // More realistic estimate
              totalGasUnits = BigInt(selectedNFTs.length) * fallbackGasPerNFT;
            }
            
            const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || 20_000_000_000n; // 20 gwei fallback
            const totalGasCostWei = totalGasUnits * gasPrice;
            
            // Convert wei to ETH
            const ethersUtils = await import('ethers');
            evmGasFeesETH = ethersUtils.ethers.formatEther(totalGasCostWei);
            setEstimatedGasETH(evmGasFeesETH);
            
            // Don't convert to cycles - keep as 0 for display purposes since gas is paid directly
            evmGasFees = 0n;
            
            console.log('💰 Real EVM gas cost calculation:', {
              gasPrice: gasPrice.toString(),
              totalGasUnits: totalGasUnits.toString(),
              totalGasCostWei: totalGasCostWei.toString(),
              evmGasFeesETH,
              fundingAddress: icrc99FundingAddress,
              contractDeployed: remoteContractInfo?.deployed,
              nftCount: selectedNFTs.length,
            });
            
            // Check ETH balance of the funding address (not user's MetaMask address)
            if (icrc99FundingAddress) {
              try {
                const balanceWei = await provider.getBalance(icrc99FundingAddress);
                const balanceETH = ethersUtils.ethers.formatEther(balanceWei);
                setEthBalance(balanceETH);
                
                console.log('💰 ETH balance check for funding address:', {
                  address: icrc99FundingAddress,
                  balanceETH,
                  requiredETH: evmGasFeesETH,
                  hasSufficientBalance: parseFloat(balanceETH) > parseFloat(evmGasFeesETH),
                });
              } catch (balanceError) {
                console.warn('Could not check funding address balance:', balanceError);
                setEthBalance(null);
              }
            }
          } else {
            throw new Error('No MetaMask or chain ID available');
          }
        } catch (gasError) {
          console.warn('Failed to get real gas costs, using estimates:', gasError);
          console.warn('💰 Error details:', {
            message: gasError instanceof Error ? gasError.message : String(gasError),
            sourceContractPointer,
            targetNetwork
          });
          // Fallback to estimated gas costs
          evmGasFees = 0n; // Keep as 0 since gas fees are paid directly in ETH
          evmGasFeesETH = '~0.050'; // Rough estimate
        }

        // 4. Calculate total (no system fees)
        const total = (remoteContractDeployment || 0n) + castOperations + evmGasFees;

        const breakdown: CostBreakdown = {
          remoteContractDeployment,
          castOperations,
          evmGasFees,
          evmGasFeesETH,
          total,
        };

        console.log('💰 Final cost breakdown:', {
          remoteContractDeployment: breakdown.remoteContractDeployment?.toString(),
          castOperations: breakdown.castOperations.toString(),
          evmGasFees: breakdown.evmGasFees.toString(),
          total: breakdown.total.toString(),
        });

        setCostBreakdown(breakdown);
        onCostsCalculated(total);

      } catch (err) {
        console.error('Error calculating export costs:', err);
        setError(err instanceof Error ? err.message : 'Failed to calculate export costs');
        setCostBreakdown(null);
        onCostsCalculated(0n);
      } finally {
        setLoading(false);
      }
    };

    calculateCosts();
  }, [selectedNFTs, targetNetwork, remoteContractInfo, sourceContractPointer, networkName, remoteContractPointer]);

  // Separate effect for gas price information - runs once when component mounts
  useEffect(() => {
    const fetchGasPriceInfo = async () => {
      if (!targetNetwork || gasPriceInfo) {
        return; // Already fetched or no network selected
      }

      try {
        console.log('⛽ Fetching real gas price data for network:', networkName);
        
        // Get chain ID from target network
        const chainId = ('Ethereum' in targetNetwork) ? Number(targetNetwork.Ethereum[0]) : null;
        
        if (!chainId) {
          console.warn('Unable to determine chain ID for gas price fetching');
          return;
        }

        // Use MetaMask provider if available and connected to correct network
        if (window.ethereum) {
          try {
            const provider = new (await import('ethers')).ethers.BrowserProvider(window.ethereum);
            const network = await provider.getNetwork();
            
            if (Number(network.chainId) === chainId) {
              const feeData = await provider.getFeeData();
              const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || 20000000000n; // 20 gwei fallback
              
              // Convert wei to gwei for display
              const gasPriceGwei = Number(gasPrice) / 1e9;
              
              // Estimate USD cost (rough estimate - could be enhanced with real price APIs)
              const estimatedUSD = gasPriceGwei * 0.000021 * 2000; // Rough ETH price estimate
              
              setGasPriceInfo({
                network: networkName,
                gasPrice: `${gasPriceGwei.toFixed(1)} gwei`,
                usdPrice: `$${estimatedUSD.toFixed(2)}`,
                estimatedConfirmationTime: chainId === 1 ? '2-5 minutes' : '1-3 minutes',
              });
              
              console.log('⛽ Real gas price fetched:', {
                gasPrice: `${gasPriceGwei.toFixed(1)} gwei`,
                chainId,
                network: networkName,
              });
              return;
            }
          } catch (error) {
            console.warn('Could not fetch gas price from MetaMask:', error);
          }
        }

        // Fallback: Use conservative estimates based on network
        const fallbackGasPrices: Record<number, { gwei: number; usd: number; confirmTime: string }> = {
          1: { gwei: 30, usd: 15, confirmTime: '2-5 minutes' }, // Ethereum
          137: { gwei: 35, usd: 0.01, confirmTime: '1-3 minutes' }, // Polygon
          56: { gwei: 5, usd: 0.05, confirmTime: '1-3 minutes' }, // BSC
          42161: { gwei: 0.1, usd: 0.50, confirmTime: '1-2 minutes' }, // Arbitrum
          10: { gwei: 0.1, usd: 0.50, confirmTime: '1-2 minutes' }, // Optimism
          8453: { gwei: 0.1, usd: 0.50, confirmTime: '1-2 minutes' }, // Base
        };
        
        const fallback = fallbackGasPrices[chainId] || { gwei: 20, usd: 5, confirmTime: '2-5 minutes' };
        
        setGasPriceInfo({
          network: networkName,
          gasPrice: `${fallback.gwei} gwei`,
          usdPrice: `$${fallback.usd.toFixed(2)}`,
          estimatedConfirmationTime: fallback.confirmTime,
        });
        
        console.log('⛽ Using fallback gas price estimates for chain', chainId);
        
      } catch (error) {
        console.error('Error fetching gas price info:', error);
        // Set minimal fallback data
        setGasPriceInfo({
          network: networkName,
          gasPrice: 'Unknown',
          usdPrice: 'Unknown',
          estimatedConfirmationTime: '2-5 minutes',
        });
      }
    };

    fetchGasPriceInfo();
  }, [targetNetwork, networkName, gasPriceInfo]);

  // Format cycles to TCycles (accounting for 12 decimals)
  const formatCycles = (cycles: bigint): string => {
    const decimals = 12; // Cycles have 12 decimals
    const divisor = BigInt(10 ** decimals);
    const whole = cycles / divisor;
    const fraction = cycles % divisor;
    const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 3);
    return `${whole.toLocaleString()}.${fractionStr} TC`;
  };

  // Approve payment using real cycles ledger
  const handleApprovePayment = async () => {
    if (!costBreakdown || !user?.principal) return;

    setApprovalInProgress(true);
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Approving cycles payment for export...', {
        totalCost: costBreakdown.total.toString(),
        userBalance: cyclesBalance?.toString() || 'unknown',
        orchestratorCanister: process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai',
      });

      // Check if user has sufficient balance
      if (cyclesBalance !== null && cyclesBalance < costBreakdown.total) {
        throw new Error(`Insufficient cycles balance. You have ${formatCycles(cyclesBalance)} but need ${formatCycles(costBreakdown.total)}. Please deposit more cycles to your account.`);
      }

      // Approve cycles with a bit extra (110% of required) and 1 day expiry
      const approvalAmount = (costBreakdown.total * BigInt(110)) / BigInt(100);
      const oneDayInNanoseconds = BigInt(24 * 60 * 60 * 1000000000);
      const expiryTime = BigInt(Date.now() * 1000000) + oneDayInNanoseconds;

      console.log('📝 Submitting cycles approval...', {
        approvalAmount: approvalAmount.toString(),
        originalAmount: costBreakdown.total.toString(),
        expiryTime: expiryTime.toString(),
      });

      await mutations.cyclesApprove.mutateAsync({
        fee: [],
        memo: [],
        from_subaccount: [],
        created_at_time: [],
        amount: approvalAmount,
        expected_allowance: [],
        expires_at: [expiryTime],
        spender: {
          owner: Principal.fromText(process.env.ICRC99_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai'),
          subaccount: []
        }
      });

      console.log('✅ Cycles approval successful!');
      
      // Force refresh of allowance data
      await allowanceQuery.refetch();
      await balanceQuery.refetch();
      
      setPaymentApproved(true);
      
    } catch (err) {
      console.error('❌ Error approving cycles payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve cycles payment');
      setPaymentApproved(false);
    } finally {
      setApprovalInProgress(false);
      setLoading(false);
    }
  };

  if (loading && !costBreakdown) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Calculating Export Costs</h3>
        <p className="text-gray-600">
          Estimating cycles needed for {selectedNFTs.length} NFT{selectedNFTs.length !== 1 ? 's' : ''}
          {remoteContractInfo?.deployed ? '' : ' and contract deployment'}...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Calculating Costs</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!costBreakdown) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Calculate Costs</h3>
        <p className="text-gray-600">Please check your export configuration and try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Export Costs</h3>
        <p className="text-gray-600">
          Review the costs for exporting your {selectedNFTs.length} NFT{selectedNFTs.length !== 1 ? 's' : ''} to {networkName}.
        </p>
      </div>

      {/* Export Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-3">Export Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-600">NFTs:</span>
            <span className="ml-2 font-medium text-blue-800">
              {selectedNFTs.length} token{selectedNFTs.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div>
            <span className="text-blue-600">Target Network:</span>
            <span className="ml-2 font-medium text-blue-800">{networkName}</span>
          </div>
          <div>
            <span className="text-blue-600">Contract:</span>
            <span className="ml-2 font-medium text-blue-800">
              {remoteContractInfo?.deployed ? 'Existing' : 'New Deployment'}
            </span>
          </div>
          <div>
            <span className="text-blue-600">Operation:</span>
            <span className="ml-2 font-medium text-blue-800">Cast to EVM</span>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Cost Breakdown</h4>
        
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
          {/* Cast Operations */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <Zap className="w-5 h-5 text-blue-600 mr-3" />
              <div>
                <h5 className="font-medium text-gray-900">Cast Operations</h5>
                <p className="text-sm text-gray-600">
                  Bridge {selectedNFTs.length} NFT{selectedNFTs.length !== 1 ? 's' : ''} to {networkName}
                </p>
              </div>
            </div>
            <span className="font-medium text-gray-900">{formatCycles(costBreakdown.castOperations)}</span>
          </div>

          {/* Remote Contract Deployment */}
          {costBreakdown.remoteContractDeployment && (
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center">
                <CreditCard className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <h5 className="font-medium text-gray-900">Contract Deployment</h5>
                  <p className="text-sm text-gray-600">Deploy new ERC-721 contract on {networkName}</p>
                </div>
              </div>
              <span className="font-medium text-gray-900">{formatCycles(costBreakdown.remoteContractDeployment)}</span>
            </div>
          )}

          {/* EVM Gas Fees */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <ArrowRight className="w-5 h-5 text-orange-600 mr-3" />
              <div>
                <h5 className="font-medium text-gray-900">EVM Gas Fees</h5>
                <p className="text-sm text-gray-600">Estimated gas costs on {networkName}</p>
                {ethBalance && estimatedGasETH && (
                  <p className="text-xs text-gray-500 mt-1">
                    Balance: {parseFloat(ethBalance).toFixed(4)} ETH
                    {fundingAddress && (
                      <span className="text-gray-400 ml-1">({fundingAddress.slice(0, 6)}...{fundingAddress.slice(-4)})</span>
                    )}
                    {parseFloat(ethBalance) < parseFloat(estimatedGasETH) && (
                      <span className="text-red-600 ml-1">⚠️ Insufficient</span>
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="font-medium text-gray-900">{costBreakdown.evmGasFeesETH} ETH</span>
              {gasPriceInfo && (
                <p className="text-xs text-gray-500">~{gasPriceInfo.gasPrice}</p>
              )}
            </div>
          </div>

          
        </div>
      </div>

      {/* Gas Price Information */}
      {gasPriceInfo && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 mb-2">Current Gas Prices</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-yellow-600">Network:</span>
              <span className="ml-2 font-medium text-yellow-800">{gasPriceInfo.network}</span>
            </div>
            <div>
              <span className="text-yellow-600">Gas Price:</span>
              <span className="ml-2 font-medium text-yellow-800">{gasPriceInfo.gasPrice}</span>
            </div>
            <div>
              <span className="text-yellow-600">USD Est.:</span>
              <span className="ml-2 font-medium text-yellow-800">{gasPriceInfo.usdPrice}</span>
            </div>
            <div>
              <span className="text-yellow-600">Confirmation:</span>
              <span className="ml-2 font-medium text-yellow-800">{gasPriceInfo.estimatedConfirmationTime}</span>
            </div>
          </div>
        </div>
      )}

      {/* Funding Address Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-3">ETH Funding Address</h4>
        <div className="bg-white border border-blue-200 rounded-lg p-3">
          {fundingAddress ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">Address Balance</span>
                {ethBalance !== null ? (
                  <span className={`text-sm font-medium ${
                    estimatedGasETH && parseFloat(ethBalance) >= parseFloat(estimatedGasETH)
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {parseFloat(ethBalance).toFixed(6)} ETH
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">Loading...</span>
                )}
              </div>
              <p className="text-xs text-gray-600 font-mono break-all mb-2">
                {fundingAddress}
              </p>
              
              {ethBalance !== null && estimatedGasETH && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Required for gas:</span>
                    <span>{parseFloat(estimatedGasETH).toFixed(6)} ETH</span>
                  </div>
                  
                  {parseFloat(ethBalance) < parseFloat(estimatedGasETH) ? (
                    <div className="p-2 bg-red-50 border border-red-200 rounded">
                      <div className="flex items-center">
                        <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                        <span className="text-sm text-red-700 font-medium">
                          Insufficient ETH balance
                        </span>
                      </div>
                      <p className="text-xs text-red-600 mt-1">
                        Need {(parseFloat(estimatedGasETH) - parseFloat(ethBalance)).toFixed(6)} more ETH
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 bg-green-50 border border-green-200 rounded">
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        <span className="text-sm text-green-700 font-medium">
                          Sufficient ETH balance
                        </span>
                      </div>
                      <p className="text-xs text-green-600 mt-1">
                        Ready for gas fee payment
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {ethBalance === null && (
                <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded">
                  <div className="flex items-center">
                    <Loader2 className="w-4 h-4 text-gray-500 animate-spin mr-2" />
                    <span className="text-sm text-gray-600">
                      Checking balance...
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : !fundingAddress ? (
            <div className="py-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                <span className="text-sm font-medium text-gray-700">
                  No ICRC-99 Funding Address Available
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                No ckNFT canister found for this source contract
              </p>
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-xs text-yellow-700">
                  💡 This may be a new contract that hasn't been registered yet
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 text-gray-500 animate-spin mr-2" />
              <span className="text-sm text-gray-600">
                Retrieving funding address from ckNFT canister...
              </span>
            </div>
          )}
        </div>
        
        <div className="mt-3 text-xs text-blue-600">
          <p className="mb-1">💡 About the funding address:</p>
          {fundingAddress ? (
            <>
              <p>• This address pays for EVM gas fees during the export</p>
              <p>• Managed by the ckNFT canister on Internet Computer</p>
              <p>• Balance is checked automatically before export</p>
              <p className="mt-1 text-green-600">✓ Address retrieved successfully</p>
            </>
          ) : (
            <>
              <p>• ckNFT canisters manage funding addresses for gas payments</p>
              <p>• Each supported contract has a corresponding ckNFT canister</p>
              <p>• Contact support if your contract should be supported</p>
            </>
          )}
        </div>
      </div>

      {/* Payment Approval */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Payment Approval</h4>
        
        {/* Cycles Balance Information */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Wallet className="w-5 h-5 text-gray-600 mr-2" />
              <h5 className="font-medium text-gray-900">Your Cycles Balance</h5>
            </div>
            {balanceQuery.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
            ) : (
              <span className={clsx(
                'font-medium',
                cyclesBalance !== null && costBreakdown && cyclesBalance >= costBreakdown.total
                  ? 'text-green-600'
                  : 'text-red-600'
              )}>
                {cyclesBalance !== null ? formatCycles(cyclesBalance) : 'Unknown'}
              </span>
            )}
          </div>
          
          {cyclesBalance !== null && costBreakdown && (
            <div className="text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600">Required:</span>
                <span className="text-gray-900">{formatCycles(costBreakdown.total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Remaining after export:</span>
                <span className={clsx(
                  'font-medium',
                  cyclesBalance >= costBreakdown.total ? 'text-green-600' : 'text-red-600'
                )}>
                  {cyclesBalance >= costBreakdown.total 
                    ? formatCycles(cyclesBalance - costBreakdown.total)
                    : 'Insufficient Balance'
                  }
                </span>
              </div>
            </div>
          )}
          
          {cyclesBalance !== null && costBreakdown && cyclesBalance < costBreakdown.total && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">
                ⚠️ Insufficient cycles balance. Please deposit {formatCycles(costBreakdown.total - cyclesBalance)} more.
              </p>
            </div>
          )}
        </div>

        {/* Current Allowance Status */}
        {allowanceStatus && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-blue-600 mr-2" />
                <h5 className="font-medium text-blue-900">Current Allowance</h5>
              </div>
              <span className={clsx(
                'font-medium',
                allowanceStatus.isSufficient && !allowanceStatus.isExpired ? 'text-green-600' : 'text-orange-600'
              )}>
                {formatCycles(allowanceStatus.amount)}
              </span>
            </div>
            
            <div className="text-sm space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-blue-600">Status:</span>
                <span className={clsx(
                  'font-medium',
                  allowanceStatus.isSufficient && !allowanceStatus.isExpired 
                    ? 'text-green-600' 
                    : 'text-orange-600'
                )}>
                  {allowanceStatus.isExpired 
                    ? 'Expired' 
                    : allowanceStatus.isSufficient 
                      ? 'Sufficient' 
                      : 'Insufficient'
                  }
                </span>
              </div>
              {allowanceStatus.isExpired && (
                <p className="text-orange-700 text-xs">
                  Your previous allowance has expired. A new approval is required.
                </p>
              )}
              {!allowanceStatus.isSufficient && !allowanceStatus.isExpired && (
                <p className="text-orange-700 text-xs">
                  Your current allowance is insufficient for this export operation.
                </p>
              )}
            </div>
          </div>
        )}
        
        {paymentApproved ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="font-medium text-green-800">Payment Approved</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Cycles approved for export operation. You can now proceed with the export.
            </p>
            <div className="mt-2 text-xs text-green-600">
              Approved: {allowanceStatus ? formatCycles(allowanceStatus.amount) : 'Unknown amount'}
            </div>
          </div>
        ) : (
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h5 className="font-medium text-gray-900">Approve Cycles Payment</h5>
                <p className="text-sm text-gray-600">
                  Authorize the orchestrator to use {costBreakdown ? formatCycles(costBreakdown.total) : '...'} for this export
                </p>
              </div>
              <button
                onClick={handleApprovePayment}
                disabled={approvalInProgress || balanceQuery.isLoading || !costBreakdown || (cyclesBalance !== null && cyclesBalance < costBreakdown.total)}
                className={clsx(
                  'px-6 py-2 rounded-md font-medium transition-colors',
                  approvalInProgress || balanceQuery.isLoading || !costBreakdown || (cyclesBalance !== null && cyclesBalance < costBreakdown.total)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                )}
              >
                {approvalInProgress ? (
                  <div className="flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Approving...
                  </div>
                ) : balanceQuery.isLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Checking Balance...
                  </div>
                ) : (
                  'Approve Payment'
                )}
              </button>
            </div>
            
            <div className="text-sm text-gray-600">
              <p className="mb-1">This will:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Approve the cycles ledger transfer</li>
                <li>Allow the orchestrator to process your export</li>
                <li>Enable automatic gas fee payment on {networkName}</li>
                <li>Include 10% buffer for gas price fluctuations</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Ready to proceed indicator */}
      {paymentApproved && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
            <span className="font-medium text-blue-800">Ready to Export</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            All requirements met. Click "Start Export" to begin the bridging process.
          </p>
          <div className="mt-2 text-xs text-blue-600 space-y-1">
            <div>✓ Cycles balance: {cyclesBalance ? formatCycles(cyclesBalance) : 'Verified'}</div>
            <div>✓ Payment approved: {allowanceStatus ? formatCycles(allowanceStatus.amount) : 'Confirmed'}</div>
            <div>✓ Target network: {networkName}</div>
            <div>✓ NFTs selected: {selectedNFTs.length}</div>
          </div>
        </div>
      )}

      {/* Insufficient ETH balance warning */}
      {ethBalance && estimatedGasETH && parseFloat(ethBalance) < parseFloat(estimatedGasETH) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="font-medium text-red-800">Insufficient ETH for Gas Fees</span>
          </div>
          <p className="text-sm text-red-700 mt-1">
            The funding address needs {parseFloat(estimatedGasETH).toFixed(4)} ETH for gas fees but only has {parseFloat(ethBalance).toFixed(4)} ETH.
            {fundingAddress && (
              <>
                <br />
                <span className="text-xs text-red-600">
                  Address: {fundingAddress}
                </span>
              </>
            )}
            <br />
            Please add {(parseFloat(estimatedGasETH) - parseFloat(ethBalance)).toFixed(4)} ETH to the funding address.
          </p>
          <div className="mt-3">
            <button
              onClick={() => window.open(`https://faucet.quicknode.com/${networkName.toLowerCase()}`, '_blank')}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
            >
              Get Test ETH
            </button>
          </div>
        </div>
      )}

      {/* Insufficient balance warning */}
      {cyclesBalance !== null && costBreakdown && cyclesBalance < costBreakdown.total && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="font-medium text-red-800">Insufficient Cycles Balance</span>
          </div>
          <p className="text-sm text-red-700 mt-1">
            You need {formatCycles(costBreakdown.total - cyclesBalance)} more to complete this export.
          </p>
          <div className="mt-3">
            <button
              onClick={() => window.open('https://nns.icp0.io/wallet/', '_blank')}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
            >
              Get More Cycles
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

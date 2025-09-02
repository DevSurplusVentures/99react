import { useState, useEffect, useCallback } from 'react';
import { Principal } from '@dfinity/principal';
import { Loader2, AlertCircle, CheckCircle, ArrowLeftRight, Coins, Wallet, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { ethers } from 'ethers';
import { useFungibleToken } from '../../hooks/useFungibleToken';
import { useAuth } from '../../hooks/useAuth';
import { use99Mutations } from '../../hooks/use99Mutations';
import type { SelectedICNFT } from './EVMExportWizard';
import type { Network } from '../../declarations/orchestrator/orchestrator.did';
import { Actor } from '@dfinity/agent';
import { useAnonAgent } from '../../provider/AgentProvider';
import { idlFactory as ckNFTIdl } from '../../declarations/ckNFT/index';
import type { _SERVICE as CkNFTService } from '../../declarations/ckNFT/ckNFT.did';

export interface ReturnCosts {
  cyclesCost: bigint;
  ethCost: bigint;
  gasEstimate: bigint;
  targetNetwork: Network;
  targetContract: string;
  approvalAddress: string;
  burnFundingAddress?: string; // Legacy single address for backwards compatibility
  burnFundingAddresses?: string[]; // Multiple addresses for multiple NFTs
  // For multiple NFTs
  nftDetails?: Array<{
    nft: SelectedICNFT;
    cyclesCost: bigint;
    ethCost: bigint;
    gasEstimate: bigint;
    burnFundingAddress?: string; // Each NFT has its own burn address
  }>;
}

export interface ReturnCostStepProps {
  selectedCkNFTs: SelectedICNFT[];
  targetNetwork: Network | null;
  targetContract: string;
  costs: ReturnCosts | null;
  onCostsCalculated: (costs: ReturnCosts) => void;
  onApprovalStatusChange?: (isApproved: boolean, allowanceAmount?: bigint) => void;
  onBurnBalanceStatusChange?: (hasRequiredBalances: boolean, balanceInfo: {[address: string]: {balance: bigint, required: bigint, sufficient: boolean}}) => void;
  onContinue?: () => void;
  compact?: boolean;
}

export function ReturnCostStep({
  selectedCkNFTs,
  targetNetwork,
  targetContract,
  costs,
  onCostsCalculated,
  onApprovalStatusChange,
  onBurnBalanceStatusChange,
  onContinue,
  compact = false,
}: ReturnCostStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [cyclesBalance, setCyclesBalance] = useState<bigint | null>(null);
  const [burnFundingAddresses, setBurnFundingAddresses] = useState<{[key: string]: string}>({});
  const [allowanceStatus, setAllowanceStatus] = useState<{
    amount: bigint;
    isExpired: boolean;
    isSufficient: boolean;
  } | null>(null);
  const [paymentApproved, setPaymentApproved] = useState<boolean>(false);
  const [approvalInProgress, setApprovalInProgress] = useState<boolean>(false);
  const [sendEthInProgress, setSendEthInProgress] = useState<boolean>(false);
  const [burnAddressBalances, setBurnAddressBalances] = useState<{[address: string]: bigint}>({});
  
  const { user } = useAuth();
  const anonAgent = useAnonAgent();
  
  // Get orchestrator mutations for burn funding address
  const orchestratorCanisterId = process.env.REACT_APP_ORCHESTRATOR_CANISTER_ID || 'vg3po-ix777-77774-qaafa-cai';
  const mutations = use99Mutations(orchestratorCanisterId);
  
  // Cycles token for balance checks
  const cyclesTokenCanisterId = process.env.REACT_APP_CYCLES_LEDGER_CANISTER_ID || 'um5iw-rqaaa-aaaaq-qaaba-cai';
  const cyclesToken = useFungibleToken(cyclesTokenCanisterId);
  
  // User account for balance queries
  const userAccount = user?.principal ? { 
    owner: user.principal, 
    subaccount: [] as [] | [Uint8Array]
  } : undefined;

  // Balance query
  const balanceQuery = cyclesToken.useBalance(userAccount);

  // Allowance query for ckNFT canister (when we have a selected ckNFT)
  const ckNFTCanisterId = selectedCkNFTs.length > 0 ? Principal.fromText(selectedCkNFTs[0].canisterId) : null;
  const allowanceParams = userAccount && ckNFTCanisterId ? {
    account: userAccount,
    spender: { owner: ckNFTCanisterId, subaccount: [] as [] }
  } : undefined;
  const allowanceQuery = cyclesToken.useAllowance(allowanceParams);

  // Approval mutation
  const approveMutation = cyclesToken.useApprove();

  // Update cycles balance when query data changes
  useEffect(() => {
    if (balanceQuery.data !== undefined) {
      setCyclesBalance(balanceQuery.data);
    }
  }, [balanceQuery.data]);

  // Track allowance status based on query results
  useEffect(() => {
    if (allowanceQuery.data && costs?.cyclesCost) {
      const now = BigInt(Date.now() * 1_000_000); // nanoseconds
      const isExpired = allowanceQuery.data.expires_at.length > 0 && allowanceQuery.data.expires_at[0] ? 
        allowanceQuery.data.expires_at[0] < now : false;

      // Check against the same 110% buffer that we approve with
      const requiredAmountWithBuffer = (costs.cyclesCost * BigInt(110)) / BigInt(100);

      const newAllowanceStatus = {
        amount: allowanceQuery.data.allowance,
        isExpired,
        isSufficient: allowanceQuery.data.allowance >= requiredAmountWithBuffer,
      };

      // Only update state if the allowance status actually changed
      const statusChanged = !allowanceStatus || 
        allowanceStatus.amount !== newAllowanceStatus.amount ||
        allowanceStatus.isExpired !== newAllowanceStatus.isExpired ||
        allowanceStatus.isSufficient !== newAllowanceStatus.isSufficient;

      if (statusChanged) {
        setAllowanceStatus(newAllowanceStatus);

        // Auto-update payment approval status based on allowance
        const shouldBeApproved = newAllowanceStatus.isSufficient && !newAllowanceStatus.isExpired;
        const approvalChanged = paymentApproved !== shouldBeApproved;
        
        if (approvalChanged) {
          setPaymentApproved(shouldBeApproved);
          
          // Only notify parent component if approval status actually changed
          onApprovalStatusChange?.(shouldBeApproved, newAllowanceStatus.amount);
        }
      }
    }
  }, [allowanceQuery.data, costs?.cyclesCost, allowanceStatus, paymentApproved, onApprovalStatusChange]);

  // Fetch burn funding address when we have a selected ckNFT
  const fetchBurnFundingAddress = useCallback(async (tokenId: string, canisterId: string, retryCount = 0) => {
    if (!tokenId || !canisterId) return null;
    
    try {
      const result = await mutations.getBurnFundingAddress.mutateAsync({
        ckNFTCanisterId: Principal.fromText(canisterId),
        tokenId: BigInt(tokenId),
      });
      
      console.log('Burn funding address:', result);
      return result;
    } catch (error) {
      console.error('Error fetching burn funding address:', error);
      
      // Retry with exponential backoff for network issues (max 2 retries)
      const isNetworkError = error instanceof Error && (
        error.message.includes('ERR_INSUFFICIENT_RESOURCES') || 
        error.message.includes('Failed to fetch') ||
        error.message.includes('Network')
      );
      
      if (isNetworkError && retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s...
        console.log(`🔄 Retrying burn funding address fetch in ${delay}ms (attempt ${retryCount + 1}/2)`);
        
        setTimeout(() => {
          fetchBurnFundingAddress(tokenId, canisterId, retryCount + 1);
        }, delay);
      }
      
      // Don't set error state for burn funding address as it's optional
      return null;
    }
  }, [mutations.getBurnFundingAddress]);

  // Clear burn addresses when NFT selection changes
  useEffect(() => {
    // Clear addresses if the NFT selection has changed 
    const currentNFTKeys = selectedCkNFTs.map(nft => `${nft.canisterId}-${nft.tokenId}`);
    const existingKeys = Object.keys(burnFundingAddresses);
    
    const selectionChanged = currentNFTKeys.length !== existingKeys.length ||
      currentNFTKeys.some(key => !existingKeys.includes(key)) ||
      existingKeys.some(key => !currentNFTKeys.includes(key));
    
    if (selectionChanged && existingKeys.length > 0) {
      console.log('🔄 NFT selection changed, clearing old burn addresses');
      setBurnFundingAddresses({});
      setBurnAddressBalances({}); // Also clear balance cache
    }
  }, [selectedCkNFTs, burnFundingAddresses]);

  // NOTE: Removed the old single-NFT fetching useEffect to prevent loops
  // Burn addresses are now fetched during cost calculation for all NFTs

  const handleApprovePayment = async () => {
    if (!costs || !selectedCkNFTs.length || !userAccount || !ckNFTCanisterId) return;

    // Check if we already have sufficient approval
    if (paymentApproved && allowanceStatus?.isSufficient && !allowanceStatus?.isExpired) {
      console.log('✅ Payment already approved with sufficient allowance');
      return;
    }

    setApprovalInProgress(true);
    try {
      // Calculate expiration time (24 hours from now)
      const ONE_DAY_NANOS = 86400n * 1_000_000_000n;
      const currentTime = BigInt(Date.now() * 1_000_000);
      const expirationTime = currentTime + ONE_DAY_NANOS;

      // Approve cycles for the ckNFT canister with 110% buffer to match execution logic
      // This prevents the need for a second approval during execution
      const approvalAmount = (costs.cyclesCost * BigInt(110)) / BigInt(100);
      console.log('🔋 Approving cycles with 110% buffer:', {
        originalCost: costs.cyclesCost.toString(),
        approvalAmount: approvalAmount.toString(),
        nftCount: selectedCkNFTs.length,
        individualNFTCost: costs.nftDetails?.[0]?.cyclesCost.toString() || 'unknown',
        isMultipleNFTs: selectedCkNFTs.length > 1,
        calculationBreakdown: `${costs.cyclesCost.toString()} cycles × 110% = ${approvalAmount.toString()} cycles`,
      });

      await approveMutation.mutateAsync({
        spender: { owner: ckNFTCanisterId, subaccount: [] },
        amount: approvalAmount, // Use 110% buffer to match execution expectations
        fee: [],
        memo: [],
        created_at_time: [currentTime],
        from_subaccount: [],
        expected_allowance: [],
        expires_at: [expirationTime],
      });

      // Refresh allowance query
      await allowanceQuery.refetch();
      console.log('✅ Cycles approved for return operation with safety buffer');
    } catch (error) {
      console.error('❌ Error approving cycles:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to approve cycles';
      
      // Check if it's a network connectivity issue
      if (errorMessage.includes('ERR_INSUFFICIENT_RESOURCES') || errorMessage.includes('Failed to fetch')) {
        setError('Network connectivity issue with IC replica. Please check if the local IC replica is running and try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setApprovalInProgress(false);
    }
  };

  const handleSendEth = async () => {
    const firstBurnAddress = Object.values(burnFundingAddresses)[0] || costs?.burnFundingAddress;
    if (!costs || !firstBurnAddress) {
      console.error('❌ Missing burn funding address for ETH transfer');
      return;
    }

    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install MetaMask to send ETH.');
      return;
    }

    setSendEthInProgress(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Calculate recommended amount (2x gas estimate)
      const recommendedAmount = costs.ethCost ? (costs.ethCost * BigInt(2)) : ethers.parseEther('0.001');
      const targetAddress = firstBurnAddress;

      console.log('💰 Sending ETH to burn funding address:', {
        to: targetAddress,
        amount: ethers.formatEther(recommendedAmount),
        amountWei: recommendedAmount.toString(),
      });

      const transaction = {
        to: targetAddress,
        value: recommendedAmount,
      };

      const tx = await signer.sendTransaction(transaction);
      console.log('📤 ETH transfer transaction sent:', tx.hash);

      // Wait for confirmation
      await tx.wait();
      console.log('✅ ETH transfer confirmed:', tx.hash);
      
      // Refresh burn address balance after successful send
      setTimeout(async () => {
        await checkBurnAddressBalance(targetAddress);
      }, 2000); // Refresh balance after 2 seconds

    } catch (error) {
      console.error('❌ Error sending ETH:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send ETH';
      
      if (errorMessage.includes('User denied transaction')) {
        setError('Transaction was cancelled by user.');
      } else if (errorMessage.includes('insufficient funds')) {
        setError('Insufficient ETH balance for transaction.');
      } else {
        setError(`Failed to send ETH: ${errorMessage}`);
      }
    } finally {
      setSendEthInProgress(false);
    }
  };

  const handleSendEthToAddress = async (targetAddress: string, nftEthCost?: bigint) => {
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install MetaMask to send ETH.');
      return;
    }

    setSendEthInProgress(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Calculate recommended amount (2x gas estimate)
      const recommendedAmount = nftEthCost ? (nftEthCost * BigInt(2)) : ethers.parseEther('0.001');

      console.log('💰 Sending ETH to specific burn funding address:', {
        to: targetAddress,
        amount: ethers.formatEther(recommendedAmount),
        amountWei: recommendedAmount.toString(),
      });

      const transaction = {
        to: targetAddress,
        value: recommendedAmount,
      };

      const tx = await signer.sendTransaction(transaction);
      console.log('📤 ETH transfer transaction sent:', tx.hash);

      // Wait for confirmation
      await tx.wait();
      console.log('✅ ETH transfer confirmed:', tx.hash);
      
      // Refresh burn address balance after successful send
      setTimeout(() => checkBurnAddressBalance(targetAddress), 2000);
      
    } catch (error) {
      console.error('❌ Error sending ETH:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send ETH';
      
      if (errorMessage.includes('user rejected')) {
        setError('Transaction was cancelled by user');
      } else {
        setError(errorMessage);
      }
    } finally {
      setSendEthInProgress(false);
    }
  };

  // Check burn address ETH balance
  const checkBurnAddressBalance = useCallback(async (address: string) => {
    if (!address) return null;
    
    try {
      if (!window.ethereum) {
        console.warn('⚠️ MetaMask not available for balance check');
        return null;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(address);
      
      console.log('🔍 Burn address balance check:', {
        address,
        balance: ethers.formatEther(balance),
        balanceWei: balance.toString()
      });
      
      setBurnAddressBalances(prev => ({ ...prev, [address]: balance }));
      return balance;
    } catch (error) {
      console.error('❌ Error checking burn address balance:', error);
      return null;
    } finally {
      // Balance check completed
    }
  }, []);

  // Check burn address balance when address becomes available
  useEffect(() => {
    // Only check balance if we have costs calculated (which includes burn addresses)
    if (!costs) return;
    
    // Get a snapshot of current balances to avoid dependency loop
    const currentBalances = burnAddressBalances;
    
    // Throttle balance checks to prevent excessive API calls
    const addressesToCheck: string[] = [];
    
    // Check all burn funding addresses that we don't have balances for yet
    Object.entries(burnFundingAddresses).forEach(([, address]) => {
      if (address && currentBalances[address] === undefined) {
        addressesToCheck.push(address);
      }
    });
    
    // Also check legacy single address if present
    const legacyAddress = costs?.burnFundingAddress;
    if (legacyAddress && currentBalances[legacyAddress] === undefined) {
      addressesToCheck.push(legacyAddress);
    }
    
    // Batch balance checks with a small delay to prevent overwhelming the RPC
    if (addressesToCheck.length > 0) {
      console.log('🔍 Checking balances for addresses:', addressesToCheck);
      addressesToCheck.forEach((address, index) => {
        setTimeout(() => {
          checkBurnAddressBalance(address);
        }, index * 100); // 100ms delay between each check
      });
    }
  }, [costs, burnFundingAddresses, costs?.burnFundingAddress, checkBurnAddressBalance]); // Removed burnAddressBalances from deps

  // Monitor burn address balances and notify parent component about funding status
  useEffect(() => {
    if (!costs || !onBurnBalanceStatusChange) return;

    // Get all burn addresses that need to be funded
    const addressesToCheck: string[] = [];
    const expectedCosts: {[address: string]: bigint} = {};

    // Check addresses from multiple NFTs
    Object.entries(burnFundingAddresses).forEach(([, address], index) => {
      if (address) {
        addressesToCheck.push(address);
        // Get the required ETH cost for this specific NFT
        const nftEthCost = costs.nftDetails?.[index]?.ethCost || 
                          (costs.ethCost ? costs.ethCost / BigInt(selectedCkNFTs.length) : BigInt(0));
        expectedCosts[address] = nftEthCost;
      }
    });

    // Also check legacy single address if present
    const legacyAddress = costs.burnFundingAddress;
    if (legacyAddress && !addressesToCheck.includes(legacyAddress)) {
      addressesToCheck.push(legacyAddress);
      expectedCosts[legacyAddress] = costs.ethCost || BigInt(0);
    }

    // Calculate balance status for each address
    const balanceInfo: {[address: string]: {balance: bigint, required: bigint, sufficient: boolean}} = {};
    let allAddressesSufficient = true;

    for (const address of addressesToCheck) {
      const currentBalance = burnAddressBalances[address] || BigInt(0);
      const requiredAmount = expectedCosts[address] || BigInt(0);
      const isSufficient = currentBalance >= requiredAmount;
      
      balanceInfo[address] = {
        balance: currentBalance,
        required: requiredAmount,
        sufficient: isSufficient
      };

      if (!isSufficient) {
        allAddressesSufficient = false;
      }
    }

    // Only call callback if we have balance information for all addresses
    const hasBalanceInfoForAllAddresses = addressesToCheck.length > 0 && 
      addressesToCheck.every(addr => burnAddressBalances[addr] !== undefined);

    if (hasBalanceInfoForAllAddresses) {
      console.log('🔍 Burn address balance validation:', {
        totalAddresses: addressesToCheck.length,
        balanceInfo,
        allSufficient: allAddressesSufficient
      });
      onBurnBalanceStatusChange(allAddressesSufficient, balanceInfo);
    }
  }, [costs, burnAddressBalances, burnFundingAddresses, selectedCkNFTs.length, onBurnBalanceStatusChange]);

  // Auto-calculate costs when dependencies are available or when NFT selection changes
  useEffect(() => {
    if (selectedCkNFTs.length > 0 && targetNetwork && targetContract && user?.principal && !calculating && !loading) {
      // Calculate if no costs exist, or if the number of NFTs doesn't match the number of cost details
      const shouldCalculate = !costs || 
        !costs.nftDetails || 
        costs.nftDetails.length !== selectedCkNFTs.length ||
        // Check if any NFT IDs have changed
        costs.nftDetails.some((detail, index) => 
          index >= selectedCkNFTs.length || 
          detail.nft.tokenId !== selectedCkNFTs[index].tokenId ||
          detail.nft.canisterId !== selectedCkNFTs[index].canisterId
        ) ||
        // Check if target parameters have changed
        costs.targetContract !== targetContract ||
        // Compare targetNetwork safely without JSON.stringify (avoids BigInt serialization issues)
        (costs.targetNetwork !== targetNetwork && 
         (!costs.targetNetwork || !targetNetwork || 
          Object.keys(costs.targetNetwork)[0] !== Object.keys(targetNetwork)[0]));
      
      if (shouldCalculate) {
        console.log('🔄 NFT selection or target changed, recalculating costs');
        calculateReturnCosts();
      }
    }
  }, [selectedCkNFTs, targetNetwork, targetContract, user?.principal, costs, calculating, loading]);

  const calculateReturnCosts = async () => {
    if (!selectedCkNFTs.length || !targetNetwork || !targetContract || !user?.principal) {
      setError('Missing required information for cost calculation');
      return;
    }

    setCalculating(true);
    setError(null);
    setLoading(true);

    try {
      console.log('🧮 Calculating return costs for ckNFTs:', selectedCkNFTs);
      
      // Step 1: Collect burn funding addresses for all NFTs
      console.log('🔍 Fetching burn funding addresses for all NFTs...');
      const burnAddresses: {[key: string]: string} = {};
      
      // Check if we already have addresses for these NFTs
      const existingAddressesValid = Object.keys(burnFundingAddresses).length > 0 &&
        selectedCkNFTs.every(nft => burnFundingAddresses[`${nft.canisterId}-${nft.tokenId}`]);
      
      if (existingAddressesValid) {
        console.log('✅ Using existing burn addresses from state:', {
          existingCount: Object.keys(burnFundingAddresses).length,
          requiredCount: selectedCkNFTs.length,
          addresses: Object.values(burnFundingAddresses)
        });
        Object.assign(burnAddresses, burnFundingAddresses);
      } else {
        const missingNFTs = selectedCkNFTs.filter(nft => !burnFundingAddresses[`${nft.canisterId}-${nft.tokenId}`]);
        console.log('🔄 Fetching burn addresses for NFTs:', {
          totalNFTs: selectedCkNFTs.length,
          existingAddresses: Object.keys(burnFundingAddresses).length,
          missingNFTs: missingNFTs.map(nft => nft.tokenId),
          willFetchFor: missingNFTs.length
        });
        for (const nft of selectedCkNFTs) {
          try {
            const burnAddress = await fetchBurnFundingAddress(nft.tokenId, nft.canisterId);
            if (burnAddress) {
              burnAddresses[`${nft.canisterId}-${nft.tokenId}`] = burnAddress;
              console.log(`🔍 Burn address for NFT ${nft.tokenId}: ${burnAddress}`);
            }
          } catch (error) {
            console.warn(`⚠️ Could not fetch burn address for NFT ${nft.tokenId}:`, error);
          }
        }
        
        // Update burn funding addresses state only if we fetched new ones
        setBurnFundingAddresses(burnAddresses);
      }
      
      // Step 2: Calculate costs for each selected NFT
      const nftDetails: Array<{
        nft: SelectedICNFT;
        cyclesCost: bigint;
        ethCost: bigint;
        gasEstimate: bigint;
        burnFundingAddress?: string;
      }> = [];
      
      let totalCyclesCost = BigInt(0);
      let totalEthCost = BigInt(0);
      
      for (const nft of selectedCkNFTs) {
        // Create ckNFT actor for this specific NFT
        const ckNFTActor = Actor.createActor<CkNFTService>(ckNFTIdl, {
          agent: anonAgent,
          canisterId: nft.canisterId,
        });

        // Create cast cost request for this NFT
        const castCostRequest = {
          tokenId: BigInt(nft.tokenId),
          contract: targetContract,
          network: targetNetwork,
        };

        console.log(`📋 Cast cost request for NFT ${nft.tokenId}:`, {
          tokenId: nft.tokenId,
          contract: targetContract,
          network: 'Ethereum' in targetNetwork ? `Ethereum (${targetNetwork.Ethereum[0] || 'Mainnet'})` : 'Other Network',
        });
        const castCostResult = await ckNFTActor.icrc99_cast_cost(castCostRequest);

        console.log(`💰 Cast cost result for NFT ${nft.tokenId}:`, typeof castCostResult === 'bigint' ? castCostResult.toString() : castCostResult);

        let nftCyclesCost: bigint = BigInt(0);
        
        // The result should be a bigint directly
        if (typeof castCostResult === 'bigint') {
          nftCyclesCost = castCostResult;
        } else {
          throw new Error(`Invalid cost calculation result for NFT ${nft.tokenId}`);
        }

        // Estimated gas cost for minting on target EVM chain (per NFT)
        const estimatedGasCost = BigInt('150000'); // ~150k gas per NFT
        const estimatedGasPrice = BigInt('20000000000'); // 20 gwei
        const nftEthCost = estimatedGasCost * estimatedGasPrice;

        // Add to totals
        totalCyclesCost += nftCyclesCost;
        totalEthCost += nftEthCost;

        // Get burn funding address for this NFT
        const nftBurnAddress = burnAddresses[`${nft.canisterId}-${nft.tokenId}`];

        // Store details for this NFT
        nftDetails.push({
          nft,
          cyclesCost: nftCyclesCost,
          ethCost: nftEthCost,
          gasEstimate: estimatedGasCost,
          burnFundingAddress: nftBurnAddress,
        });
      }

      console.log(`💰 Total costs for ${selectedCkNFTs.length} NFTs:`, {
        totalCyclesCost: totalCyclesCost.toString(),
        totalEthCost: totalEthCost.toString(),
        nftCount: selectedCkNFTs.length,
        burnAddresses: Object.keys(burnAddresses).length,
      });

      const returnCosts: ReturnCosts = {
        cyclesCost: totalCyclesCost,
        ethCost: totalEthCost,
        gasEstimate: totalEthCost / BigInt('20000000000'), // Total gas estimate
        targetNetwork,
        targetContract,
        approvalAddress: '', // Not needed for returns - EVM fees are funded by bridge
        burnFundingAddresses: Object.values(burnAddresses),
        burnFundingAddress: Object.values(burnAddresses)[0], // Legacy compatibility - first address
        nftDetails,
      };

      console.log('✅ Return costs calculated:', {
        totalCyclesCost: returnCosts.cyclesCost.toString(),
        totalEthCost: returnCosts.ethCost.toString(),
        totalGasEstimate: returnCosts.gasEstimate.toString(),
        targetNetwork: 'Ethereum' in returnCosts.targetNetwork ? `Ethereum (${returnCosts.targetNetwork.Ethereum[0] || 'Mainnet'})` : 'Other Network',
        targetContract: returnCosts.targetContract,
        burnFundingAddress: returnCosts.burnFundingAddress,
        hasBurnAddress: !!returnCosts.burnFundingAddress,
        nftDetailsCount: returnCosts.nftDetails?.length || 0,
        nftCount: selectedCkNFTs.length,
      });
      onCostsCalculated(returnCosts);

    } catch (err) {
      console.error('❌ Error calculating return costs:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate return costs';
      
      // Check if it's a network connectivity issue
      if (errorMessage.includes('ERR_INSUFFICIENT_RESOURCES') || errorMessage.includes('Failed to fetch')) {
        setError('Network connectivity issue with IC replica. Please ensure the local IC replica is running and has sufficient resources.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
      setCalculating(false);
    }
  };

  // Format costs for display
  const formatCycles = (cycles: bigint) => {
    const trillion = BigInt(1_000_000_000_000);
    if (cycles >= trillion) {
      return `${(Number(cycles) / Number(trillion)).toFixed(1)}T`;
    }
    const billion = BigInt(1_000_000_000);
    if (cycles >= billion) {
      return `${(Number(cycles) / Number(billion)).toFixed(1)}B`;
    }
    return `${Number(cycles).toLocaleString()}`;
  };

  const formatEth = (wei: bigint) => {
    const eth = Number(wei) / Math.pow(10, 18);
    return eth.toFixed(6);
  };

  if (compact && costs) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Cycles Cost:</span>
          <span className="font-medium">{formatCycles(costs.cyclesCost)} cycles</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Gas Estimate:</span>
          <span className="font-medium">{formatEth(costs.ethCost)} ETH</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Return Costs</h3>
        <p className="text-gray-600">
          Review the costs for returning your ckNFT{selectedCkNFTs.length > 1 ? 's' : ''} to the target EVM chain.
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Calculating Costs</h4>
          <p className="text-gray-600">
            Getting return costs from the ckNFT canister and target network...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Cost Calculation Failed</h4>
          <p className="text-gray-600 mb-4">{error}</p>
          
          {/* Show network troubleshooting tips for connectivity issues */}
          {(error.includes('ERR_INSUFFICIENT_RESOURCES') || error.includes('Failed to fetch') || error.includes('Network connectivity')) && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
              <h5 className="font-medium text-yellow-800 mb-2">Network Troubleshooting:</h5>
              <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                <li>Ensure the local IC replica is running (`dfx start`)</li>
                <li>Check if there are sufficient system resources (CPU, Memory)</li>
                <li>Try refreshing the page and waiting a moment</li>
                <li>Restart the IC replica if issues persist</li>
              </ul>
            </div>
          )}
          
          <button
            onClick={calculateReturnCosts}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Retry Calculation
          </button>
        </div>
      )}

      {/* Success State */}
      {costs && !loading && (
        <div className="space-y-4">
          <div className="flex items-center text-green-600 mb-4">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">Costs calculated successfully</span>
          </div>

          {/* Cost Breakdown */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* IC Cycles Cost */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center mb-2">
                <Coins className="w-5 h-5 text-blue-600 mr-2" />
                <h5 className="font-medium text-blue-800">IC Cycles Cost</h5>
              </div>
              <p className="text-2xl font-bold text-blue-700 mb-1">
                {formatCycles(costs.cyclesCost)} cycles
              </p>
              <p className="text-xs text-blue-600">
                For IC network operations and EVM transaction processing
                {selectedCkNFTs.length > 1 && (
                  <span className="block mt-1">
                    ({selectedCkNFTs.length} NFTs × {formatCycles(costs.nftDetails?.[0]?.cyclesCost || BigInt(0))} cycles each)
                  </span>
                )}
              </p>
            </div>

            {/* EVM Gas Estimate */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center mb-2">
                <ArrowLeftRight className="w-5 h-5 text-green-600 mr-2" />
                <h5 className="font-medium text-green-800">EVM Gas Estimate</h5>
              </div>
              <p className="text-2xl font-bold text-green-700 mb-1">
                ~{formatEth(costs.ethCost)} ETH
              </p>
              <p className="text-xs text-green-600">
                Estimated gas for minting on target EVM chain (funded by bridge)
                {selectedCkNFTs.length > 1 && (
                  <span className="block mt-1">
                    ({selectedCkNFTs.length} NFTs × {formatEth(costs.nftDetails?.[0]?.ethCost || BigInt(0))} ETH each)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* NFT Details */}
          {costs.nftDetails && costs.nftDetails.length > 1 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h6 className="font-medium text-gray-800 mb-3">Per-NFT Breakdown</h6>
              <div className="space-y-2">
                {costs.nftDetails.map((detail) => (
                  <div key={`${detail.nft.canisterId}-${detail.nft.tokenId}`} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">
                      {detail.nft.name || `NFT #${detail.nft.tokenId}`}
                    </span>
                    <span className="text-gray-800">
                      {formatCycles(detail.cyclesCost)} cycles
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Balance vs Cost Comparison */}
          <div className="p-4 bg-white border-2 border-blue-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Wallet className="w-6 h-6 text-blue-600 mr-2" />
                <h5 className="text-lg font-semibold text-gray-900">Balance vs Cast Cost</h5>
              </div>
              {balanceQuery.isLoading && (
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Current Balance */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">
                  Your Current Balance
                </div>
                <div className={clsx(
                  'text-2xl font-bold',
                  balanceQuery.isLoading 
                    ? 'text-gray-400'
                    : cyclesBalance !== null && cyclesBalance >= costs.cyclesCost
                      ? 'text-green-600'
                      : 'text-red-600'
                )}>
                  {balanceQuery.isLoading ? (
                    <div className="flex items-center">
                      <Loader2 className="w-6 h-6 animate-spin mr-2" />
                      Loading...
                    </div>
                  ) : cyclesBalance !== null ? (
                    `${formatCycles(cyclesBalance)} cycles`
                  ) : (
                    'Unknown'
                  )}
                </div>
              </div>

              {/* Required Cost */}
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                <div className="text-xs text-orange-600 font-medium uppercase tracking-wide mb-1">
                  Cast Cost Required
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCycles(costs.cyclesCost)} cycles
                </div>
              </div>
            </div>

            {/* Balance Status */}
            {!balanceQuery.isLoading && cyclesBalance !== null && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <span className="font-medium text-gray-700">Difference:</span>
                  <span className={clsx(
                    'text-lg font-bold',
                    cyclesBalance >= costs.cyclesCost ? 'text-green-600' : 'text-red-600'
                  )}>
                    {cyclesBalance >= costs.cyclesCost ? '+' : ''}{formatCycles(cyclesBalance - costs.cyclesCost)} cycles
                  </span>
                </div>

                {cyclesBalance >= costs.cyclesCost ? (
                  <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-md">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-green-800">Sufficient Balance</div>
                      <div className="text-sm text-green-700">
                        You have enough cycles for this return operation.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-red-800">Insufficient Balance</div>
                      <div className="text-sm text-red-700">
                        You need {formatCycles(costs.cyclesCost - cyclesBalance)} more cycles to proceed.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {balanceQuery.error && (
              <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" />
                <div>
                  <div className="font-medium text-yellow-800">Balance Check Failed</div>
                  <div className="text-sm text-yellow-700">
                    Unable to retrieve your current balance. Please try refreshing.
                  </div>
                </div>
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
                    Your current allowance is insufficient for this return operation.
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Payment Approval Section */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Payment Approval</h4>
            
            {paymentApproved ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Payment Approved</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Cycles approved for return operation. You can now proceed with the return.
                </p>
                <div className="mt-2 text-xs text-green-600">
                  Approved: {allowanceStatus ? formatCycles(allowanceStatus.amount) : 'Unknown amount'}
                </div>
                {/* Show sync status */}
                <div className="mt-1 text-xs text-green-600">
                  ✅ Synced with return process - no additional approval needed
                </div>
              </div>
            ) : (
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h5 className="font-medium text-gray-900">Approve Cycles Payment</h5>
                    <p className="text-sm text-gray-600">
                      Authorize the ckNFT canister to use {formatCycles(costs.cyclesCost)} cycles for this return
                      {selectedCkNFTs.length > 1 && (
                        <span className="block text-xs text-gray-500 mt-1">
                          Total for {selectedCkNFTs.length} NFTs (includes 10% safety buffer)
                        </span>
                      )}
                    </p>
                    {/* Show if this is a re-approval */}
                    {allowanceStatus && allowanceStatus.amount > 0n && (
                      <p className="text-xs text-orange-600 mt-1">
                        {allowanceStatus.isExpired 
                          ? '⏰ Previous approval expired - new approval required'
                          : '⚠️ Current approval insufficient - additional approval needed'
                        }
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleApprovePayment}
                    disabled={approvalInProgress || balanceQuery.isLoading || (cyclesBalance !== null && cyclesBalance < costs.cyclesCost)}
                    className={clsx(
                      'px-6 py-2 rounded-md font-medium transition-colors',
                      approvalInProgress || balanceQuery.isLoading || (cyclesBalance !== null && cyclesBalance < costs.cyclesCost)
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
                {/* Show approval sync notice */}
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs text-blue-700">
                    🔄 This approval will be automatically checked by the return process. Once approved here, the return tab will proceed without asking for approval again.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Target Information */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h6 className="font-medium text-yellow-800 mb-2">Return Destination</h6>
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-yellow-600">Target Network:</span>
                <span className="ml-2 text-yellow-800">
                  {'Ethereum' in costs.targetNetwork ? `Ethereum (${costs.targetNetwork.Ethereum[0] || 'Mainnet'})` : 'Other Network'}
                </span>
              </div>
              <div>
                <span className="text-yellow-600">Target Contract:</span>
                <span className="ml-2 font-mono text-yellow-800 text-xs break-all">
                  {costs.targetContract}
                </span>
              </div>
              <div>
                <span className="text-yellow-600">Target Funding:</span>
                <span className="ml-2 text-yellow-800 text-xs">
                  EVM gas fees funded by the bridge network
                </span>
              </div>
            </div>
          </div>

          {/* Burn Funding Addresses Section */}
          {(Object.keys(burnFundingAddresses).length > 0 || costs.burnFundingAddress || costs.burnFundingAddresses?.length) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h6 className="font-medium text-blue-800">Burn Funding Addresses</h6>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  Optional
                </span>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-blue-700">
                  Send ETH to these addresses to fund gas for the return transactions on the EVM chain.
                  Each NFT has its own burn address. The bridge can also execute returns using its own funding.
                </p>
                
                {/* Show all burn funding addresses */}
                {Object.entries(burnFundingAddresses).map(([nftKey, address], index) => {
                  const nft = selectedCkNFTs.find(n => `${n.canisterId}-${n.tokenId}` === nftKey);
                  return (
                    <div key={nftKey} className="bg-white border border-blue-200 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          NFT #{nft?.tokenId || 'Unknown'} Burn Address:
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <code className="text-sm font-mono text-gray-800 break-all">
                          {address}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(address)}
                          className="ml-2 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                      
                      {/* Balance Information */}
                      {burnAddressBalances[address] !== undefined && (
                        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-sm">
                          <span className="text-green-700 font-medium">
                            Current Balance: {ethers.formatEther(burnAddressBalances[address])} ETH
                          </span>
                          {burnAddressBalances[address] > 0n && (
                            <span className="ml-2 text-green-600">✅ Funded</span>
                          )}
                        </div>
                      )}
                      
                      {/* Send ETH Button for this NFT */}
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Recommended: {costs.nftDetails?.[index]?.ethCost ? 
                            `${(Number(costs.nftDetails[index].ethCost) / 1e18 * 2).toFixed(6)} ETH` : 
                            '0.001 ETH'}
                        </div>
                        <button
                          onClick={() => handleSendEthToAddress(address, costs.nftDetails?.[index]?.ethCost)}
                          disabled={sendEthInProgress}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {sendEthInProgress ? 'Sending...' : 'Send ETH'}
                        </button>
                      </div>
                    </div>
                  );
                })}
                
                {/* Legacy single address support */}
                {(Object.keys(burnFundingAddresses).length === 0 && costs.burnFundingAddress) && (
                  <div className="bg-white border border-blue-200 rounded p-3">
                    <div className="flex items-center justify-between mb-3">
                      <code className="text-sm font-mono text-gray-800 break-all">
                        {costs.burnFundingAddress}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(costs.burnFundingAddress || '')}
                        className="ml-2 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                    
                    {/* Balance Information for legacy address */}
                    {costs.burnFundingAddress && burnAddressBalances[costs.burnFundingAddress] !== undefined && (
                      <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-sm">
                        <span className="text-green-700 font-medium">
                          Current Balance: {ethers.formatEther(burnAddressBalances[costs.burnFundingAddress])} ETH
                        </span>
                        {burnAddressBalances[costs.burnFundingAddress] > 0n && (
                          <span className="ml-2 text-green-600">✅ Funded</span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Recommended: {costs.ethCost ? `${(Number(costs.ethCost) / 1e18 * 2).toFixed(6)} ETH` : '0.001 ETH'}
                      </div>
                      <button
                        onClick={handleSendEth}
                        disabled={sendEthInProgress}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {sendEthInProgress ? 'Sending...' : 'Send ETH'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading Burn Address - only show if we're actually missing addresses */}
          {(() => {
            const missingAddresses = selectedCkNFTs.filter(nft => !burnFundingAddresses[`${nft.canisterId}-${nft.tokenId}`]);
            const shouldShowLoading = selectedCkNFTs.length > 0 && missingAddresses.length > 0 && !costs?.burnFundingAddress && calculating;
            
            if (shouldShowLoading) {
              console.log('🔄 Missing burn addresses for NFTs:', missingAddresses.map(nft => nft.tokenId));
            }
            
            return shouldShowLoading;
          })() && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center">
                <Loader2 className="w-4 h-4 animate-spin text-gray-500 mr-2" />
                <span className="text-sm text-gray-600">
                  Fetching burn funding addresses...
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                These addresses allow you to fund gas fees for the return transactions.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={() => {
                // Clear costs to recalculate
                onCostsCalculated(null as any);
                calculateReturnCosts();
              }}
              disabled={loading}
              className="px-6 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              Recalculate Costs
            </button>
            {onContinue && (
              <button
                onClick={onContinue}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Continue to Return
              </button>
            )}
          </div>
        </div>
      )}

      {/* Initial State */}
      {!costs && !loading && !error && (
        <div className="text-center py-8">
          <Coins className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Ready to Calculate</h4>
          <p className="text-gray-600 mb-4">
            Click below to calculate the costs for returning your ckNFT{selectedCkNFTs.length > 1 ? 's' : ''}.
          </p>
          <button
            onClick={calculateReturnCosts}
            disabled={!selectedCkNFTs.length || !targetNetwork || !targetContract || !user?.principal}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Calculate Return Costs
          </button>
        </div>
      )}
    </div>
  );
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedActor } from './useActor';
import { useIsAuthenticated } from './useAuth';
import { nft, idlFactory as nftIdl } from '../declarations/nft/index';
import type {
  TransferResult,
  TransferArgs,
  ApproveTokenArg,
  ApproveTokenResult,
  ApproveCollectionArg,
  ApproveCollectionResult,
  TransferFromArg,
  TransferFromResult,
  RevokeTokenApprovalArg,
  RevokeTokenApprovalResult,
  RevokeCollectionApprovalArg,
  RevokeCollectionApprovalResult,
  SetNFTItemRequest,
  SetNFTRequest,
  SetNFTResult,
} from '../declarations/nft/nft.did';

/** If you want to expose a MintNFT type, alias candid's SetNFTItemRequest */
export type MintNFTItem = SetNFTItemRequest;
export type MintNFTRequest = SetNFTRequest;

/** Mutation hooks for ICRC-7/37 NFT actions */

// TRANSFER
export function useTransferNFT(canisterId: string) {
  const client = useQueryClient();
  const isAuthenticated = useIsAuthenticated();
  const actor = useAuthenticatedActor<typeof nft>(canisterId, nftIdl as any);
  
  const mutationFn = async (args: TransferArgs): Promise<([] | [TransferResult])[]> => {
    if (!isAuthenticated) {
      throw new Error('User must be authenticated to transfer NFTs');
    }
    return actor.icrc7_transfer([args]);
  };
  
  return useMutation({
    mutationFn,
    onSuccess: () => client.invalidateQueries()
  });
}

// APPROVE TOKENS
export function useApproveTokens(canisterId: string) {
  const client = useQueryClient();
  const isAuthenticated = useIsAuthenticated();
  const actor = useAuthenticatedActor<typeof nft>(canisterId, nftIdl as any);
  
  const mutationFn = async (args: ApproveTokenArg): Promise<([] | [ApproveTokenResult])[]> => {
    if (!isAuthenticated) {
      throw new Error('User must be authenticated to approve tokens');
    }
    return actor.icrc37_approve_tokens([args]);
  };
  
  return useMutation({
    mutationFn,
    onSuccess: () => client.invalidateQueries()
  });
}

// APPROVE COLLECTION
export function useApproveCollection(canisterId: string) {
  const client = useQueryClient();
  const isAuthenticated = useIsAuthenticated();
  const actor = useAuthenticatedActor<typeof nft>(canisterId, nftIdl as any);
  
  const mutationFn = async (args: ApproveCollectionArg): Promise<([] | [ApproveCollectionResult])[]> => {
    if (!isAuthenticated) {
      throw new Error('User must be authenticated to approve collection');
    }
    return actor.icrc37_approve_collection([args]);
  };
  
  return useMutation({
    mutationFn,
    onSuccess: () => client.invalidateQueries()
  });
}

// TRANSFER FROM
export function useTransferFrom(canisterId: string) {
  const client = useQueryClient();
  const isAuthenticated = useIsAuthenticated();
  const actor = useAuthenticatedActor<typeof nft>(canisterId, nftIdl as any);
  
  const mutationFn = async (args: TransferFromArg): Promise<([] | [TransferFromResult])[]> => {
    if (!isAuthenticated) {
      throw new Error('User must be authenticated to transfer from');
    }
    return actor.icrc37_transfer_from([args]);
  };
  
  return useMutation({
    mutationFn,
    onSuccess: () => client.invalidateQueries()
  });
}

// REVOKE TOKEN APPROVAL
export function useRevokeTokenApproval(canisterId: string) {
  const client = useQueryClient();
  const isAuthenticated = useIsAuthenticated();
  const actor = useAuthenticatedActor<typeof nft>(canisterId, nftIdl as any);
  
  const mutationFn = async (args: RevokeTokenApprovalArg): Promise<([] | [RevokeTokenApprovalResult])[]> => {
    if (!isAuthenticated) {
      throw new Error('User must be authenticated to revoke token approvals');
    }
    return actor.icrc37_revoke_token_approvals([args]);
  };
  
  return useMutation({
    mutationFn,
    onSuccess: () => client.invalidateQueries()
  });
}

// REVOKE COLLECTION APPROVAL
export function useRevokeCollectionApproval(canisterId: string) {
  const client = useQueryClient();
  const isAuthenticated = useIsAuthenticated();
  const actor = useAuthenticatedActor<typeof nft>(canisterId, nftIdl as any);
  
  const mutationFn = async (args: RevokeCollectionApprovalArg): Promise<([] | [RevokeCollectionApprovalResult])[]> => {
    if (!isAuthenticated) {
      throw new Error('User must be authenticated to revoke collection approvals');
    }
    return actor.icrc37_revoke_collection_approvals([args]);
  };
  
  return useMutation({
    mutationFn,
    onSuccess: () => client.invalidateQueries()
  });
}

// MINT NFT
export function useMintNFT(canisterId: string) {
  const client = useQueryClient();
  const isAuthenticated = useIsAuthenticated();
  const actor = useAuthenticatedActor<typeof nft>(canisterId, nftIdl as any);
  
  const mutationFn = async (args: MintNFTRequest): Promise<SetNFTResult[]> => {
    if (!isAuthenticated) {
      throw new Error('User must be authenticated to mint NFTs');
    }
    return actor.icrcX_mint(args);
  };
  
  return useMutation({
    mutationFn,
    onSuccess: () => client.invalidateQueries()
  });
}
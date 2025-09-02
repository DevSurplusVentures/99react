import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

import { _SERVICE } from './ckNFT.did';
export { _SERVICE };

export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];

/**
 * A ready-to-use agent for the ckNFT canister
 * @param canisterId The canister ID
 * @param options
 */
export declare function createActor(canisterId: string | Principal, options?: {
  agentOptions?: import("@dfinity/agent").HttpAgentOptions;
  actorOptions?: import("@dfinity/agent").ActorConfig;
}): import("@dfinity/agent").ActorSubclass<_SERVICE>;

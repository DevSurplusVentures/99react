import { createContext, useContext, ReactNode, useMemo } from 'react';
import { HttpAgent } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import { initActorManager } from './ActorManager';

type CanisterConfig = {
  id: string;
  idlFactory: IDL.InterfaceFactory;
};

export type ICConfig<Map extends Record<string, CanisterConfig>> = {
  network: 'ic' | 'testnet';
  canisters: Map;
};

interface ICContextValue<Map extends Record<string, CanisterConfig>> {
  agent: HttpAgent;
  getCanister: <K extends keyof Map>(name: K) => Map[K];
}

const ICContext = createContext<ICContextValue<any> | null>(null);

export function ICProvider<Map extends Record<string, CanisterConfig>>({
  config,
  children,
}: {
  config: ICConfig<Map>;
  children: ReactNode;
}) {
  const agent = useMemo(
    () =>
      new HttpAgent({
        host:
          config.network === 'ic'
            ? 'https://ic0.app'
            : 'https://testnet.dfinity.network',
      }),
    [config.network]
  );

  initActorManager(agent);

  const ctx = useMemo<ICContextValue<Map>>(
    () => ({
      agent,
      getCanister: (name) => {
        const c = config.canisters[name];
        if (!c) throw new Error(`No canister config for "${String(name)}"`);
        return c;
      },
    }),
    [agent, config.canisters]
  );

  return <ICContext.Provider value={ctx}>{children}</ICContext.Provider>;
}

export function useIC<Map extends Record<string, CanisterConfig>>() {
  const ctx = useContext<ICContextValue<Map> | null>(ICContext);
  if (!ctx) {
    throw new Error('useIC must be used under an <ICProvider>');
  }
  return ctx;
}
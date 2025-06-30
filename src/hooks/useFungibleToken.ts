import { useState, useEffect } from 'react';
import { Actor } from '@dfinity/agent';
import { useAnonAgent } from '../provider/AgentProvider';
import { idlFactory as tokenIdl } from '../backend/token/service.did.js';

/**
 * useFungibleToken
 * Fetches symbol and decimals for a fungible token canister (ICRC-1 standard)
 * @param {string} canisterId
 * @returns { symbol: string|null, decimals: number|null, loading: boolean, error: any }
 */
export function useFungibleToken(canisterId : string): {
  symbol: string | null;
  decimals: number | null;
  loading: boolean;
  error: any;
  fee : BigInt | null; // Optional: if you want to fetch fee info too
} {
  const [symbol, setSymbol] = useState(null);
  const [decimals, setDecimals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fee, setFee] = useState(null); // Optional: if you want to fetch fee info too
  const anonAgent = useAnonAgent();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    
    // Create actor inside effect to use anonymous agent
    const actor = Actor.createActor<any>(tokenIdl as any, {
      agent: anonAgent,
      canisterId,
    });
    
    Promise.all([
      actor.icrc1_symbol(),
      actor.icrc1_decimals(),
      actor.icrc1_fee() 
    ])
      .then(([sym, dec, fee]) => {
        if (!cancelled) {
          setSymbol(sym);
          setDecimals(dec);
          setError(null);
          setFee(fee);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [canisterId, anonAgent]);

  return { symbol, decimals, loading, error, fee };
}

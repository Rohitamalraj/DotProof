"use client";
import { useEffect, useState } from "react";
import { addresses, monitorAbi, publicClient } from "@/lib/chain";

export interface Backing {
  reserves: bigint;
  supply: bigint;
  ratioBps: number;
  block: bigint;
}

/** Live read of BackingMonitor on the Portaldot testnet. Polls every `ms` milliseconds. */
export function useBacking(ms = 8000) {
  const [data, setData] = useState<Backing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [reserves, supply, ratio, block] = await Promise.all([
          publicClient.readContract({ address: addresses.monitor, abi: monitorAbi, functionName: "reserves" }),
          publicClient.readContract({ address: addresses.monitor, abi: monitorAbi, functionName: "supply" }),
          publicClient.readContract({ address: addresses.monitor, abi: monitorAbi, functionName: "ratioBps" }),
          publicClient.getBlockNumber(),
        ]);
        if (alive) {
          setData({ reserves, supply, ratioBps: Number(ratio), block });
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message.split("\n")[0] : "RPC error");
      }
    };
    load();
    const id = setInterval(load, ms);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [ms]);

  return { data, error, loading: !data && !error };
}

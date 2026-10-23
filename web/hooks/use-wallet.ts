"use client";
import { useCallback, useEffect, useState } from "react";
import { createWalletClient, custom, type EIP1193Provider } from "viem";
import { portaldot } from "@/lib/chain";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

const CHAIN_HEX = `0x${portaldot.id.toString(16)}`;

/** Minimal injected-wallet (MetaMask etc.) connection pinned to the Portaldot testnet. */
export function useWallet() {
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasWallet = typeof window !== "undefined" && !!window.ethereum;

  const refresh = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) return;
    try {
      const accts = (await eth.request({ method: "eth_accounts" })) as `0x${string}`[];
      setAccount(accts[0] ?? null);
      setChainId(parseInt((await eth.request({ method: "eth_chainId" })) as string, 16));
    } catch {
      /* wallet locked or unavailable */
    }
  }, []);

  useEffect(() => {
    refresh();
    const eth = window.ethereum;
    if (!eth?.on) return;
    const onAccounts = () => refresh();
    const onChain = () => refresh();
    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, [refresh]);

  const switchChain = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) return;
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_HEX }] });
    } catch (e) {
      // 4902: chain not added yet
      if ((e as { code?: number }).code === 4902 || /unrecognized|not been added/i.test(String((e as Error).message))) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: CHAIN_HEX,
              chainName: portaldot.name,
              nativeCurrency: portaldot.nativeCurrency,
              rpcUrls: portaldot.rpcUrls.default.http,
              blockExplorerUrls: [portaldot.blockExplorers.default.url],
            },
          ],
        });
      } else {
        throw e;
      }
    }
    await refresh();
  }, [refresh]);

  const connect = useCallback(async () => {
    setError(null);
    const eth = window.ethereum;
    if (!eth) {
      setError("No browser wallet found. Install MetaMask.");
      return;
    }
    try {
      await eth.request({ method: "eth_requestAccounts" });
      await switchChain();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message.split("\n")[0] : "Connection failed");
    }
  }, [refresh, switchChain]);

  const walletClient = () =>
    window.ethereum ? createWalletClient({ chain: portaldot, transport: custom(window.ethereum) }) : null;

  return {
    account,
    chainId,
    onRightChain: chainId === portaldot.id,
    hasWallet,
    error,
    connect,
    switchChain,
    walletClient,
  };
}

"use client";

import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { heliusRpcUrl } from "@/lib/helius";

// Phase 3 wires up wallet-adapter as pure metadata: a connect/disconnect
// affordance and an "owned by you" badge when the connected pubkey matches
// the scanned address. No transactions are constructed or signed in v1.
// Backpack is discovered via the Wallet Standard automatically when its
// extension is installed — no explicit adapter needed.
export function WalletProviders({ children }: { children: ReactNode }) {
  const endpoint = useMemo(() => {
    try {
      return heliusRpcUrl();
    } catch {
      // Allow the app to render even when the Helius key is missing locally.
      return "https://api.mainnet-beta.solana.com";
    }
  }, []);

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { shortAddress } from "@/lib/resolve";

// Minimal connect affordance — the upstream button ships with heavy default
// styles. We render our own to match the editorial aesthetic.
export function ConnectButton() {
  const { publicKey, connecting, disconnect, wallet } = useWallet();
  const { setVisible } = useWalletModal();

  if (publicKey) {
    const addr = publicKey.toBase58();
    return (
      <button
        type="button"
        onClick={() => disconnect().catch(() => {})}
        className="group flex items-center gap-2 text-[12px] tracking-[0.18em] uppercase text-ink hover:text-muted transition-colors focus-ring"
        title={`${wallet?.adapter.name ?? "wallet"} · ${addr}`}
      >
        <span
          aria-hidden
          className="inline-block w-1.5 h-1.5 rounded-full bg-[color:var(--score-high)]"
        />
        <span className="tabular normal-case tracking-normal text-[13px] text-ink-soft">
          {shortAddress(addr, 4, 4)}
        </span>
        <span className="text-muted-2 group-hover:text-ink transition-colors">
          disconnect
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setVisible(true)}
      disabled={connecting}
      className="text-[12px] tracking-[0.18em] uppercase text-ink-soft hover:text-ink transition-colors focus-ring disabled:opacity-40"
    >
      {connecting ? "connecting…" : "connect wallet"}
    </button>
  );
}

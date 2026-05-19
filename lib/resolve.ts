// SNS (.sol) name resolution via Bonfida + raw pubkey validation.

import { Connection, PublicKey } from "@solana/web3.js";
import { resolve as bonfidaResolve } from "@bonfida/spl-name-service";
import { heliusRpcUrl } from "./helius";

/** Returns a base58 pubkey string for any valid input — raw pubkey or `.sol`.
 *  Throws on invalid input. */
export async function resolveAddressInput(rawInput: string): Promise<string> {
  const input = rawInput.trim();
  if (!input) throw new Error("Please enter a Solana address or .sol name.");

  // .sol name
  if (input.toLowerCase().endsWith(".sol")) {
    const name = input.slice(0, -4);
    if (!name) throw new Error("That .sol name is empty.");
    const conn = new Connection(heliusRpcUrl(), "confirmed");
    try {
      const owner = await bonfidaResolve(conn, name);
      return owner.toBase58();
    } catch {
      throw new Error(`Couldn't resolve ${input}. Is it registered?`);
    }
  }

  // Raw pubkey
  try {
    const pk = new PublicKey(input);
    // Ensure it's on the ed25519 curve OR at least a valid 32-byte address.
    return pk.toBase58();
  } catch {
    throw new Error("That doesn't look like a valid Solana address.");
  }
}

export function shortAddress(addr: string, head = 4, tail = 4): string {
  if (addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

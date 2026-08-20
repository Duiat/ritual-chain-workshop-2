"use client";

import { useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { faucet, ritual } from "@/drawing/rail";

function copy(raw: string) {
  if (/has not been authorized yet/i.test(raw)) {
    return "This origin is not on the wallet sheet. Approve the loft URL in the extension, then sign again.";
  }
  if (/rejected|denied|cancel/i.test(raw)) return "Title block unsigned.";
  return raw.split("\n")[0] || "Pen jammed.";
}

export function TitleBlock({
  inked,
  offRail,
}: {
  inked: string;
  offRail: boolean;
}) {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const [note, setNote] = useState<string | null>(null);

  async function sign() {
    const c = connectors[0];
    if (!c) {
      setNote("No pen on this table.");
      return;
    }
    setNote(null);
    try {
      await connectAsync({ connector: c });
    } catch (e) {
      setNote(copy(e instanceof Error ? e.message : String(e)));
    }
  }

  return (
    <aside className="border-2 border-[var(--ink)] bg-[var(--block)] p-4 font-[family-name:var(--f-mono)] text-[11px] tracking-wide">
      <p className="text-[9px] uppercase tracking-[0.35em] text-[var(--sienna)]">Title block · 1979</p>
      <h1 className="mt-1 font-[family-name:var(--f-cond)] text-3xl font-semibold tracking-tight text-[var(--ink)]">
        The Loft
      </h1>
      <p className="mt-2 text-[var(--rule)]">File a sheet. Go home. The hatch settles it.</p>
      <div className="mt-4 border-t border-[var(--ink)]/30 pt-3">
        {isConnected ? (
          <button className="text-[var(--sienna)]" onClick={() => disconnect()}>
            {address?.slice(0, 6)}…{address?.slice(-4)}
          </button>
        ) : (
          <button
            className="w-full border border-[var(--ink)] px-2 py-1 text-[var(--ink)]"
            onClick={() => void sign()}
          >
            Sign the title block
          </button>
        )}
        {offRail && (
          <button
            className="mt-2 w-full border border-[var(--sienna)] px-2 py-1 text-[var(--sienna)]"
            onClick={() => void switchChainAsync({ chainId: ritual.id }).catch((e) => setNote(copy(e instanceof Error ? e.message : String(e))))}
          >
            Wrong sheet · rail 1979
          </button>
        )}
        {note && <p className="mt-2 text-[var(--sienna)]">{note}</p>}
        <p className="mt-3 opacity-70">safe {inked}</p>
        <a className="mt-1 block underline opacity-60" href={faucet} target="_blank" rel="noreferrer">
          faucet
        </a>
      </div>
    </aside>
  );
}

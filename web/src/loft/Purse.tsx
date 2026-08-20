"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { loftAddr } from "@/drawing/rail";
import { plotAbi } from "@/drawing/abi";
import { usePlot } from "@/hooks/usePlot";

export function Purse({ ready }: { ready: boolean }) {
  const plot = usePlot();
  const [amt, setAmt] = useState("0.4");
  return (
    <div className="border border-[var(--ink)]/25 bg-white/40 p-4">
      <h2 className="font-[family-name:var(--f-mono)] text-[10px] tracking-[0.3em] text-[var(--sienna)]">SAFE</h2>
      <p className="mt-2 text-xs opacity-70">Pays the wake and the get. Not the hatch.</p>
      <input className="mt-3 w-full border border-[var(--ink)]/30 bg-white/50 px-3 py-2" value={amt} onChange={(e) => setAmt(e.target.value)} />
      <button
        disabled={!ready || plot.busy}
        className="mt-3 w-full border border-[var(--ink)] py-2 text-sm disabled:opacity-40"
        onClick={() => {
          if (!loftAddr) return;
          void plot
            .mark({
              address: loftAddr,
              abi: plotAbi,
              functionName: "fundExecution",
              args: [400000n],
              value: parseEther(amt || "0"),
            })
            .catch(() => undefined);
        }}
      >
        Seat the safe
      </button>
      {plot.err && <p className="mt-2 text-xs text-[var(--sienna)]">{plot.err}</p>}
    </div>
  );
}

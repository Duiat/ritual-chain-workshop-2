"use client";

import { useState } from "react";
import { loftAddr, specHint } from "@/drawing/rail";
import { plotAbi } from "@/drawing/abi";
import { usePlot } from "@/hooks/usePlot";

const CMP = { gt: 0, gte: 1, lt: 2, lte: 3 } as const;

export function FileSheet({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const plot = usePlot();
  const [q, setQ] = useState("Does ETH clear 4000 on the spec?");
  const [url, setUrl] = useState(specHint);
  const [path, setPath] = useState(".price");
  const [target, setTarget] = useState("4000");
  const [cmp, setCmp] = useState<keyof typeof CMP>("gte");
  const [bet, setBet] = useState("180");
  const [delay, setDelay] = useState("60");
  const loop = /localhost|127\.0\.0\.1/i.test(url);

  return (
    <form
      className="space-y-3 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!loftAddr) return;
        void plot
          .mark({
            address: loftAddr,
            abi: plotAbi,
            functionName: "createMarket",
            args: [
              {
                question: q,
                oracleUrl: url,
                jsonPath: path,
                target: BigInt(target || "0"),
                comparator: CMP[cmp],
                bettingSeconds: BigInt(bet || "0"),
                resolveDelaySeconds: BigInt(delay || "0"),
              },
            ],
          })
          .then(onDone)
          .catch(() => undefined);
      }}
    >
      <input className="w-full border border-[var(--ink)]/30 bg-white/50 px-3 py-2" value={q} onChange={(e) => setQ(e.target.value)} />
      <input
        className="w-full border border-[var(--ink)]/30 bg-white/50 px-3 py-2 font-[family-name:var(--f-mono)] text-xs"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://…/api/spec/eth"
      />
      {loop && <p className="text-xs text-[var(--sienna)]">Loopback is DeadUrl. Tunnel the spec.</p>}
      <div className="grid grid-cols-2 gap-2">
        <input className="border border-[var(--ink)]/30 bg-white/50 px-3 py-2" value={path} onChange={(e) => setPath(e.target.value)} />
        <input className="border border-[var(--ink)]/30 bg-white/50 px-3 py-2" type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
        <select className="border border-[var(--ink)]/30 bg-white/50 px-3 py-2" value={cmp} onChange={(e) => setCmp(e.target.value as keyof typeof CMP)}>
          <option value="gte">≥ target</option>
          <option value="gt">＞ target</option>
          <option value="lt">＜ target</option>
          <option value="lte">≤ target</option>
        </select>
        <input className="border border-[var(--ink)]/30 bg-white/50 px-3 py-2" type="number" value={bet} onChange={(e) => setBet(e.target.value)} />
        <input className="border border-[var(--ink)]/30 bg-white/50 px-3 py-2" type="number" value={delay} onChange={(e) => setDelay(e.target.value)} />
      </div>
      <button
        disabled={!ready || plot.busy}
        className="w-full bg-[var(--ink)] py-2 font-[family-name:var(--f-cond)] text-lg tracking-wide text-[var(--paper)] disabled:opacity-40"
      >
        File sheet + enlist
      </button>
      {plot.err && <p className="text-xs text-[var(--sienna)]">{plot.err}</p>}
    </form>
  );
}

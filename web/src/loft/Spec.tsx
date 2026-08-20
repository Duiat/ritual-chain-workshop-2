"use client";

import { useEffect, useState } from "react";
import { specHint } from "@/drawing/rail";

export function Spec() {
  const [px, setPx] = useState<number | null>(null);
  const [edit, setEdit] = useState("4300");
  async function load() {
    try {
      const r = await fetch("/api/spec/eth", { cache: "no-store" });
      if (!r.ok) return;
      const j = (await r.json()) as { price?: number };
      if (typeof j.price === "number") setPx(j.price);
    } catch {
      /* spec stays quiet */
    }
  }
  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 5000);
    return () => clearInterval(id);
  }, []);
  const yes = (px ?? 0) >= 4000;
  return (
    <div className="border border-[var(--ink)]/25 bg-white/40 p-4">
      <h2 className="font-[family-name:var(--f-mono)] text-[10px] tracking-[0.3em] text-[var(--sienna)]">SPEC</h2>
      <div className="mt-2 flex items-end justify-between">
        <div className="font-[family-name:var(--f-cond)] text-5xl text-[var(--rule)]">{px ?? "—"}</div>
        <div className="text-right text-xs">
          vs 4000
          <div className={yes ? "text-emerald-700" : "text-[var(--sienna)]"}>{yes ? "YES" : "NO"}</div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <input className="flex-1 border border-[var(--ink)]/30 bg-white/50 px-2 py-1" value={edit} onChange={(e) => setEdit(e.target.value)} />
        <button
          className="border border-[var(--rule)] px-3 text-xs text-[var(--rule)]"
          onClick={() => {
            void fetch("/api/spec/eth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ price: Number(edit) }),
            })
              .then(load)
              .catch(() => undefined);
          }}
        >
          Hatch
        </button>
      </div>
      <p className="mt-2 break-all font-[family-name:var(--f-mono)] text-[10px] opacity-50">
        {specHint || "tunnel /api/spec/eth before live"}
      </p>
    </div>
  );
}

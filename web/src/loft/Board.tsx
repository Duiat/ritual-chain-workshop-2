"use client";

import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useReadContract } from "wagmi";
import { loftAddr } from "@/drawing/rail";
import { plotAbi } from "@/drawing/abi";
import { usePlot } from "@/hooks/usePlot";

const MARK = ["＞", "≥", "＜", "≤"] as const;
const PHASE = ["OPEN", "ISSUE", "READING", "INKED", "VOID"] as const;

export type Sheet = {
  id: bigint;
  creator: `0x${string}`;
  question: string;
  oracleUrl: string;
  jsonPath: string;
  target: bigint;
  comparator: number;
  closeBlock: bigint;
  resolveBlock: bigint;
  scheduleId: bigint;
  totalYes: bigint;
  totalNo: bigint;
  state: number;
  outcome: number;
  attempts: number;
  observedValue: bigint;
  invalidReason: string;
};

function rit(n?: bigint) {
  if (n === undefined) return "—";
  return `${Number(formatEther(n)).toFixed(3)} RIT`;
}

export function Board({
  rows,
  me,
  ready,
  onDone,
}: {
  rows: Sheet[];
  me?: `0x${string}`;
  ready: boolean;
  onDone: () => void;
}) {
  if (rows.length === 0) return <p className="text-sm opacity-60">No sheets filed.</p>;
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <Card key={r.id.toString()} row={r} me={me} ready={ready} onDone={onDone} />
      ))}
    </div>
  );
}

function Card({
  row,
  me,
  ready,
  onDone,
}: {
  row: Sheet;
  me?: `0x${string}`;
  ready: boolean;
  onDone: () => void;
}) {
  const plot = usePlot();
  const [stake, setStake] = useState("0.04");
  const pool = row.totalYes + row.totalNo;
  const yesPct = pool === 0n ? 50 : Number((row.totalYes * 1000n) / pool) / 10;
  const { data: mine } = useReadContract({
    address: loftAddr,
    abi: plotAbi,
    functionName: "stakesOf",
    args: me ? [row.id, me] : undefined,
    query: { enabled: Boolean(loftAddr && me) },
  });
  const [, , settled, claimable] = (mine as readonly [bigint, bigint, boolean, bigint] | undefined) ?? [
    0n, 0n, false, 0n,
  ];
  function act(name: string, args: readonly unknown[], value?: bigint) {
    if (!loftAddr) return;
    void plot.mark({ address: loftAddr, abi: plotAbi, functionName: name, args, value }).then(onDone).catch(() => undefined);
  }
  return (
    <article className="border border-[var(--ink)]/25 bg-white/50 p-4">
      <div className="flex justify-between gap-3">
        <h3 className="font-[family-name:var(--f-cond)] text-xl">{row.question}</h3>
        <span className="font-[family-name:var(--f-mono)] text-[10px] text-[var(--sienna)]">
          {PHASE[row.state]} {row.outcome === 1 ? "YES" : row.outcome === 2 ? "NO" : ""}
        </span>
      </div>
      <div className="mt-3 h-[3px] bg-[var(--ink)]/10">
        <div className="h-[3px] bg-[var(--rule)]" style={{ width: `${yesPct}%` }} />
      </div>
      <p className="mt-2 font-[family-name:var(--f-mono)] text-[11px] opacity-70">
        hatch {MARK[row.comparator]} {row.target.toString()} · {rit(row.totalYes)} YES / {rit(row.totalNo)} NO
      </p>
      {row.state === 0 && (
        <div className="mt-3 flex gap-2">
          <input className="w-24 border border-[var(--ink)]/30 bg-white/60 px-2 text-sm" value={stake} onChange={(e) => setStake(e.target.value)} />
          <button
            disabled={!ready || plot.busy}
            className="flex-1 bg-emerald-800 py-1 text-sm text-white disabled:opacity-40"
            onClick={() => act("bet", [row.id, true], parseEther(stake || "0"))}
          >
            YES
          </button>
          <button
            disabled={!ready || plot.busy}
            className="flex-1 bg-[var(--sienna)] py-1 text-sm text-white disabled:opacity-40"
            onClick={() => act("bet", [row.id, false], parseEther(stake || "0"))}
          >
            NO
          </button>
        </div>
      )}
      {row.state === 3 && !settled && claimable > 0n && (
        <button className="mt-3 w-full border border-[var(--ink)] py-1 text-sm" disabled={!ready || plot.busy} onClick={() => act("claimWinnings", [row.id])}>
          Collect {rit(claimable)}
        </button>
      )}
      {row.state === 4 && !settled && claimable > 0n && (
        <button className="mt-3 w-full border border-[var(--ink)]/40 py-1 text-sm" disabled={!ready || plot.busy} onClick={() => act("claimRefund", [row.id])}>
          Void {rit(claimable)}
        </button>
      )}
      {plot.err && <p className="mt-2 text-xs text-[var(--sienna)]">{plot.err}</p>}
    </article>
  );
}

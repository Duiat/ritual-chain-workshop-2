"use client";

import { formatEther } from "viem";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { loftAddr, ritual } from "@/drawing/rail";
import { plotAbi } from "@/drawing/abi";
import { TitleBlock } from "@/loft/TitleBlock";
import { FileSheet } from "@/loft/FileSheet";
import { Purse } from "@/loft/Purse";
import { Spec } from "@/loft/Spec";
import { Board, type Sheet } from "@/loft/Board";

function rit(n?: bigint) {
  if (n === undefined) return "—";
  return `${Number(formatEther(n)).toFixed(3)} RIT`;
}

export default function LoftPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const wired = Boolean(loftAddr);
  const offRail = isConnected && chainId !== ritual.id;
  const ready = isConnected && wired && !offRail;

  const { data: rows, refetch } = useReadContract({
    address: loftAddr,
    abi: plotAbi,
    functionName: "getMarkets",
    query: { enabled: wired, refetchInterval: 6500 },
  });
  const { data: safe } = useReadContract({
    address: loftAddr,
    abi: plotAbi,
    functionName: "executionBalance",
    query: { enabled: wired, refetchInterval: 9000 },
  });
  const list = (rows as Sheet[] | undefined) ?? [];

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_17rem]">
      <main>
        <p className="font-[family-name:var(--f-mono)] text-[10px] tracking-[0.4em] text-[var(--sienna)]">
          SHEET 01 · RITUAL
        </p>
        <h2 className="mt-1 font-[family-name:var(--f-cond)] text-5xl tracking-tight">File a sheet</h2>
        {!wired && (
          <p className="mt-4 border border-[var(--sienna)]/50 bg-white/50 px-3 py-2 text-sm">
            After deploy, set NEXT_PUBLIC_PREDICT_ADDRESS in web/.env.local.
          </p>
        )}
        <section className="mt-6 border border-[var(--ink)]/20 bg-white/35 p-5">
          <FileSheet ready={ready} onDone={() => void refetch()} />
        </section>
        <section className="mt-10">
          <h2 className="font-[family-name:var(--f-mono)] text-[10px] tracking-[0.3em] text-[var(--sienna)]">BOARD</h2>
          <div className="mt-3">
            <Board rows={list} me={address} ready={ready} onDone={() => void refetch()} />
          </div>
        </section>
      </main>
      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <TitleBlock inked={rit(safe as bigint | undefined)} offRail={offRail} />
        <Purse ready={ready} />
        <Spec />
      </div>
    </div>
  );
}

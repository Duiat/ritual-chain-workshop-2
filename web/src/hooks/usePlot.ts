"use client";
import { useCallback, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import type { Abi, Address } from "viem";

export function usePlot() {
  const { writeContractAsync, data: hash } = useWriteContract();
  const { isLoading } = useWaitForTransactionReceipt({ hash });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mark = useCallback(
    async (p: {
      address: Address;
      abi: Abi | readonly unknown[];
      functionName: string;
      args?: readonly unknown[];
      value?: bigint;
    }) => {
      setErr(null);
      setBusy(true);
      try {
        return await writeContractAsync(p as never);
      } catch (e) {
        const m = e instanceof Error ? e.message.split("\n")[0] : "refused";
        setErr(m ?? "refused");
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [writeContractAsync],
  );
  return { mark, hash, err, busy: busy || isLoading };
}

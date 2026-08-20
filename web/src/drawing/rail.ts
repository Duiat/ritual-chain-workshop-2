import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";
import type { Address } from "viem";

export const railId = Number(process.env.NEXT_PUBLIC_RITUAL_CHAIN_ID ?? "1979");
export const rpc = process.env.NEXT_PUBLIC_RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org";
const raw = process.env.NEXT_PUBLIC_PREDICT_ADDRESS?.trim();
export const loftAddr: Address | undefined =
  raw && /^0x[0-9a-fA-F]{40}$/.test(raw) ? (raw as Address) : undefined;
export const faucet = "https://faucet.ritualfoundation.org";
export const specHint = process.env.NEXT_PUBLIC_SPEC_URL?.trim() ?? "";

export const ritual = defineChain({
  id: railId,
  name: "Ritual",
  nativeCurrency: { name: "Ritual", symbol: "RITUAL", decimals: 18 },
  rpcUrls: { default: { http: [rpc] } },
  blockExplorers: { default: { name: "scan", url: "https://explorer.ritualfoundation.org" } },
});

export const cfg = createConfig({
  chains: [ritual],
  connectors: [injected({ shimDisconnect: true })],
  multiInjectedProviderDiscovery: false,
  ssr: true,
  transports: { [ritual.id]: http(rpc) },
});

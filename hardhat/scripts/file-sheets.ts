/**
 * File four independent sheets on a live loft.
 *
 *   PREDICT_ADDRESS=0x... ORACLE_URL=https://.../spec.json \
 *     pnpm exec hardhat run scripts/file-sheets.ts
 */
import { connectRitual, explorerTx } from "./ritual.ts";

const address = process.env.PREDICT_ADDRESS;
if (!address) throw new Error("Set PREDICT_ADDRESS to the deployed loft.");

const oracleUrl = process.env.ORACLE_URL ?? "";
if (!oracleUrl.startsWith("https://") && !oracleUrl.startsWith("http://")) {
  throw new Error("ORACLE_URL must be public. The TEE cannot reach this desk.");
}
if (oracleUrl.includes("localhost") || oracleUrl.includes("127.0.0.1")) {
  throw new Error("Loopback is DeadUrl. Point the spec at a public URL.");
}

const sheets = [
  {
    question: "Does ETH clear 4000 on the spec?",
    jsonPath: ".price",
    target: 4000n,
    comparator: 1,
    bettingSeconds: 180n,
    resolveDelaySeconds: 60n,
  },
  {
    question: "Is the plot still under 7500 at issue?",
    jsonPath: ".price",
    target: 7500n,
    comparator: 2,
    bettingSeconds: 240n,
    resolveDelaySeconds: 90n,
  },
  {
    question: "Does BTC hatch past 48000?",
    jsonPath: ".btc",
    target: 48000n,
    comparator: 1,
    bettingSeconds: 300n,
    resolveDelaySeconds: 120n,
  },
  {
    question: "Does the slow mark stay at 1?",
    jsonPath: ".slow",
    target: 1n,
    comparator: 1,
    bettingSeconds: 360n,
    resolveDelaySeconds: 90n,
  },
] as const;

const { connection, publicClient, viem } = await connectRitual();
const predict = await viem.getContractAt("RitualPredict", address as `0x${string}`);

const executionBalance = await predict.read.executionBalance();
if (executionBalance === 0n) {
  console.warn("! Safe is empty — the wake will skip. fundExecution first.");
}

for (const s of sheets) {
  const params = { ...s, oracleUrl };
  console.log(`File: ${params.question}`);
  const hash = await predict.write.createMarket([params]);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const id = await predict.read.marketCount();
  const row = await predict.read.getMarket([id]);
  console.log(`  sheet #${id}  close ${row.closeBlock}  wake ${row.resolveBlock}`);
  console.log(`  ${explorerTx(hash)}  block ${receipt.blockNumber}`);
}

const board = await predict.read.getMarkets();
const live = await predict.read.liveSheets();
console.log(`Board ${board.length} · live ${live.length}`);

await connection.close();

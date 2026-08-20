/**
 * Paint dummies onto Ritual slots, deploy the loft, file four sheets.
 *
 *   pnpm exec hardhat node --chain-id 1979
 *   pnpm exec hardhat run scripts/open-loft.ts
 */
import { network } from "hardhat";
import { getAddress, parseEther, stringToHex } from "viem";

const WAKE = "0x56e776BAE2DD60664b69Bd5F865F1180ffB7D58B" as const;
const SAFE = "0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948" as const;
const CREW = "0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F" as const;
const GET = "0x0000000000000000000000000000000000000801" as const;
const HATCH = "0x0000000000000000000000000000000000000803" as const;
const NODE = getAddress("0x0000000000000000000000000000000000000ccc");

const sheets = [
  {
    question: "Does ETH clear 4000 on the spec?",
    oracleUrl: "https://spec.example/eth",
    jsonPath: ".price",
    target: 4000n,
    comparator: 1,
    bettingSeconds: 180n,
    resolveDelaySeconds: 60n,
  },
  {
    question: "Is the plot still under 7500 at issue?",
    oracleUrl: "https://spec.example/eth",
    jsonPath: ".price",
    target: 7500n,
    comparator: 2,
    bettingSeconds: 240n,
    resolveDelaySeconds: 90n,
  },
  {
    question: "Does BTC hatch past 48000?",
    oracleUrl: "https://spec.example/btc",
    jsonPath: ".btc",
    target: 48000n,
    comparator: 1,
    bettingSeconds: 300n,
    resolveDelaySeconds: 120n,
  },
  {
    question: "Does the slow mark stay at 1?",
    oracleUrl: "https://spec.example/slow",
    jsonPath: ".slow",
    target: 1n,
    comparator: 1,
    bettingSeconds: 360n,
    resolveDelaySeconds: 90n,
  },
] as const;

const connection = await network.create({ network: "loft", chainType: "l1" });
const { viem } = connection;
const pub = await viem.getPublicClient();
const test = await viem.getTestClient();

async function paint(name: string, addr: `0x${string}`) {
  const d = await viem.deployContract(name);
  const code = await pub.getCode({ address: d.address });
  if (!code || code === "0x") throw new Error(`no bytecode for ${name}`);
  await test.setCode({ address: addr, bytecode: code });
  return viem.getContractAt(name, addr);
}

const crew = await paint("DummyCrew", CREW);
const get = await paint("DummyGet", GET);
const hatch = await paint("DummyHatch", HATCH);
await paint("DummyWake", WAKE);
await paint("DummySafe", SAFE);
await crew.write.plug([NODE, true]);
await get.write.load([200, stringToHex('{"price":4300,"btc":97100,"slow":1}'), ""]);
await hatch.write.fix([4300n]);

const plot = await viem.deployContract("RitualPredict", [1000n]);
await plot.write.fundExecution([20_000n], { value: parseEther("1") });

for (const s of sheets) {
  const hash = await plot.write.createMarket([s]);
  await pub.waitForTransactionReceipt({ hash });
  const id = await plot.read.marketCount();
  const row = await plot.read.getMarket([id]);
  console.log(`sheet #${id}  ${s.question}`);
  console.log(`  close ${row.closeBlock}  wake ${row.resolveBlock}`);
}

const board = await plot.read.getMarkets();
const live = await plot.read.liveSheets();
console.log(`LOFT=${plot.address}`);
console.log(`BOARD=${board.length} LIVE=${live.length}`);

await connection.close();

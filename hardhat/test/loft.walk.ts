import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { getAddress, parseEther, stringToHex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const WAKE = "0x56e776BAE2DD60664b69Bd5F865F1180ffB7D58B" as const;
const SAFE = "0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948" as const;
const CREW = "0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F" as const;
const GET = "0x0000000000000000000000000000000000000801" as const;
const HATCH = "0x0000000000000000000000000000000000000803" as const;
const NODE = getAddress("0x0000000000000000000000000000000000000ccc");

describe("loft walks", async function () {
  const { viem, networkHelpers } = await network.create();
  const pub = await viem.getPublicClient();
  const test = await viem.getTestClient();
  const rioA = privateKeyToAccount(generatePrivateKey());
  const niaA = privateKeyToAccount(generatePrivateKey());
  await test.setBalance({ address: rioA.address, value: parseEther("90") });
  await test.setBalance({ address: niaA.address, value: parseEther("90") });
  const rio = await viem.getWalletClient(rioA);
  const nia = await viem.getWalletClient(niaA);

  async function paint(name: string, addr: `0x${string}`) {
    const d = await viem.deployContract(name);
    const code = await pub.getCode({ address: d.address });
    assert.ok(code && code !== "0x", name);
    await test.setCode({ address: addr, bytecode: code });
    return viem.getContractAt(name, addr);
  }

  async function loft() {
    const wake = await paint("DummyWake", WAKE);
    await paint("DummySafe", SAFE);
    const crew = await paint("DummyCrew", CREW);
    const get = await paint("DummyGet", GET);
    const hatch = await paint("DummyHatch", HATCH);
    await crew.write.plug([NODE, true]);
    await get.write.load([200, stringToHex('{"price":4300,"btc":97100,"slow":1}'), ""]);
    await hatch.write.fix([4300n]);
    const plot = await viem.deployContract("RitualPredict", [1000n]);
    await plot.write.fundExecution([20n], { value: parseEther("1") });
    return { plot, wake, get };
  }

  const sheet = {
    question: "Does ETH clear 4000 on the spec?",
    oracleUrl: "https://spec.example/eth",
    jsonPath: ".price",
    target: 4000n,
    comparator: 1,
    bettingSeconds: 30n,
    resolveDelaySeconds: 15n,
  } as const;

  it("rio 5 yes vs nia 2 no walks with 7", async function () {
    const { plot, wake } = await loft();
    await plot.write.createMarket([sheet]);
    const id = await plot.read.marketCount();
    await plot.write.bet([id, true], { account: rio.account, value: parseEther("5") });
    await plot.write.bet([id, false], { account: nia.account, value: parseEther("2") });
    const row = await plot.read.getMarket([id]);
    const now = await pub.getBlockNumber();
    if (row.resolveBlock > now) await networkHelpers.mine(Number(row.resolveBlock - now));
    await wake.write.nudge([row.scheduleId, 0n]);
    const done = await plot.read.getMarket([id]);
    assert.equal(done.state, 3);
    assert.equal(done.outcome, 1);
    const before = await pub.getBalance({ address: rio.account.address });
    const h = await plot.write.claimWinnings([id], { account: rio.account });
    const rec = await pub.waitForTransactionReceipt({ hash: h });
    const after = await pub.getBalance({ address: rio.account.address });
    assert.equal(after + rec.gasUsed * rec.effectiveGasPrice - before, parseEther("7"));
  });

  it("three muted gets void and refund 3", async function () {
    const { plot, wake, get } = await loft();
    await get.write.silence([true]);
    await plot.write.createMarket([sheet]);
    const id = await plot.read.marketCount();
    await plot.write.bet([id, true], { account: rio.account, value: parseEther("3") });
    const row = await plot.read.getMarket([id]);
    const now = await pub.getBlockNumber();
    if (row.resolveBlock > now) await networkHelpers.mine(Number(row.resolveBlock - now));
    await wake.write.nudge([row.scheduleId, 0n]);
    await wake.write.nudge([row.scheduleId, 1n]);
    await wake.write.nudge([row.scheduleId, 2n]);
    assert.equal((await plot.read.getMarket([id])).state, 4);
    const before = await pub.getBalance({ address: rio.account.address });
    const h = await plot.write.claimRefund([id], { account: rio.account });
    const rec = await pub.waitForTransactionReceipt({ hash: h });
    const after = await pub.getBalance({ address: rio.account.address });
    assert.equal(after + rec.gasUsed * rec.effectiveGasPrice - before, parseEther("3"));
  });

  it("four sheets: ring 1, the other three still sell", async function () {
    const { plot, wake } = await loft();
    const late = { ...sheet, question: "Late sheet under 7500?", target: 7500n, bettingSeconds: 400n };
    const btc = { ...sheet, question: "BTC hatch past 48000?", jsonPath: ".btc", target: 48000n, bettingSeconds: 400n };
    const slow = { ...sheet, question: "Slow mark stay at 1?", jsonPath: ".slow", target: 1n, bettingSeconds: 400n };
    await plot.write.createMarket([sheet]);
    const a = await plot.read.marketCount();
    await plot.write.createMarket([late]);
    const b = await plot.read.marketCount();
    await plot.write.createMarket([btc]);
    const c = await plot.read.marketCount();
    await plot.write.createMarket([slow]);
    const d = await plot.read.marketCount();
    await plot.write.bet([a, true], { account: rio.account, value: parseEther("4") });
    await plot.write.bet([b, false], { account: nia.account, value: parseEther("1") });
    await plot.write.bet([c, true], { account: rio.account, value: parseEther("2") });
    const row = await plot.read.getMarket([a]);
    const now = await pub.getBlockNumber();
    if (row.resolveBlock > now) await networkHelpers.mine(Number(row.resolveBlock - now));
    await wake.write.nudge([row.scheduleId, 0n]);
    assert.equal((await plot.read.getMarket([a])).state, 3);
    assert.equal((await plot.read.getMarket([b])).state, 0);
    assert.equal((await plot.read.getMarket([b])).totalNo, parseEther("1"));
    assert.equal((await plot.read.getMarket([c])).totalYes, parseEther("2"));
    assert.equal((await plot.read.getMarket([d])).totalYes, 0n);
    const board = await plot.read.getMarkets();
    assert.equal(board.length, 4);
    const live = await plot.read.liveSheets();
    assert.equal(live.length, 3);
  });
});

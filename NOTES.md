# What I ran

From `hardhat/`:

```
pnpm exec hardhat test
```

Expect **35 passing** (32 in `PlotSuite`, 3 in `loft.walk.ts`).

Walk A: Rio 5 YES, Nia 2 NO, spec 4300, target 4000 → Rio walks with 7.
Walk B: mute the get three times → void, Rio gets 3 back.
Walk C: four sheets on the board. Ring sheet 1; the other three still sell their own ink.

Web:

```
cd web && pnpm dev
```

Spec printer is `/api/spec/eth`. Loopback on a sheet is `DeadUrl`. Tunnel it, or use `spec.json` on this repo.

Four sheets after a 1979 deploy:

```
PREDICT_ADDRESS=0x... ORACLE_URL=https://raw.githubusercontent.com/<you>/ritual-chain-workshop-2/main/spec.json
pnpm exec hardhat run scripts/file-sheets.ts
```

Local rail:

```
pnpm exec hardhat node --chain-id 1979
pnpm exec hardhat run scripts/open-loft.ts
```

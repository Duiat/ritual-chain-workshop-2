let mark = 4300;
let drawn = Date.now();

export function spec() {
  return { price: mark, btc: 97100, slow: 1, symbol: "ETHUSD", ts: drawn, drawn: "loft" };
}

export function hatch(n: number) {
  if (!Number.isFinite(n) || n < 0) throw new Error("crooked hatch");
  mark = Math.round(n);
  drawn = Date.now();
  return spec();
}

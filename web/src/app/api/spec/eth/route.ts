import { NextResponse } from "next/server";
import { hatch, spec } from "@/drawing/ink";

export async function GET() {
  return NextResponse.json(spec(), { headers: { "Cache-Control": "no-store" } });
}
export async function POST(req: Request) {
  try {
    const b = (await req.json()) as { price?: unknown };
    return NextResponse.json(hatch(Number(b.price)));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "crooked" }, { status: 400 });
  }
}

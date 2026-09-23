import { NextResponse } from "next/server";
import type { MockVideoResponse } from "@/lib/domain";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    shotId?: string;
    startFrameUrl?: string;
    endFrameUrl?: string;
    prompt?: string;
  };

  if (!body.shotId || !body.startFrameUrl || !body.endFrameUrl || !body.prompt?.trim()) {
    return NextResponse.json({ error: "Shot, both keyframes, and a video prompt are required." }, { status: 400 });
  }

  await new Promise((resolve) => setTimeout(resolve, 700));
  const result: MockVideoResponse = {
    id: `mock_${body.shotId}_${Date.now()}`,
    status: "SUCCEEDED",
    mock: true,
    generatedAt: new Date().toISOString(),
    duration: 5,
  };
  return NextResponse.json(result);
}

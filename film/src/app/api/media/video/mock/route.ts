import { NextResponse } from "next/server";
import type { FrameStrategy, MockVideoResponse } from "@/lib/domain";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    shotId?: string;
    startFrameUrl?: string;
    endFrameUrl?: string;
    prompt?: string;
    frameStrategy?: FrameStrategy;
    inheritedFromShotId?: string;
  };

  if (!body.shotId || !body.startFrameUrl || !body.prompt?.trim()) {
    return NextResponse.json({ error: "Shot, a reference frame, and a video prompt are required." }, { status: 400 });
  }
  if (body.frameStrategy === "CONTINUOUS_KEYFRAMES" && !body.endFrameUrl) {
    return NextResponse.json({ error: "Continuous shots require both keyframes." }, { status: 400 });
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

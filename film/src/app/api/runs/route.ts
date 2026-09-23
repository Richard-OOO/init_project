import { NextResponse } from "next/server";
import type { StartRunResponse } from "@/lib/domain";
import { planShots } from "@/lib/dashscope";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { title?: string; story?: string };
    if (!body.story?.trim()) return NextResponse.json({ error: "Story text is required." }, { status: 400 });
    const now = new Date();
    const plan = await planShots(body.story.trim());
    const response: StartRunResponse = {
      projectId: `film_${now.getTime()}`,
      title: body.title?.trim() || "Untitled film",
      agents: [
        { id: "story_agent", name: "Story Agent", capability: "story understanding", status: "idle", taskId: "task_plan" },
        { id: "shot_agent", name: "Shot Agent", capability: "visual planning", status: "idle", taskId: "task_plan" },
        { id: "frame_agent", name: "Frame Agent", capability: "start/end frame generation", status: "waiting" },
        { id: "video_agent", name: "Video Agent", capability: "mock video rendering", status: "waiting" },
      ],
      tasks: [{ id: "task_plan", type: "EXTRACT_CHUNK", title: "Understand story and propose three connected shots", capability: "story+shot", status: "SUCCEEDED", agentId: "shot_agent" }],
      trace: [
        { id: "trace_1", type: "TASK_CREATED", actor: "Scheduler", message: "Created the story-to-shot planning task.", timestamp: now.toISOString() },
        { id: "trace_2", type: "AGENT_MESSAGE", actor: "Story Agent -> Shot Agent", message: "Shared the story interpretation and requested three connected five-second shots.", timestamp: new Date(now.getTime() + 1).toISOString() },
        { id: "trace_3", type: "STATE_PROPOSED", actor: "Shot Agent", message: "Proposed three shots with editable start-frame, end-frame, and video prompts.", timestamp: new Date(now.getTime() + 2).toISOString() },
      ],
      proposal: { ...plan, needsReview: true },
    };
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Planning failed." }, { status: 502 });
  }
}

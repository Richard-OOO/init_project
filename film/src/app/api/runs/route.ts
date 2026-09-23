import { NextResponse } from "next/server";
import type { StartRunResponse } from "@/lib/domain";

export async function POST(request: Request) {
  const body = (await request.json()) as { title?: string; story?: string };

  if (!body.story?.trim()) {
    return NextResponse.json({ error: "Story text is required." }, { status: 400 });
  }

  const chunks = body.story
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .slice(0, 4);
  const effectiveChunks = chunks.length > 1 ? chunks : [body.story.slice(0, Math.ceil(body.story.length / 2)), body.story.slice(Math.ceil(body.story.length / 2))];
  const now = new Date();

  const response: StartRunResponse = {
    projectId: `film_${now.getTime()}`,
    title: body.title?.trim() || "Untitled film",
    agents: effectiveChunks.map((_, index) => ({
      id: `reader_${index + 1}`,
      name: `Reader ${String(index + 1).padStart(2, "0")}`,
      capability: "story extraction",
      status: index < 2 ? "working" : "waiting",
      taskId: `task_${index + 1}`,
    })),
    tasks: effectiveChunks.map((_, index) => ({
      id: `task_${index + 1}`,
      type: "EXTRACT_CHUNK",
      title: `Analyze story chunk ${index + 1}`,
      capability: "reader",
      status: index < 2 ? "RUNNING" : "READY",
      agentId: index < 2 ? `reader_${index + 1}` : undefined,
    })),
    trace: [
      {
        id: "trace_1",
        type: "TASK_CREATED",
        actor: "Scheduler",
        message: `Created ${effectiveChunks.length} extraction tasks from the submitted story.`,
        timestamp: now.toISOString(),
      },
      {
        id: "trace_2",
        type: "AGENT_MESSAGE",
        actor: "Reader 01",
        message: "Claimed the first available story chunk through capability matching.",
        timestamp: new Date(now.getTime() + 1000).toISOString(),
      },
    ],
    proposal: {
      logline: "A young archivist follows a fading signal into an abandoned observatory and discovers it was sent by her future self.",
      characters: [
        { name: "Lin", role: "Archivist and protagonist", evidence: "Paragraph 1" },
        { name: "Future Lin", role: "Source of the signal", evidence: "Paragraph 3" },
      ],
      needsReview: true,
    },
  };

  return NextResponse.json(response);
}

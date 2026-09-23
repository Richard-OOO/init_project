export type TaskStatus = "READY" | "RUNNING" | "SUCCEEDED" | "BLOCKED";

export type Agent = {
  id: string;
  name: string;
  capability: string;
  status: "idle" | "working" | "waiting";
  taskId?: string;
};

export type SwarmTask = {
  id: string;
  type: "EXTRACT_CHUNK" | "RECHECK_EVIDENCE";
  title: string;
  capability: string;
  status: TaskStatus;
  agentId?: string;
};

export type TraceEvent = {
  id: string;
  type: "TASK_CREATED" | "TASK_STARTED" | "AGENT_MESSAGE" | "STATE_PROPOSED" | "HUMAN_APPROVED" | "ASSET_GENERATED";
  actor: string;
  message: string;
  timestamp: string;
};

export type StoryProposal = {
  logline: string;
  characters: Array<{ name: string; role: string; evidence: string }>;
  shots: ShotProposal[];
  needsReview: boolean;
};

export type ShotProposal = {
  id: string;
  order: number;
  title: string;
  action: string;
  camera: string;
  startFramePrompt: string;
  endFramePrompt: string;
  videoPrompt: string;
};

export type StartRunResponse = {
  projectId: string;
  title: string;
  agents: Agent[];
  tasks: SwarmTask[];
  trace: TraceEvent[];
  proposal: StoryProposal;
};

export type ImageGenerationResponse = { imageUrl: string; requestId?: string };

export type MockVideoResponse = {
  id: string;
  status: "SUCCEEDED";
  mock: true;
  generatedAt: string;
  duration: number;
};

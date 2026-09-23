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
  type: "TASK_CREATED" | "TASK_STARTED" | "AGENT_MESSAGE" | "STATE_PROPOSED" | "HUMAN_APPROVED";
  actor: string;
  message: string;
  timestamp: string;
};

export type StoryProposal = {
  logline: string;
  characters: Array<{ name: string; role: string; evidence: string }>;
  needsReview: boolean;
};

export type StartRunResponse = {
  projectId: string;
  title: string;
  agents: Agent[];
  tasks: SwarmTask[];
  trace: TraceEvent[];
  proposal: StoryProposal;
};

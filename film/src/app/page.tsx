"use client";

import { useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  Activity,
  Bot,
  Check,
  ChevronRight,
  CirclePause,
  CirclePlay,
  Clapperboard,
  FileText,
  GitBranch,
  Image as ImageIcon,
  LoaderCircle,
  MessageSquareText,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  Send,
  Sparkles,
  UserRoundCheck,
  Video,
} from "lucide-react";
import type { ImageGenerationResponse, MockVideoResponse, ShotProposal, StartRunResponse, TraceEvent } from "@/lib/domain";

gsap.registerPlugin(useGSAP);

const sampleStory = `林是一名修复旧磁带的档案员。一个雨夜，她在一卷没有编号的磁带里听见了自己的声音，要求她前往城外废弃的天文台。\n\n她带着磁带抵达天文台，发现穹顶下的设备仍在运行。信号每隔十分钟重复一次，每次都准确预告她接下来的动作。\n\n最后一段信号来自十年后的林。未来的她请求今晚的自己关闭设备，否则这座城市会永远困在同一个雨夜。`;

const steps = ["理解", "整合", "故事审查", "镜头规划", "媒体生成", "视频审查", "剪辑"];

type ShotAssetState = {
  startFrameUrl?: string;
  endFrameUrl?: string;
  video?: MockVideoResponse;
  status: "idle" | "start" | "end" | "all";
};

export default function Workspace() {
  const [title, setTitle] = useState("雨夜信号");
  const [story, setStory] = useState(sampleStory);
  const [run, setRun] = useState<StartRunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [approved, setApproved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [selectedShotId, setSelectedShotId] = useState("");
  const [shotAssets, setShotAssets] = useState<Record<string, ShotAssetState>>({});
  const workspaceRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    gsap.from(".panel", { autoAlpha: 0, y: 10, duration: 0.35, stagger: 0.05, ease: "power2.out" });
  }, { scope: workspaceRef });

  useGSAP(() => {
    if (!run) return;
    gsap.fromTo(".trace-event:last-of-type", { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: 0.3, ease: "power2.out" });
  }, { scope: workspaceRef, dependencies: [run?.trace.length], revertOnUpdate: false });

  useGSAP(() => {
    if (!selectedShotId) return;
    gsap.fromTo(".shot-editor", { autoAlpha: 0, x: 8 }, { autoAlpha: 1, x: 0, duration: 0.25, ease: "power2.out" });
  }, { scope: workspaceRef, dependencies: [selectedShotId], revertOnUpdate: true });

  function appendTrace(event: Omit<TraceEvent, "id" | "timestamp">) {
    setRun((current) => current ? {
      ...current,
      trace: [...current.trace, { ...event, id: `trace_${Date.now()}`, timestamp: new Date().toISOString() }],
    } : current);
  }

  async function api<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    const data = (await response.json()) as T & { error?: string };
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  }

  async function startRun() {
    setLoading(true);
    setError("");
    setApproved(false);
    setShotAssets({});
    try {
      const data = await api<StartRunResponse>("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, story }),
      });
      setRun(data);
      setSelectedShotId(data.proposal.shots[0]?.id || "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Planning failed.");
    } finally {
      setLoading(false);
    }
  }

  function approveStory() {
    if (!run) return;
    const event: TraceEvent = {
      id: `trace_${Date.now()}`,
      type: "HUMAN_APPROVED",
      actor: "Human Director",
      message: "Approved the story proposal. Shot planning is now unblocked.",
      timestamp: new Date().toISOString(),
    };
    setRun({ ...run, trace: [...run.trace, event], proposal: { ...run.proposal, needsReview: false } });
    setApproved(true);
  }

  function updateShot(shotId: string, patch: Partial<ShotProposal>) {
    if (!run) return;
    setRun({
      ...run,
      proposal: {
        ...run.proposal,
        shots: run.proposal.shots.map((shot) => shot.id === shotId ? { ...shot, ...patch } : shot),
      },
    });
  }

  function updateAssets(shotId: string, patch: Partial<ShotAssetState>) {
    setShotAssets((current) => ({
      ...current,
      [shotId]: { ...(current[shotId] || { status: "idle" }), ...patch },
    }));
  }

  async function requestImage(prompt: string) {
    return api<ImageGenerationResponse>("/api/media/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
  }

  async function createFrame(shot: ShotProposal, frame: "start" | "end") {
    setError("");
    updateAssets(shot.id, { status: frame, video: undefined });
    try {
      const result = await requestImage(frame === "start" ? shot.startFramePrompt : shot.endFramePrompt);
      updateAssets(shot.id, frame === "start" ? { startFrameUrl: result.imageUrl } : { endFrameUrl: result.imageUrl });
      appendTrace({ type: "ASSET_GENERATED", actor: "Frame Agent", message: `Generated ${shot.id} ${frame} frame with qwen-image-3.0.` });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Image generation failed.");
    } finally {
      updateAssets(shot.id, { status: "idle" });
    }
  }

  async function generateShot(shot: ShotProposal) {
    setError("");
    updateAssets(shot.id, { status: "all", video: undefined });
    try {
      const [start, end] = await Promise.all([
        requestImage(shot.startFramePrompt),
        requestImage(shot.endFramePrompt),
      ]);
      updateAssets(shot.id, { startFrameUrl: start.imageUrl, endFrameUrl: end.imageUrl });
      const video = await api<MockVideoResponse>("/api/media/video/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shotId: shot.id, startFrameUrl: start.imageUrl, endFrameUrl: end.imageUrl, prompt: shot.videoPrompt }),
      });
      updateAssets(shot.id, { video });
      appendTrace({ type: "AGENT_MESSAGE", actor: "Frame Agent -> Video Agent", message: `${shot.id} supplied two frames and an edited video prompt.` });
      appendTrace({ type: "ASSET_GENERATED", actor: "Video Agent (Mock)", message: `Completed a deterministic 5-second mock render for ${shot.id}.` });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Shot generation failed.");
    } finally {
      updateAssets(shot.id, { status: "idle" });
    }
  }

  const completedShots = Object.values(shotAssets).filter((asset) => asset.video?.status === "SUCCEEDED").length;
  const progress = useMemo(() => (approved ? 50 + completedShots * 15 : run ? 25 : 0), [approved, completedShots, run]);
  const selectedShot = run?.proposal.shots.find((shot) => shot.id === selectedShotId) || run?.proposal.shots[0];
  const selectedAssets = selectedShot ? shotAssets[selectedShot.id] || { status: "idle" } : { status: "idle" as const };

  return (
    <main className="app-shell" ref={workspaceRef}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Clapperboard size={19} /></div>
          <div><strong>AI Film Swarm</strong><span>Director Console</span></div>
        </div>
        <div className="project-state">
          <span className={`live-dot ${paused ? "paused" : ""}`} />
          {run ? (paused ? "Execution paused" : "Swarm active") : "Ready"}
          {run && (
            <button className="icon-button" title={paused ? "恢复任务调度" : "暂停任务调度"} onClick={() => setPaused(!paused)}>
              {paused ? <CirclePlay size={18} /> : <CirclePause size={18} />}
            </button>
          )}
        </div>
      </header>

      <nav className="stagebar" aria-label="Film production stages">
        {steps.map((step, index) => (
          <div className={`stage ${index <= (run ? (approved ? 2 : 1) : 0) ? "active" : ""}`} key={step}>
            <span>{index + 1}</span>{step}{index < steps.length - 1 && <ChevronRight size={14} />}
          </div>
        ))}
        <div className="progress"><i style={{ width: `${progress}%` }} /></div>
      </nav>

      <section className="workspace">
        <aside className="left-panel panel">
          <div className="panel-heading"><div><p>SWARM ROSTER</p><h2>Agents & tasks</h2></div><Activity size={18} /></div>
          {!run ? (
            <div className="empty-rail"><Bot size={28} /><strong>No active crew</strong><span>Start a run to dispatch the creative swarm.</span></div>
          ) : (
            <>
              <div className="metric-row"><div><span>Agents</span><strong>{run.agents.length + 1}</strong></div><div><span>Tasks</span><strong>{run.tasks.length}</strong></div></div>
              <div className="section-label">Active crew</div>
              <div className="agent-list">
                {run.agents.map((agent) => (
                  <div className="agent-row" key={agent.id}>
                    <div className="agent-avatar"><Bot size={16} /></div>
                    <div><strong>{agent.name}</strong><span>{agent.capability}</span></div>
                    <i className={`status-dot ${paused ? "waiting" : agent.status}`} />
                  </div>
                ))}
                <div className="agent-row"><div className="agent-avatar amber"><GitBranch size={16} /></div><div><strong>Human Director</strong><span>reviews every handoff</span></div><i className="status-dot waiting" /></div>
              </div>
              <div className="section-label">Task pool</div>
              <div className="task-list">
                {run.tasks.map((task) => (
                  <div className="task-row" key={task.id}><span className={`task-icon ${task.status.toLowerCase()}`}>{task.status === "RUNNING" ? <LoaderCircle size={14} /> : <Radio size={14} />}</span><div><strong>{task.type}</strong><span>{task.title}</span></div></div>
                ))}
              </div>
            </>
          )}
        </aside>

        <section className="center-panel panel">
          <div className="panel-heading"><div><p>LIVE EXECUTION</p><h2>Trace</h2></div><span className="trace-badge"><Radio size={12} /> immutable log</span></div>
          {!run ? (
            <div className="trace-placeholder">
              <div className="trace-art"><span /><span /><span /></div>
              <h3>The crew is standing by</h3>
              <p>Submit a short story to watch agents exchange structured results while you review every handoff.</p>
            </div>
          ) : (
            <div className="timeline">
              {run.trace.map((event, index) => (
                <article className="trace-event" key={event.id}>
                  <div className="trace-line"><span>{event.type === "HUMAN_APPROVED" ? <UserRoundCheck size={15} /> : event.type === "AGENT_MESSAGE" ? <MessageSquareText size={15} /> : <Sparkles size={15} />}</span>{index < run.trace.length - 1 && <i />}</div>
                  <div className="event-content"><div><strong>{event.actor}</strong><time>{new Date(event.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time></div><em>{event.type.replaceAll("_", " ")}</em><p>{event.message}</p></div>
                </article>
              ))}
              {paused && <div className="paused-notice"><CirclePause size={16} /> Scheduler paused by human director. Running requests may finish; no new work will start.</div>}
            </div>
          )}
        </section>

        <aside className="right-panel panel">
          <div className="panel-heading"><div><p>HUMAN CONTROL</p><h2>{run ? "Story review" : "New production"}</h2></div>{run ? <UserRoundCheck size={18} /> : <FileText size={18} />}</div>
          {!run ? (
            <div className="form-stack">
              <label>Project title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
              <label>Short story<textarea value={story} onChange={(event) => setStory(event.target.value)} /></label>
              <div className="input-meta"><span>{story.length.toLocaleString()} characters</span><span>Recommended: 2-6 paragraphs</span></div>
              <button className="primary-button" disabled={loading || !story.trim()} onClick={startRun}>{loading ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}{loading ? "Agents collaborating..." : "Start creative swarm"}</button>
              {error && <div className="error-note">{error}</div>}
              <p className="form-note">Story planning uses qwen3.8-flash. The API key remains on the server.</p>
            </div>
          ) : (
            <div className="review-stack">
              <div className="review-alert"><UserRoundCheck size={17} /><div><strong>Approval required</strong><span>Downstream planning is blocked until you approve this proposal.</span></div></div>
              <label>Proposed logline<textarea className="logline" disabled={!editing || approved} value={run.proposal.logline} onChange={(event) => setRun({ ...run, proposal: { ...run.proposal, logline: event.target.value } })} /></label>
              <div className="shot-summary"><strong>{run.proposal.shots.length} connected shots</strong><span>{run.proposal.shots.map((shot) => shot.title).join(" · ")}</span><small>Every shot includes editable start-frame, end-frame, and video prompts.</small></div>
              <div className="section-label">Characters & evidence</div>
              {run.proposal.characters.map((character) => (
                <div className="character-card" key={character.name}><div className="character-initial">{character.name[0]}</div><div><strong>{character.name}</strong><span>{character.role}</span><small>{character.evidence}</small></div></div>
              ))}
              <div className="review-actions">
                <button className="secondary-button" disabled={approved} onClick={() => setEditing(!editing)}><Pencil size={16} />{editing ? "Finish editing" : "Edit proposal"}</button>
                <button className="primary-button" disabled={approved} onClick={approveStory}><Check size={16} />{approved ? "Approved" : "Approve story"}</button>
              </div>
              {approved && <div className="approved-note"><Check size={16} /> Story and shot plan approved. Media agents are unblocked.</div>}
              {approved && selectedShot && (
                <div className="media-workbench">
                  <div className="shot-tabs" role="tablist" aria-label="Shots">
                    {run.proposal.shots.map((shot) => (
                      <button className={shot.id === selectedShot.id ? "active" : ""} role="tab" aria-selected={shot.id === selectedShot.id} key={shot.id} onClick={() => setSelectedShotId(shot.id)}>
                        <span>{shot.order}</span>{shot.title}{shotAssets[shot.id]?.video && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                  <div className="shot-editor">
                    <div className="shot-summary compact"><strong>Shot {selectedShot.order} · {selectedShot.title}</strong><span>{selectedShot.action}</span><small>{selectedShot.camera}</small></div>
                    <label>Start-frame prompt<textarea className="prompt-field" value={selectedShot.startFramePrompt} onChange={(event) => updateShot(selectedShot.id, { startFramePrompt: event.target.value })} /></label>
                    <button className="secondary-button full-button" disabled={selectedAssets.status !== "idle"} onClick={() => createFrame(selectedShot, "start")}>
                      {selectedAssets.status === "start" ? <LoaderCircle className="spin" size={16} /> : selectedAssets.startFrameUrl ? <RefreshCw size={16} /> : <ImageIcon size={16} />} Generate start frame
                    </button>
                    {selectedAssets.startFrameUrl && <img className="asset-preview" src={selectedAssets.startFrameUrl} alt={`${selectedShot.title} start frame`} />}
                    <label>End-frame prompt<textarea className="prompt-field" value={selectedShot.endFramePrompt} onChange={(event) => updateShot(selectedShot.id, { endFramePrompt: event.target.value })} /></label>
                    <button className="secondary-button full-button" disabled={selectedAssets.status !== "idle"} onClick={() => createFrame(selectedShot, "end")}>
                      {selectedAssets.status === "end" ? <LoaderCircle className="spin" size={16} /> : selectedAssets.endFrameUrl ? <RefreshCw size={16} /> : <ImageIcon size={16} />} Generate end frame
                    </button>
                    {selectedAssets.endFrameUrl && <img className="asset-preview" src={selectedAssets.endFrameUrl} alt={`${selectedShot.title} end frame`} />}
                    <label>Video prompt<textarea className="prompt-field" value={selectedShot.videoPrompt} onChange={(event) => updateShot(selectedShot.id, { videoPrompt: event.target.value })} /></label>
                    <button className="primary-button" disabled={selectedAssets.status !== "idle" || paused} onClick={() => generateShot(selectedShot)}>
                      {selectedAssets.status === "all" ? <LoaderCircle className="spin" size={16} /> : <Video size={16} />}{selectedAssets.video ? "Regenerate shot" : "Generate shot"}
                    </button>
                    <p className="generation-note">One click generates both frames with qwen-image-3.0, then runs the local Mock Video backend.</p>
                    {selectedAssets.video && (
                      <div className="mock-video-result">
                        <div className="mock-strip">
                          {selectedAssets.startFrameUrl && <img src={selectedAssets.startFrameUrl} alt="Mock video first frame" />}
                          {selectedAssets.endFrameUrl && <img src={selectedAssets.endFrameUrl} alt="Mock video last frame" />}
                          <Video size={22} />
                        </div>
                        <div><strong>Mock Video · {selectedAssets.video.duration}s</strong><span>SUCCEEDED · No external video API was called.</span></div>
                      </div>
                    )}
                  {error && <div className="error-note">{error}</div>}
                  {completedShots === run.proposal.shots.length && <div className="approved-note"><Check size={16} /> All three mock shots are ready for human review.</div>}
                  </div>
                </div>
              )}
              <button className="text-button" onClick={() => { setRun(null); setApproved(false); setShotAssets({}); }}><Plus size={15} /> Start another production</button>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

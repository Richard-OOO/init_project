"use client";

import { useMemo, useState } from "react";
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
  LoaderCircle,
  MessageSquareText,
  Pencil,
  Plus,
  Radio,
  Send,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import type { StartRunResponse, TraceEvent } from "@/lib/domain";

const sampleStory = `林是一名修复旧磁带的档案员。一个雨夜，她在一卷没有编号的磁带里听见了自己的声音，要求她前往城外废弃的天文台。\n\n她带着磁带抵达天文台，发现穹顶下的设备仍在运行。信号每隔十分钟重复一次，每次都准确预告她接下来的动作。\n\n最后一段信号来自十年后的林。未来的她请求今晚的自己关闭设备，否则这座城市会永远困在同一个雨夜。`;

const steps = ["理解", "整合", "故事审查", "镜头规划", "媒体生成", "视频审查", "剪辑"];

export default function Workspace() {
  const [title, setTitle] = useState("雨夜信号");
  const [story, setStory] = useState(sampleStory);
  const [run, setRun] = useState<StartRunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [approved, setApproved] = useState(false);
  const [editing, setEditing] = useState(false);

  async function startRun() {
    setLoading(true);
    setApproved(false);
    const response = await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, story }),
    });
    const data = (await response.json()) as StartRunResponse;
    setRun(data);
    setLoading(false);
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

  const progress = useMemo(() => (approved ? 43 : run ? 29 : 0), [approved, run]);

  return (
    <main className="app-shell">
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
            <div className="empty-rail"><Bot size={28} /><strong>No active crew</strong><span>Start a run to dispatch Reader agents.</span></div>
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
                <div className="agent-row"><div className="agent-avatar amber"><GitBranch size={16} /></div><div><strong>Story Integrator</strong><span>waiting for claims</span></div><i className="status-dot waiting" /></div>
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
              <p>Submit a short story to watch agents claim tasks, exchange evidence requests, and propose state changes.</p>
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
              <button className="primary-button" disabled={loading || !story.trim()} onClick={startRun}>{loading ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}{loading ? "Dispatching..." : "Dispatch reader swarm"}</button>
              <p className="form-note">This first slice uses deterministic mock workers. No model call or media generation is triggered.</p>
            </div>
          ) : (
            <div className="review-stack">
              <div className="review-alert"><UserRoundCheck size={17} /><div><strong>Approval required</strong><span>Downstream planning is blocked until you approve this proposal.</span></div></div>
              <label>Proposed logline<textarea className="logline" disabled={!editing || approved} value={run.proposal.logline} onChange={(event) => setRun({ ...run, proposal: { ...run.proposal, logline: event.target.value } })} /></label>
              <div className="section-label">Characters & evidence</div>
              {run.proposal.characters.map((character) => (
                <div className="character-card" key={character.name}><div className="character-initial">{character.name[0]}</div><div><strong>{character.name}</strong><span>{character.role}</span><small>{character.evidence}</small></div></div>
              ))}
              <div className="review-actions">
                <button className="secondary-button" disabled={approved} onClick={() => setEditing(!editing)}><Pencil size={16} />{editing ? "Finish editing" : "Edit proposal"}</button>
                <button className="primary-button" disabled={approved} onClick={approveStory}><Check size={16} />{approved ? "Approved" : "Approve story"}</button>
              </div>
              {approved && <div className="approved-note"><Check size={16} /> Story v1 approved. Shot planning can begin.</div>}
              <button className="text-button" onClick={() => { setRun(null); setApproved(false); }}><Plus size={15} /> Start another production</button>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

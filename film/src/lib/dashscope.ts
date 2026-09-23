import type { ImageGenerationResponse, ShotProposal } from "@/lib/domain";

const API_ROOT = "https://maas.qianwenaiapi.com/api/v1";
const COMPATIBLE_ROOT = "https://maas.qianwenaiapi.com/compatible-mode/v1";

function apiKey() {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) throw new Error("DASHSCOPE_API_KEY is not configured on the server.");
  return key;
}

async function readResponse(response: Response) {
  const text = await response.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = { message: text || response.statusText }; }
  if (!response.ok) {
    const detail = data as { message?: string; code?: string };
    throw new Error(detail.message || detail.code || `DashScope request failed (${response.status}).`);
  }
  return data;
}

function stripJsonFence(value: string) {
  return value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

async function chatJson<T>(system: string, user: string): Promise<T> {
  const response = await fetch(`${COMPATIBLE_ROOT}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen3.8-flash",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      extra_body: { enable_thinking: false },
    }),
    cache: "no-store",
  });
  const data = (await readResponse(response)) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("The language model returned no structured output.");
  return JSON.parse(stripJsonFence(content)) as T;
}

export async function planShots(story: string): Promise<{
  logline: string;
  characters: Array<{ name: string; role: string; evidence: string }>;
  shots: ShotProposal[];
}> {
  const understanding = await chatJson<{
    logline: string;
    characters: Array<{ name: string; role: string; evidence: string }>;
    visualMoment: string;
  }>(
    "你是 Story Agent。只输出合法 JSON，不要 Markdown。忠于原文，提取一句故事主线、主要人物和最适合视觉化的瞬间。",
    `原文：\n${story}\n\n输出：{"logline":"","characters":[{"name":"","role":"","evidence":"原文证据"}],"visualMoment":""}`,
  );
  if (!understanding.logline || !understanding.visualMoment) throw new Error("Story Agent returned an incomplete interpretation.");

  const shots = await chatJson<ShotProposal[]>(
    "你是 Shot Agent。只输出合法 JSON 数组，不要 Markdown。根据 Story Agent 的结构化结果设计恰好 3 个连续短镜头。每个镜头 5 秒，首尾帧提示词要完整描述人物、环境、光线和构图；视频提示词要描述首帧到尾帧之间的动作与运镜。不得添加与输入冲突的设定。",
    `Story Agent 输出：\n${JSON.stringify(understanding)}\n\n输出：[${[1, 2, 3].map((order) => `{"id":"shot_${order}","order":${order},"title":"","action":"","camera":"","startFramePrompt":"","endFramePrompt":"","videoPrompt":""}`).join(",")}]`,
  );
  const valid = Array.isArray(shots) && shots.length === 3 && shots.every((shot, index) =>
    shot.id && shot.order === index + 1 && shot.title && shot.action && shot.camera &&
    shot.startFramePrompt && shot.endFramePrompt && shot.videoPrompt,
  );
  if (!valid) throw new Error("Shot Agent must return exactly three complete shots.");
  return { logline: understanding.logline, characters: understanding.characters || [], shots };
}

export async function generateImage(prompt: string): Promise<ImageGenerationResponse> {
  const response = await fetch(`${API_ROOT}/services/aigc/multimodal-generation/generation`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen-image-3.0",
      input: { messages: [{ role: "user", content: [{ text: prompt }] }] },
      parameters: { prompt_extend: true },
    }),
    cache: "no-store",
  });
  const data = (await readResponse(response)) as { request_id?: string; output?: { choices?: Array<{ message?: { content?: Array<{ image?: string; image_url?: string }> } }> } };
  const item = data.output?.choices?.[0]?.message?.content?.find((entry) => entry.image || entry.image_url);
  const imageUrl = item?.image || item?.image_url;
  if (!imageUrl) throw new Error("The image model returned no image URL.");
  return { imageUrl, requestId: data.request_id };
}

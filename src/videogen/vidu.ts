import axios from "axios";
import { config } from "../config.js";

const BASE_URL = "https://api.vidu.com/ent/v2";

export interface GenerateVideoParams {
  prompt: string;
  referenceImageUrls: string[];
  model?: string;
  duration?: number;
  resolution?: string;
}

export interface ViduTaskStatus {
  taskId: string;
  state: "created" | "queueing" | "processing" | "success" | "failed";
  videoUrls: string[];
}

function headers() {
  return { Authorization: `Token ${config.vidu.apiKey}`, "Content-Type": "application/json" };
}

export async function submitReferenceToVideo(params: GenerateVideoParams): Promise<string> {
  const res = await axios.post(
    `${BASE_URL}/reference2video`,
    {
      model: params.model ?? config.vidu.model,
      prompt: params.prompt,
      reference_images: params.referenceImageUrls,
      duration: params.duration ?? config.vidu.duration,
      resolution: params.resolution ?? config.vidu.resolution,
      off_peak: true,
    },
    { headers: headers() },
  );

  const taskId = res.data?.task_id as string | undefined;
  if (!taskId) {
    throw new Error(`비두 작업 생성 실패: ${JSON.stringify(res.data)}`);
  }
  return taskId;
}

export async function getTaskStatus(taskId: string): Promise<ViduTaskStatus> {
  const res = await axios.get(`${BASE_URL}/tasks/${taskId}/creations`, { headers: headers() });

  const state = res.data?.state as ViduTaskStatus["state"];
  const creations = (res.data?.creations ?? []) as Array<{ url?: string }>;

  return {
    taskId,
    state,
    videoUrls: creations.map((c) => c.url).filter((u): u is string => Boolean(u)),
  };
}

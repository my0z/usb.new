import axios from "axios";
import { config } from "../config.js";
import type { PlatformUploader, UploadJob, UploadResult } from "../types.js";

const GRAPH_VERSION = "v21.0";
const BASE = `https://graph.threads.net/${GRAPH_VERSION}`;
const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 36;

export const threadsUploader: PlatformUploader = {
  name: "threads",

  isConfigured() {
    const c = config.threads;
    return Boolean(c.userId && c.accessToken);
  },

  async upload(job: UploadJob): Promise<UploadResult> {
    const c = config.threads;
    const videoUrl = job.videoUrl ?? config.videoPublicUrl;

    if (!videoUrl) {
      return {
        platform: "threads",
        ok: false,
        error: "스레드는 공개 videoUrl이 필요합니다 (로컬 파일 업로드 불가)",
      };
    }

    try {
      const createRes = await axios.post(`${BASE}/${c.userId}/threads`, null, {
        params: {
          access_token: c.accessToken,
          media_type: "VIDEO",
          video_url: videoUrl,
          text: job.caption,
        },
      });

      const creationId = createRes.data?.id as string;
      await waitUntilReady(creationId, c.accessToken as string);

      const publishRes = await axios.post(`${BASE}/${c.userId}/threads_publish`, null, {
        params: {
          access_token: c.accessToken,
          creation_id: creationId,
        },
      });

      const postId = publishRes.data?.id as string | undefined;
      return {
        platform: "threads",
        ok: true,
        postId,
        postUrl: postId ? `https://www.threads.net/t/${postId}` : undefined,
      };
    } catch (err) {
      return { platform: "threads", ok: false, error: toMessage(err) };
    }
  },
};

async function waitUntilReady(creationId: string, accessToken: string): Promise<void> {
  for (let i = 0; i < MAX_POLLS; i++) {
    const res = await axios.get(`${BASE}/${creationId}`, {
      params: { access_token: accessToken, fields: "status" },
    });
    const status = res.data?.status;

    if (status === "FINISHED") return;
    if (status === "ERROR") throw new Error("스레드 미디어 처리 실패");

    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error("스레드 미디어 처리 시간 초과");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return JSON.stringify(err.response?.data ?? err.message);
  }
  return err instanceof Error ? err.message : String(err);
}

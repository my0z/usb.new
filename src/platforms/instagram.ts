import axios from "axios";
import { config } from "../config.js";
import type { PlatformUploader, UploadJob, UploadResult } from "../types.js";

const GRAPH_VERSION = "v21.0";
const BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 36;

export const instagramUploader: PlatformUploader = {
  name: "instagram",

  isConfigured() {
    const c = config.instagram;
    return Boolean(c.businessAccountId && c.accessToken);
  },

  async upload(job: UploadJob): Promise<UploadResult> {
    const c = config.instagram;
    const videoUrl = job.videoUrl ?? config.videoPublicUrl;

    if (!videoUrl) {
      return {
        platform: "instagram",
        ok: false,
        error: "인스타그램은 공개 videoUrl이 필요합니다 (로컬 파일 업로드 불가)",
      };
    }

    try {
      const createRes = await axios.post(`${BASE}/${c.businessAccountId}/media`, null, {
        params: {
          access_token: c.accessToken,
          media_type: "REELS",
          video_url: videoUrl,
          caption: job.caption,
        },
      });

      const creationId = createRes.data?.id as string;
      await waitUntilReady(creationId, c.accessToken as string);

      const publishRes = await axios.post(`${BASE}/${c.businessAccountId}/media_publish`, null, {
        params: {
          access_token: c.accessToken,
          creation_id: creationId,
        },
      });

      const mediaId = publishRes.data?.id as string | undefined;
      let permalink: string | undefined;
      if (mediaId) {
        const info = await axios.get(`${BASE}/${mediaId}`, {
          params: { access_token: c.accessToken, fields: "permalink" },
        });
        permalink = info.data?.permalink;
      }

      return { platform: "instagram", ok: true, postId: mediaId, postUrl: permalink };
    } catch (err) {
      return { platform: "instagram", ok: false, error: toMessage(err) };
    }
  },
};

async function waitUntilReady(creationId: string, accessToken: string): Promise<void> {
  for (let i = 0; i < MAX_POLLS; i++) {
    const res = await axios.get(`${BASE}/${creationId}`, {
      params: { access_token: accessToken, fields: "status_code" },
    });
    const status = res.data?.status_code;

    if (status === "FINISHED") return;
    if (status === "ERROR") throw new Error("인스타그램 미디어 처리 실패");

    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error("인스타그램 미디어 처리 시간 초과");
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

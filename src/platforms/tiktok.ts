import axios from "axios";
import { config } from "../config.js";
import type { PlatformUploader, UploadJob, UploadResult } from "../types.js";

const BASE = "https://open.tiktokapis.com/v2";
const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 36;

export const tiktokUploader: PlatformUploader = {
  name: "tiktok",

  isConfigured() {
    return Boolean(config.tiktok.accessToken);
  },

  async upload(job: UploadJob): Promise<UploadResult> {
    const c = config.tiktok;
    const videoUrl = job.videoUrl ?? config.videoPublicUrl;

    if (!videoUrl) {
      return {
        platform: "tiktok",
        ok: false,
        error: "틱톡은 도메인 검증된 공개 videoUrl이 필요합니다 (PULL_FROM_URL)",
      };
    }

    const headers = {
      Authorization: `Bearer ${c.accessToken}`,
      "Content-Type": "application/json",
    };

    try {
      const initRes = await axios.post(
        `${BASE}/post/publish/video/init/`,
        {
          post_info: {
            title: job.title,
            privacy_level: "SELF_ONLY",
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: videoUrl,
          },
        },
        { headers },
      );

      if (initRes.data?.error?.code && initRes.data.error.code !== "ok") {
        throw new Error(JSON.stringify(initRes.data.error));
      }

      const publishId = initRes.data?.data?.publish_id as string;
      const finalStatus = await waitUntilDone(publishId, headers);

      return {
        platform: "tiktok",
        ok: finalStatus === "PUBLISH_COMPLETE",
        postId: publishId,
        error: finalStatus === "PUBLISH_COMPLETE" ? undefined : `상태: ${finalStatus}`,
      };
    } catch (err) {
      return { platform: "tiktok", ok: false, error: toMessage(err) };
    }
  },
};

async function waitUntilDone(
  publishId: string,
  headers: Record<string, string>,
): Promise<string> {
  for (let i = 0; i < MAX_POLLS; i++) {
    const res = await axios.post(
      `${BASE}/post/publish/status/fetch/`,
      { publish_id: publishId },
      { headers },
    );
    const status = res.data?.data?.status as string;

    if (status === "PUBLISH_COMPLETE" || status === "FAILED") return status;

    await sleep(POLL_INTERVAL_MS);
  }
  return "TIMEOUT";
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

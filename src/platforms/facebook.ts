import { createReadStream } from "node:fs";
import axios from "axios";
import FormData from "form-data";
import { config } from "../config.js";
import type { PlatformUploader, UploadJob, UploadResult } from "../types.js";

const GRAPH_VERSION = "v21.0";

export const facebookUploader: PlatformUploader = {
  name: "facebook",

  isConfigured() {
    const c = config.facebook;
    return Boolean(c.pageId && c.pageAccessToken);
  },

  async upload(job: UploadJob): Promise<UploadResult> {
    const c = config.facebook;
    const url = `https://graph-video.facebook.com/${GRAPH_VERSION}/${c.pageId}/videos`;

    try {
      let response;

      if (job.videoUrl) {
        response = await axios.post(url, null, {
          params: {
            access_token: c.pageAccessToken,
            file_url: job.videoUrl,
            description: job.caption,
            title: job.title,
          },
        });
      } else if (job.videoPath) {
        const form = new FormData();
        form.append("access_token", c.pageAccessToken as string);
        form.append("description", job.caption);
        form.append("title", job.title);
        form.append("source", createReadStream(job.videoPath));

        response = await axios.post(url, form, {
          headers: form.getHeaders(),
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        });
      } else {
        return { platform: "facebook", ok: false, error: "videoPath 또는 videoUrl이 필요합니다" };
      }

      const videoId = response.data?.id as string | undefined;
      return {
        platform: "facebook",
        ok: true,
        postId: videoId,
        postUrl: videoId ? `https://www.facebook.com/watch/?v=${videoId}` : undefined,
      };
    } catch (err) {
      return { platform: "facebook", ok: false, error: toMessage(err) };
    }
  },
};

function toMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return JSON.stringify(err.response?.data ?? err.message);
  }
  return err instanceof Error ? err.message : String(err);
}

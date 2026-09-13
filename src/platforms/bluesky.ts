import { readFile } from "node:fs/promises";
import { AtpAgent } from "@atproto/api";
import axios from "axios";
import { config } from "../config.js";
import type { PlatformUploader, UploadJob, UploadResult } from "../types.js";

export const blueskyUploader: PlatformUploader = {
  name: "bluesky",

  isConfigured() {
    const c = config.bluesky;
    return Boolean(c.identifier && c.appPassword);
  },

  async upload(job: UploadJob): Promise<UploadResult> {
    const c = config.bluesky;

    try {
      const bytes = await loadVideoBytes(job);

      const agent = new AtpAgent({ service: c.serviceUrl });
      await agent.login({ identifier: c.identifier as string, password: c.appPassword as string });

      const blob = await agent.uploadBlob(bytes, { encoding: "video/mp4" });

      const record = await agent.post({
        text: job.caption,
        embed: {
          $type: "app.bsky.embed.video",
          video: blob.data.blob,
        },
        createdAt: new Date().toISOString(),
      });

      const postId = record.uri.split("/").pop();
      const postUrl = postId ? `https://bsky.app/profile/${c.identifier}/post/${postId}` : undefined;

      return { platform: "bluesky", ok: true, postId: record.uri, postUrl };
    } catch (err) {
      return { platform: "bluesky", ok: false, error: toMessage(err) };
    }
  },
};

async function loadVideoBytes(job: UploadJob): Promise<Uint8Array> {
  if (job.videoPath) {
    return readFile(job.videoPath);
  }
  if (job.videoUrl) {
    const res = await axios.get(job.videoUrl, { responseType: "arraybuffer" });
    return new Uint8Array(res.data);
  }
  throw new Error("videoPath 또는 videoUrl이 필요합니다");
}

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

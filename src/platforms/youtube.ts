import { createReadStream } from "node:fs";
import { google } from "googleapis";
import { config } from "../config.js";
import type { PlatformUploader, UploadJob, UploadResult } from "../types.js";

export const youtubeUploader: PlatformUploader = {
  name: "youtube",

  isConfigured() {
    const c = config.youtube;
    return Boolean(c.clientId && c.clientSecret && c.refreshToken);
  },

  async upload(job: UploadJob): Promise<UploadResult> {
    if (!job.videoPath) {
      return { platform: "youtube", ok: false, error: "videoPath가 필요합니다" };
    }

    const c = config.youtube;
    const oauth2Client = new google.auth.OAuth2(c.clientId, c.clientSecret);
    oauth2Client.setCredentials({ refresh_token: c.refreshToken });

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    try {
      const res = await youtube.videos.insert({
        part: ["snippet", "status"],
        requestBody: {
          snippet: {
            title: job.title,
            description: job.caption,
            tags: job.hashtags,
          },
          status: {
            privacyStatus: c.privacyStatus as "public" | "unlisted" | "private",
          },
        },
        media: {
          body: createReadStream(job.videoPath),
        },
      });

      const videoId = res.data.id ?? undefined;
      return {
        platform: "youtube",
        ok: true,
        postId: videoId,
        postUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined,
      };
    } catch (err) {
      return { platform: "youtube", ok: false, error: toMessage(err) };
    }
  },
};

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

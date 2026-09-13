import { blueskyUploader } from "./platforms/bluesky.js";
import { facebookUploader } from "./platforms/facebook.js";
import { instagramUploader } from "./platforms/instagram.js";
import { threadsUploader } from "./platforms/threads.js";
import { tiktokUploader } from "./platforms/tiktok.js";
import { youtubeUploader } from "./platforms/youtube.js";
import type { PlatformUploader, UploadJob, UploadResult } from "./types.js";

const allUploaders: PlatformUploader[] = [
  youtubeUploader,
  facebookUploader,
  instagramUploader,
  threadsUploader,
  tiktokUploader,
  blueskyUploader,
];

export async function uploadToAllChannels(job: UploadJob): Promise<UploadResult[]> {
  const targets = allUploaders.filter((u) => u.isConfigured());
  const skipped = allUploaders.filter((u) => !u.isConfigured());

  const results = await Promise.all(targets.map((u) => u.upload(job)));

  const skippedResults: UploadResult[] = skipped.map((u) => ({
    platform: u.name,
    ok: false,
    error: "설정되지 않음 (환경변수 누락)",
  }));

  return [...results, ...skippedResults];
}

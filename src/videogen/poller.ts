import { createWriteStream } from "node:fs";
import { unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import axios from "axios";
import { config } from "../config.js";
import { uploadToAllChannels } from "../orchestrator.js";
import { getTaskStatus } from "./vidu.js";
import { listPendingJobs, updateJob, type ViduJob } from "./store.js";

export function startViduPoller(): void {
  const intervalMs = config.vidu.pollIntervalMinutes * 60_000;
  pollOnce();
  setInterval(pollOnce, intervalMs);
}

async function pollOnce(): Promise<void> {
  if (!config.vidu.apiKey) return;

  const pending = await listPendingJobs();
  for (const job of pending) {
    try {
      await checkJob(job);
    } catch (err) {
      console.error(`비두 작업 확인 실패 (${job.taskId}):`, err);
    }
  }
}

async function checkJob(job: ViduJob): Promise<void> {
  const status = await getTaskStatus(job.taskId);

  if (status.state === "failed") {
    await updateJob(job.taskId, { status: "failed", error: "비두 생성 실패" });
    return;
  }
  if (status.state !== "success" || status.videoUrls.length === 0) {
    return;
  }

  const videoUrl = status.videoUrls[0];
  const videoPath = await downloadToTemp(videoUrl);

  try {
    const results = await uploadToAllChannels({
      videoPath,
      videoUrl,
      title: job.title,
      caption: job.caption,
      hashtags: job.hashtags,
    });
    const failed = results.filter((r) => !r.ok);
    await updateJob(job.taskId, {
      status: failed.length === results.length ? "failed" : "done",
      error: failed.length > 0 ? JSON.stringify(failed) : undefined,
    });
  } finally {
    await unlink(videoPath).catch(() => {});
  }
}

async function downloadToTemp(url: string): Promise<string> {
  const dest = path.join(os.tmpdir(), `vidu-${Date.now()}.mp4`);
  const res = await axios.get(url, { responseType: "stream" });

  await new Promise<void>((resolve, reject) => {
    const stream = createWriteStream(dest);
    res.data.pipe(stream);
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });

  return dest;
}

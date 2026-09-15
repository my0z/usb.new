import { unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import express from "express";
import multer from "multer";
import { config } from "./config.js";
import { uploadToAllChannels } from "./orchestrator.js";
import type { UploadJob } from "./types.js";

const app = express();
const upload = multer({ dest: path.join(os.tmpdir(), "usb-uploads") });

app.use((req, res, next) => {
  if (!config.server.apiKey) return next();
  if (req.header("x-api-key") === config.server.apiKey) return next();
  res.status(401).json({ error: "인증 실패" });
});

app.post("/upload", upload.single("video"), async (req, res) => {
  const body = req.body as Record<string, string | undefined>;

  if (!req.file && !body.videoUrl) {
    res.status(400).json({ error: "video 파일 또는 videoUrl이 필요합니다" });
    return;
  }
  if (!body.title || !body.caption) {
    res.status(400).json({ error: "title과 caption이 필요합니다" });
    return;
  }

  const job: UploadJob = {
    videoPath: req.file?.path,
    videoUrl: body.videoUrl,
    title: body.title,
    caption: body.caption,
    hashtags: (body.hashtags ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  };

  try {
    const results = await uploadToAllChannels(job);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  } finally {
    if (req.file) await unlink(req.file.path).catch(() => {});
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(config.server.port, () => {
  if (!config.server.apiKey) {
    console.warn("경고: API_KEY가 설정되지 않아 /upload가 인증 없이 열려 있습니다");
  }
  console.log(`usb 서버가 ${config.server.port} 포트에서 대기 중`);
});

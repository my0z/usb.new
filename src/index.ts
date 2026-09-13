#!/usr/bin/env node
import { Command } from "commander";
import { uploadToAllChannels } from "./orchestrator.js";
import type { UploadJob } from "./types.js";

const program = new Command();

program
  .name("usb")
  .description("영상을 인스타그램 스레드 페이스북 틱톡 유튜브 블루스카이에 동시 업로드")
  .requiredOption("--video <path>", "로컬 영상 파일 경로")
  .option("--video-url <url>", "공개 접근 가능한 영상 URL (인스타그램 스레드 틱톡에 필요)")
  .requiredOption("--title <title>", "영상 제목")
  .requiredOption("--caption <text>", "게시글 본문")
  .option("--hashtags <tags>", "쉼표로 구분된 해시태그", "")
  .parse(process.argv);

const opts = program.opts();

const job: UploadJob = {
  videoPath: opts.video,
  videoUrl: opts.videoUrl,
  title: opts.title,
  caption: opts.caption,
  hashtags: (opts.hashtags as string)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean),
};

const results = await uploadToAllChannels(job);

let hasFailure = false;
for (const r of results) {
  const status = r.ok ? "성공" : "실패";
  console.log(`[${r.platform}] ${status}${r.postUrl ? ` -> ${r.postUrl}` : ""}${r.error ? ` (${r.error})` : ""}`);
  if (!r.ok) hasFailure = true;
}

process.exit(hasFailure ? 1 : 0);

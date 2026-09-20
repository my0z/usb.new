import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

export interface ViduJob {
  taskId: string;
  status: "pending" | "done" | "failed";
  createdAt: string;
  title: string;
  caption: string;
  hashtags: string[];
  error?: string;
}

async function readJobs(): Promise<ViduJob[]> {
  try {
    const raw = await readFile(config.vidu.jobsFile, "utf-8");
    return JSON.parse(raw) as ViduJob[];
  } catch {
    return [];
  }
}

async function writeJobs(jobs: ViduJob[]): Promise<void> {
  await mkdir(path.dirname(config.vidu.jobsFile), { recursive: true });
  await writeFile(config.vidu.jobsFile, JSON.stringify(jobs, null, 2));
}

export async function addJob(job: ViduJob): Promise<void> {
  const jobs = await readJobs();
  jobs.push(job);
  await writeJobs(jobs);
}

export async function listPendingJobs(): Promise<ViduJob[]> {
  const jobs = await readJobs();
  return jobs.filter((j) => j.status === "pending");
}

export async function listJobs(): Promise<ViduJob[]> {
  return readJobs();
}

export async function updateJob(taskId: string, patch: Partial<ViduJob>): Promise<void> {
  const jobs = await readJobs();
  const idx = jobs.findIndex((j) => j.taskId === taskId);
  if (idx === -1) return;
  jobs[idx] = { ...jobs[idx], ...patch };
  await writeJobs(jobs);
}

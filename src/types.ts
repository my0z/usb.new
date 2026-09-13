export type Platform =
  | "youtube"
  | "facebook"
  | "instagram"
  | "threads"
  | "tiktok"
  | "bluesky";

export interface UploadJob {
  videoPath?: string;
  videoUrl?: string;
  title: string;
  caption: string;
  hashtags: string[];
}

export interface UploadResult {
  platform: Platform;
  ok: boolean;
  postUrl?: string;
  postId?: string;
  error?: string;
}

export interface PlatformUploader {
  name: Platform;
  isConfigured(): boolean;
  upload(job: UploadJob): Promise<UploadResult>;
}

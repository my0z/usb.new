import "dotenv/config";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export const config = {
  videoPublicUrl: env("VIDEO_PUBLIC_URL"),
  server: {
    port: Number(env("PORT") ?? "3000"),
    apiKey: env("API_KEY"),
  },

  youtube: {
    clientId: env("YOUTUBE_CLIENT_ID"),
    clientSecret: env("YOUTUBE_CLIENT_SECRET"),
    refreshToken: env("YOUTUBE_REFRESH_TOKEN"),
    privacyStatus: env("YOUTUBE_PRIVACY_STATUS") ?? "public",
  },

  facebook: {
    pageId: env("FACEBOOK_PAGE_ID"),
    pageAccessToken: env("FACEBOOK_PAGE_ACCESS_TOKEN"),
  },

  instagram: {
    businessAccountId: env("INSTAGRAM_BUSINESS_ACCOUNT_ID"),
    accessToken: env("INSTAGRAM_ACCESS_TOKEN"),
  },

  threads: {
    userId: env("THREADS_USER_ID"),
    accessToken: env("THREADS_ACCESS_TOKEN"),
  },

  tiktok: {
    accessToken: env("TIKTOK_ACCESS_TOKEN"),
  },

  bluesky: {
    identifier: env("BLUESKY_IDENTIFIER"),
    appPassword: env("BLUESKY_APP_PASSWORD"),
    serviceUrl: env("BLUESKY_SERVICE_URL") ?? "https://bsky.social",
  },
};

export type PlatformId = 'chatgpt' | 'claude';

export function detectPlatform(hostname: string): PlatformId | null {
  if (hostname === 'chatgpt.com') return 'chatgpt';
  if (hostname === 'claude.ai') return 'claude';
  return null;
}

export function platformName(platform: PlatformId): string {
  return platform === 'chatgpt' ? 'ChatGPT' : 'Claude';
}

import { describe, expect, it } from 'vitest';
import { detectPlatform, platformName } from '../../src/shared/platform';

describe('platform detection', () => {
  it('maps the exact supported hostnames to their platform ids', () => {
    expect(detectPlatform('chatgpt.com')).toBe('chatgpt');
    expect(detectPlatform('claude.ai')).toBe('claude');
  });

  it('rejects unsupported hosts and unapproved subdomains', () => {
    expect(detectPlatform('www.claude.ai')).toBeNull();
    expect(detectPlatform('example.com')).toBeNull();
  });

  it('returns the user-facing platform name', () => {
    expect(platformName('chatgpt')).toBe('ChatGPT');
    expect(platformName('claude')).toBe('Claude');
  });
});

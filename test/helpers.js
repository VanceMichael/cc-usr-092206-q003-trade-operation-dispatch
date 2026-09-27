import { readFile } from 'node:fs/promises';
import { parseSample } from '../src/sample.js';
import { buildPlatform, ingestDeclarations, ingestServiceItems, publishPeriod } from '../src/platform.js';

export async function loadSample() {
  const raw = await readFile(new URL('../fixtures/platform-sample.json', import.meta.url), 'utf8');
  return parseSample(raw);
}

export async function loadPlatform() {
  const sample = await loadSample();
  const platform = buildPlatform(sample);
  ingestDeclarations(platform, sample.declarations);
  ingestServiceItems(platform, sample.serviceItems);
  return platform;
}

// 按获知时间分两阶段装账：2026-08-10 前获知的资料先发布 7 月第 1 版，
// 其余资料(含 9 月才获知的迟到报关结果)装账后发布第 2 版。
export async function loadPlatformWithReleases() {
  const sample = await loadSample();
  const platform = buildPlatform(sample);
  const knownAt = (decl) => decl.knownAt ?? decl.reportedAt;
  ingestDeclarations(platform, sample.declarations.filter((decl) => knownAt(decl) <= '2026-08-10'));
  publishPeriod(platform, {
    period: '2026-07',
    direction: 'import',
    caliber: '海关统计口径(万元,按放行日期归期)',
    conclusions: ['7月进口120万元,热带水果为主力'],
    publishedAt: '2026-08-10',
  });
  ingestDeclarations(platform, sample.declarations.filter((decl) => knownAt(decl) > '2026-08-10'));
  publishPeriod(platform, {
    period: '2026-07',
    direction: 'import',
    caliber: '海关统计口径(万元,按放行日期归期,含迟到补录)',
    conclusions: ['补录1票迟到报关结果,7月进口上修至132万元'],
    publishedAt: '2026-09-10',
  });
  ingestServiceItems(platform, sample.serviceItems);
  return platform;
}

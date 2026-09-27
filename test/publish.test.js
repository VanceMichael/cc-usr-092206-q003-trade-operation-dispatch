import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPlatformWithReleases } from './helpers.js';

test('迟到补录只出新版本，已发布的口径与结论保留原版本', async () => {
  const platform = await loadPlatformWithReleases();
  const v1 = platform.store.get('2026-07', 'import', 1);
  const v2 = platform.store.get('2026-07', 'import', 2);
  // 第 1 版在迟到报关结果获知前发布，数值与结论原样保留
  assert.equal(v1.snapshot.total, 120);
  assert.deepEqual(v1.conclusions, ['7月进口120万元,热带水果为主力']);
  assert.equal(v1.caliber, '海关统计口径(万元,按放行日期归期)');
  // 第 2 版补录迟到票，成为现行版本
  assert.equal(v2.snapshot.total, 132);
  assert.equal(v2.caliber, '海关统计口径(万元,按放行日期归期,含迟到补录)');
  assert.equal(platform.store.get('2026-07', 'import').version, 2);
  assert.equal(platform.store.list('2026-07', 'import').length, 2);
});

test('发布版本冻结，不可改写', async () => {
  const platform = await loadPlatformWithReleases();
  const v1 = platform.store.get('2026-07', 'import', 1);
  assert.ok(Object.isFrozen(v1));
  assert.throws(() => {
    v1.conclusions.push('改写结论');
  }, TypeError);
  assert.throws(() => {
    v1.snapshot.total = 999;
  }, TypeError);
  assert.equal(v1.snapshot.total, 120);
});

test('发布缺少口径或结论时报错', async () => {
  const platform = await loadPlatformWithReleases();
  assert.throws(
    () => platform.store.publish({ period: '2026-08', direction: 'import', snapshot: {}, publishedAt: '2026-09-27' }),
    /caliber/,
  );
});

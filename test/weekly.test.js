import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWeeklyReview } from '../src/weekly.js';
import { loadPlatformWithReleases } from './helpers.js';

function reviewAt(platform, asOf, previousReviewAt = null) {
  return buildWeeklyReview({
    ledger: platform.ledger,
    store: platform.store,
    priorYear: platform.sample.priorYear,
    importGrowth: platform.sample.importGrowth,
    asOf,
    previousReviewAt,
  });
}

test('周研判回答进口为何在三十二个月后恢复两位数增长', async () => {
  const platform = await loadPlatformWithReleases();
  const review = reviewAt(platform, '2026-09-27', '2026-09-20');
  assert.equal(review.period, '2026-08');
  assert.ok(Math.abs(review.growth - 0.12) < 1e-9);
  assert.equal(review.monthsSinceDoubleDigit, 32);
  assert.ok(review.resumedDoubleDigit);
  assert.equal(review.totals.import, 168);
  assert.equal(review.totals.export, 100);
  // 每个增减值可沿商品类别找到货物与数据来源
  const ore = review.contributions.find((c) => c.category === '矿石原料');
  assert.equal(ore.delta, 13);
  assert.equal(ore.items[0].key, 'C:C260803');
  assert.deepEqual(
    ore.items[0].sources.map((s) => s.channel),
    ['企业自报', '海关反馈'],
  );
});

test('周研判列出迟到数据及其归入的实际期间', async () => {
  const platform = await loadPlatformWithReleases();
  const review = reviewAt(platform, '2026-09-27', '2026-09-20');
  assert.equal(review.lateArrivals.length, 1);
  assert.equal(review.lateArrivals[0].key, 'C:C260702');
  assert.equal(review.lateArrivals[0].period, '2026-07');
  assert.equal(review.lateArrivals[0].knownAt, '2026-09-05');
  assert.deepEqual(
    review.releases.map((r) => [r.period, r.version]),
    [
      ['2026-07', 1],
      ['2026-07', 2],
    ],
  );
});

test('一企一策的责任人、承诺期限和办理结果进入下一次周研判', async () => {
  const platform = await loadPlatformWithReleases();
  // 上一次周研判：三项均在办理中
  const early = reviewAt(platform, '2026-09-20');
  assert.deepEqual(early.serviceItems.open.map((i) => i.id).sort(), ['SI-001', 'SI-002', 'SI-003']);
  assert.equal(early.serviceItems.resolved.length, 0);
  // 本次周研判：SI-002 的办理结果进入材料，其余继续跟踪
  const review = reviewAt(platform, '2026-09-27', '2026-09-20');
  assert.deepEqual(review.serviceItems.resolved.map((i) => i.id), ['SI-002']);
  assert.equal(review.serviceItems.resolved[0].result, '口岸联合查验通道当日办结，9月22日放行');
  assert.deepEqual(review.serviceItems.open.map((i) => i.id).sort(), ['SI-001', 'SI-003']);
  // 会上可当场回答由谁处理、承诺何时办结
  const train = review.serviceItems.open.find((i) => i.id === 'SI-001');
  assert.equal(train.kind, '班列计划');
  assert.equal(train.owner, '市州调度员-07');
  assert.equal(train.committedBy, '2026-09-30');
  assert.equal(train.overdue, false);
  const cold = review.serviceItems.open.find((i) => i.id === 'SI-003');
  assert.equal(cold.owner, '市州调度员-12');
  assert.ok(cold.overdue);
});

test('缺少上年同期基期资料时报错', async () => {
  const platform = await loadPlatformWithReleases();
  const wrong = { ...platform.sample.priorYear, period: '2024-08' };
  assert.throws(
    () =>
      buildWeeklyReview({
        ledger: platform.ledger,
        store: platform.store,
        priorYear: wrong,
        importGrowth: platform.sample.importGrowth,
        asOf: '2026-09-27',
      }),
    /上年同期/,
  );
});

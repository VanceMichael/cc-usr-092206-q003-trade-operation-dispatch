import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregate, compare, lateArrivals, monthsSinceDoubleDigit } from '../src/statistics.js';
import { loadPlatform } from './helpers.js';

test('按实际统计期间归集并保留逐票来源', async () => {
  const platform = await loadPlatform();
  const shipments = [...platform.ledger.shipments.values()];
  const aug = aggregate(shipments, { period: '2026-08', direction: 'import' });
  assert.equal(aug.total, 168);
  assert.equal(aug.categories['热带水果'].value, 48);
  assert.equal(aug.categories['热带水果'].count, 2);
  assert.equal(aug.categories['矿石原料'].value, 85);
  assert.equal(aug.categories['冷水鱼'].value, 35);
  const durian = aug.categories['热带水果'].items.find((item) => item.key === 'C:C260801');
  assert.deepEqual(
    durian.sources.map((source) => source.channel),
    ['企业自报', '市州汇总'],
  );
  const exp = aggregate(shipments, { period: '2026-08', direction: 'export' });
  assert.equal(exp.total, 100);
  assert.equal(exp.categories['盐湖化工'].count, 2);
});

test('增减值按商品类别分解且合计一致', async () => {
  const platform = await loadPlatform();
  const shipments = [...platform.ledger.shipments.values()];
  const current = aggregate(shipments, { period: '2026-08', direction: 'import' });
  const previous = {
    period: '2025-08',
    direction: 'import',
    total: 150,
    categories: {
      热带水果: { value: 40, count: 0, items: [] },
      矿石原料: { value: 72, count: 0, items: [] },
      冷水鱼: { value: 38, count: 0, items: [] },
    },
  };
  const cmp = compare(current, previous);
  assert.equal(cmp.delta, 18);
  assert.ok(Math.abs(cmp.growth - 0.12) < 1e-9);
  assert.deepEqual(
    cmp.contributions.map((c) => [c.category, c.delta]),
    [
      ['矿石原料', 13],
      ['热带水果', 8],
      ['冷水鱼', -3],
    ],
  );
  assert.equal(cmp.contributions.reduce((sum, c) => sum + c.delta, 0), cmp.delta);
});

test('迟到的报关结果归入实际统计期间并注明获知时间', async () => {
  const platform = await loadPlatform();
  const shipments = [...platform.ledger.shipments.values()];
  const late = lateArrivals(shipments);
  assert.equal(late.length, 1);
  assert.equal(late[0].key, 'C:C260702');
  assert.equal(late[0].period, '2026-07');
  assert.equal(late[0].knownAt, '2026-09-05');
  assert.equal(late[0].value, 12);
  // 迟到票计入 7 月而非获知的 9 月
  const july = aggregate(shipments, { period: '2026-07', direction: 'import' });
  assert.equal(july.total, 132);
});

test('距上一次两位数增长的月数', async () => {
  const platform = await loadPlatform();
  assert.equal(monthsSinceDoubleDigit(platform.sample.importGrowth, '2026-08'), 32);
  assert.equal(monthsSinceDoubleDigit(platform.sample.importGrowth, '2024-01'), 1);
  assert.equal(monthsSinceDoubleDigit([], '2026-08'), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveValue } from '../src/identity.js';
import { aggregate } from '../src/statistics.js';
import { loadPlatform } from './helpers.js';

test('同一票货物无论由谁报送只计一次', async () => {
  const platform = await loadPlatform();
  // 11 条报送记录归并为 8 票
  assert.equal(platform.ledger.shipments.size, 8);
  const merged = platform.ledger.shipments.get('C:C260801');
  assert.deepEqual(
    merged.sources.map((source) => source.channel),
    ['企业自报', '市州汇总'],
  );
  const shipments = [...platform.ledger.shipments.values()];
  const aug = aggregate(shipments, { period: '2026-08', direction: 'import' });
  assert.equal(aug.total, 168);
});

test('数值冲突以海关反馈为准', async () => {
  const platform = await loadPlatform();
  const ore = platform.ledger.shipments.get('C:C260803');
  assert.equal(resolveValue(ore), 85);
});

test('同一票标识归属不同企业时报错', async () => {
  const platform = await loadPlatform();
  assert.throws(
    () =>
      platform.ledger.ingestDeclaration({
        customsNo: 'C260801',
        enterpriseId: 'ENT-009',
        direction: 'import',
        category: '热带水果',
        goods: '冒名货物',
        value: 1,
        occurredAt: '2026-08-12',
        reporter: 'ENT-009',
        channel: '企业自报',
        reportedAt: '2026-08-13',
      }),
    /不同企业/,
  );
});

test('一企一策事项必须带责任人、承诺期限，办结必须带办理结果', async () => {
  const platform = await loadPlatform();
  assert.throws(
    () =>
      platform.ledger.ingestServiceItem({
        id: 'SI-900',
        enterpriseId: 'ENT-001',
        kind: '班列计划',
        summary: '缺责任人',
        committedBy: '2026-10-01',
        openedAt: '2026-09-26',
      }),
    /owner/,
  );
  assert.throws(
    () =>
      platform.ledger.ingestServiceItem({
        id: 'SI-901',
        enterpriseId: 'ENT-001',
        kind: '单证堵点',
        summary: '办结但无结果',
        owner: '省级协调员-01',
        committedBy: '2026-10-01',
        openedAt: '2026-09-26',
        status: 'done',
      }),
    /办理结果/,
  );
});

test('服务事项可登记并办结', async () => {
  const platform = await loadPlatform();
  platform.ledger.ingestServiceItem({
    id: 'SI-902',
    enterpriseId: 'ENT-001',
    kind: '班列计划',
    summary: '节前舱位协调',
    owner: '市州调度员-01',
    committedBy: '2026-10-05',
    openedAt: '2026-09-26',
  });
  const done = platform.ledger.updateServiceItem('SI-902', {
    status: 'done',
    result: '已协调加挂舱位',
    closedAt: '2026-09-30',
  });
  assert.equal(done.status, 'done');
  assert.equal(done.result, '已协调加挂舱位');
});

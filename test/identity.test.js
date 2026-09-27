import test from 'node:test';
import assert from 'node:assert/strict';
import { shipmentKey, resolveValue } from '../src/identity.js';

test('报关单号生成票级标识并规范化', () => {
  assert.equal(shipmentKey({ customsNo: ' c260801 ' }), 'C:C260801');
});

test('无报关单号时退回运输工具+提单号+企业组合', () => {
  const key = shipmentKey({ carrier: 'X8021 班列 ', blNo: 'bl260801', enterpriseId: 'ent-001' });
  assert.equal(key, 'T:X8021 班列|BL260801|ENT-001');
});

test('缺少可归并标识时报错', () => {
  assert.throws(() => shipmentKey({ enterpriseId: 'ENT-001' }), /票级标识/);
});

test('数值冲突时以权威渠道为准', () => {
  const shipment = {
    sources: [
      { channel: '企业自报', reportedAt: '2026-08-10', value: 84 },
      { channel: '海关反馈', reportedAt: '2026-08-25', value: 85 },
    ],
  };
  assert.equal(resolveValue(shipment), 85);
});

test('同级渠道以报送时间晚者为准', () => {
  const shipment = {
    sources: [
      { channel: '企业自报', reportedAt: '2026-08-10', value: 40 },
      { channel: '企业自报', reportedAt: '2026-08-12', value: 41 },
    ],
  };
  assert.equal(resolveValue(shipment), 41);
});

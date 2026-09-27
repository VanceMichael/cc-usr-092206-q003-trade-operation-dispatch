import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDomain } from '../src/domain.js';

async function loadSample() {
  const raw = await readFile(new URL('../fixtures/domain.json', import.meta.url), 'utf8');
  return parseDomain(raw);
}

test('样例领域标识正确', async () => {
  const value = await loadSample();
  assert.equal(value.domain, 'trade-operation-dispatch');
  assert.ok(value.constraints.length >= 2);
});

test('平台贯通企业、市州和省级三级', async () => {
  const value = await loadSample();
  assert.deepEqual(value.platform.levels, ['企业', '市州', '省级']);
  assert.ok(value.platform.monitored_commodities.includes('热带水果'));
  assert.ok(value.platform.monitored_commodities.includes('盐湖化工'));
});

test('同一票货物只计一次且迟到数据可追溯', async () => {
  const value = await loadSample();
  assert.match(value.platform.dedup, /只计一次/);
  assert.match(value.platform.late_arrival, /实际统计期间/);
  assert.match(value.platform.late_arrival, /获知时间/);
  assert.match(value.platform.publication, /保留原版本/);
});

test('分级视图职责清晰', async () => {
  const value = await loadSample();
  assert.match(value.platform.access.enterprise, /自身/);
  assert.match(value.platform.access.prefecture, /辖区协调/);
  assert.match(value.platform.access.province, /下钻/);
  assert.match(value.platform.access.province, /数据来源/);
});

test('一企一策承诺进入下一次周研判', async () => {
  const value = await loadSample();
  assert.deepEqual(value.platform.commitment.fields, ['责任人', '承诺期限', '办理结果']);
  assert.match(value.platform.commitment.carry_into, /周研判/);
});

test('缺少平台资料时读取失败', async () => {
  const value = await loadSample();
  delete value.platform;
  assert.throws(() => parseDomain(JSON.stringify(value)), /平台资料缺少必要字段/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSample } from '../src/sample.js';
import { loadSample } from './helpers.js';

test('平台示例资料可稳定读取', async () => {
  const sample = await loadSample();
  assert.equal(sample.sample_id, 'platform-sample-001');
  assert.ok(sample.declarations.length >= 10);
  assert.ok(sample.serviceItems.length >= 3);
});

test('示例资料缺少必要部分时报错', () => {
  assert.throws(() => parseSample('{"sample_id":"x"}'), /缺少必要部分/);
});

test('报送记录指向名录外企业时报错', async () => {
  const sample = await loadSample();
  const broken = JSON.parse(JSON.stringify(sample));
  broken.declarations[0].enterpriseId = 'ENT-999';
  assert.throws(() => parseSample(JSON.stringify(broken)), /名录外企业/);
});

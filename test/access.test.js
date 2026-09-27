import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLES, makeActor, scopeShipments, scopeServiceItems, assertCanSubmit } from '../src/access.js';
import { loadPlatform } from './helpers.js';

test('企业登录后只见自身申报和服务事项', async () => {
  const platform = await loadPlatform();
  const actor = makeActor({ role: ROLES.ENTERPRISE, enterpriseId: 'ENT-001' });
  const shipments = scopeShipments([...platform.ledger.shipments.values()], actor, platform.directory);
  assert.deepEqual(shipments.map((s) => s.key).sort(), ['C:C260702', 'C:C260801']);
  const items = scopeServiceItems([...platform.ledger.serviceItems.values()], actor, platform.directory);
  assert.deepEqual(items.map((i) => i.id), ['SI-002']);
});

test('市州承担辖区协调，只见辖区企业', async () => {
  const platform = await loadPlatform();
  const pf01 = makeActor({ role: ROLES.PREFECTURE, prefectureId: 'PF-01' });
  const pf02 = makeActor({ role: ROLES.PREFECTURE, prefectureId: 'PF-02' });
  const all = [...platform.ledger.shipments.values()];
  assert.equal(scopeShipments(all, pf01, platform.directory).length, 5);
  assert.equal(scopeShipments(all, pf02, platform.directory).length, 3);
  const items = [...platform.ledger.serviceItems.values()];
  assert.deepEqual(scopeServiceItems(items, pf01, platform.directory).map((i) => i.id), ['SI-002']);
  assert.deepEqual(scopeServiceItems(items, pf02, platform.directory).map((i) => i.id).sort(), ['SI-001', 'SI-003']);
});

test('省级视图贯通全量', async () => {
  const platform = await loadPlatform();
  const actor = makeActor({ role: ROLES.PROVINCE });
  assert.equal(scopeShipments([...platform.ledger.shipments.values()], actor, platform.directory).length, 8);
  assert.equal(scopeServiceItems([...platform.ledger.serviceItems.values()], actor, platform.directory).length, 3);
});

test('角色标识缺失时报错', () => {
  assert.throws(() => makeActor({ role: ROLES.ENTERPRISE }), /企业标识/);
  assert.throws(() => makeActor({ role: ROLES.PREFECTURE }), /辖区标识/);
  assert.throws(() => makeActor({ role: 'guest' }), /未知角色/);
});

test('企业不可代他人提交申报或服务事项', async () => {
  const actor = makeActor({ role: ROLES.ENTERPRISE, enterpriseId: 'ENT-001' });
  assert.throws(() => assertCanSubmit(actor, 'ENT-002'), /自身/);
  assert.doesNotThrow(() => assertCanSubmit(actor, 'ENT-001'));
  const province = makeActor({ role: ROLES.PROVINCE });
  assert.doesNotThrow(() => assertCanSubmit(province, 'ENT-002'));
});

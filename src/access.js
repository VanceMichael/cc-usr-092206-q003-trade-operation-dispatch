// 分级视图：企业仅处理自身申报和服务事项，市州承担辖区协调，省级贯通全量。
export const ROLES = Object.freeze({
  ENTERPRISE: 'enterprise',
  PREFECTURE: 'prefecture',
  PROVINCE: 'province',
});

export function makeActor({ role, enterpriseId = null, prefectureId = null }) {
  if (!Object.values(ROLES).includes(role)) {
    throw new Error(`未知角色: ${role}`);
  }
  if (role === ROLES.ENTERPRISE && !enterpriseId) {
    throw new Error('企业角色缺少企业标识');
  }
  if (role === ROLES.PREFECTURE && !prefectureId) {
    throw new Error('市州角色缺少辖区标识');
  }
  return Object.freeze({ role, enterpriseId, prefectureId });
}

function prefectureOf(directory, enterpriseId) {
  return directory.get(enterpriseId)?.prefectureId ?? null;
}

export function canViewEnterprise(actor, directory, enterpriseId) {
  if (actor.role === ROLES.PROVINCE) {
    return true;
  }
  if (actor.role === ROLES.ENTERPRISE) {
    return actor.enterpriseId === enterpriseId;
  }
  return actor.prefectureId === prefectureOf(directory, enterpriseId);
}

export function scopeShipments(shipments, actor, directory) {
  return shipments.filter((shipment) => canViewEnterprise(actor, directory, shipment.enterpriseId));
}

export function scopeServiceItems(items, actor, directory) {
  return items.filter((item) => canViewEnterprise(actor, directory, item.enterpriseId));
}

// 提交守卫：企业登录后只处理自身申报和服务事项；市州、省级为协调角色，可代录辖区资料。
export function assertCanSubmit(actor, enterpriseId) {
  if (actor.role === ROLES.ENTERPRISE && actor.enterpriseId !== enterpriseId) {
    throw new Error('企业仅可处理自身申报和服务事项');
  }
}

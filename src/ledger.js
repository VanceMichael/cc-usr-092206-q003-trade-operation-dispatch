// 台账：归并进出口报送，登记一企一策服务事项。
import { shipmentKey } from './identity.js';

const SERVICE_ITEM_REQUIRED = ['id', 'enterpriseId', 'kind', 'summary', 'owner', 'committedBy', 'openedAt'];

export function createLedger() {
  const shipments = new Map();
  const serviceItems = new Map();

  // 归并一条报送记录：同票合并来源，统计期间按实际发生日期归期。
  function ingestDeclaration(decl) {
    const key = shipmentKey(decl);
    const source = {
      reporter: decl.reporter,
      channel: decl.channel,
      reportedAt: decl.reportedAt,
      knownAt: decl.knownAt ?? decl.reportedAt,
      value: decl.value,
    };
    const existing = shipments.get(key);
    if (!existing) {
      const created = {
        key,
        enterpriseId: decl.enterpriseId,
        direction: decl.direction,
        category: decl.category,
        goods: decl.goods,
        occurredAt: decl.occurredAt,
        period: String(decl.occurredAt).slice(0, 7),
        sources: [source],
      };
      shipments.set(key, created);
      return created;
    }
    if (existing.enterpriseId !== decl.enterpriseId) {
      throw new Error(`同一票标识归属不同企业: ${key}`);
    }
    existing.sources.push(source);
    return existing;
  }

  // 登记一企一策事项：责任人、承诺期限缺一不可，办结必须填写办理结果。
  function ingestServiceItem(item) {
    for (const field of SERVICE_ITEM_REQUIRED) {
      if (!item[field]) {
        throw new Error(`一企一策事项缺少必要字段: ${field}`);
      }
    }
    if (serviceItems.has(item.id)) {
      throw new Error(`一企一策事项标识重复: ${item.id}`);
    }
    const record = { status: 'open', ...item };
    if (record.status === 'done' && !record.result) {
      throw new Error(`一企一策事项已办结但缺少办理结果: ${record.id}`);
    }
    serviceItems.set(record.id, record);
    return record;
  }

  function updateServiceItem(id, patch) {
    const item = serviceItems.get(id);
    if (!item) {
      throw new Error(`一企一策事项不存在: ${id}`);
    }
    const next = { ...item, ...patch };
    if (next.status === 'done' && !next.result) {
      throw new Error(`一企一策事项已办结但缺少办理结果: ${id}`);
    }
    serviceItems.set(id, next);
    return next;
  }

  return { shipments, serviceItems, ingestDeclaration, ingestServiceItem, updateServiceItem };
}

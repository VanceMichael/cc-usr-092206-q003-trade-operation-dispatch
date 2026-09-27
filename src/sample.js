// 读取并检查日监测平台示例资料，结构约定见 contracts/platform-sample.schema.json。
const DECLARATION_REQUIRED = ['enterpriseId', 'direction', 'category', 'goods', 'value', 'occurredAt', 'reporter', 'channel', 'reportedAt'];
const SERVICE_ITEM_REQUIRED = ['id', 'enterpriseId', 'kind', 'summary', 'owner', 'committedBy', 'status', 'openedAt'];
const CHANNELS = new Set(['企业自报', '市州汇总', '海关反馈']);

export function parseSample(raw) {
  const value = JSON.parse(raw);
  for (const section of ['sample_id', 'unit', 'prefectures', 'directory', 'declarations', 'serviceItems', 'importGrowth', 'priorYear']) {
    if (value[section] === undefined) {
      throw new Error(`示例资料缺少必要部分: ${section}`);
    }
  }
  if (!Array.isArray(value.prefectures) || value.prefectures.length < 1) {
    throw new Error('示例资料缺少必要部分: prefectures');
  }
  if (!Array.isArray(value.directory) || value.directory.length < 2) {
    throw new Error('示例资料缺少必要部分: directory');
  }
  const prefectureIds = new Set(value.prefectures.map((p) => p.prefectureId));
  const enterpriseIds = new Set();
  for (const entry of value.directory) {
    if (!entry.enterpriseId || !entry.name || !entry.prefectureId) {
      throw new Error('名录条目缺少必要字段');
    }
    if (!prefectureIds.has(entry.prefectureId)) {
      throw new Error(`名录条目指向未知辖区: ${entry.prefectureId}`);
    }
    if (enterpriseIds.has(entry.enterpriseId)) {
      throw new Error(`名录企业标识重复: ${entry.enterpriseId}`);
    }
    enterpriseIds.add(entry.enterpriseId);
  }
  if (!Array.isArray(value.declarations) || value.declarations.length < 1) {
    throw new Error('示例资料缺少必要部分: declarations');
  }
  for (const decl of value.declarations) {
    for (const field of DECLARATION_REQUIRED) {
      if (decl[field] === undefined) {
        throw new Error(`报送记录缺少必要字段: ${field}`);
      }
    }
    if (!CHANNELS.has(decl.channel)) {
      throw new Error(`报送记录渠道无效: ${decl.channel}`);
    }
    if (!enterpriseIds.has(decl.enterpriseId)) {
      throw new Error(`报送记录指向名录外企业: ${decl.enterpriseId}`);
    }
    if (!decl.customsNo && !(decl.carrier && decl.blNo)) {
      throw new Error('报送记录缺少可归并的票级标识(报关单号或运输工具+提单号)');
    }
  }
  if (!Array.isArray(value.serviceItems) || value.serviceItems.length < 1) {
    throw new Error('示例资料缺少必要部分: serviceItems');
  }
  for (const item of value.serviceItems) {
    for (const field of SERVICE_ITEM_REQUIRED) {
      if (item[field] === undefined) {
        throw new Error(`一企一策事项缺少必要字段: ${field}`);
      }
    }
    if (!enterpriseIds.has(item.enterpriseId)) {
      throw new Error(`一企一策事项指向名录外企业: ${item.enterpriseId}`);
    }
    if (item.status === 'done' && !item.result) {
      throw new Error(`一企一策事项已办结但缺少办理结果: ${item.id}`);
    }
  }
  if (!Array.isArray(value.importGrowth) || value.importGrowth.length < 2) {
    throw new Error('示例资料缺少必要部分: importGrowth');
  }
  const prior = value.priorYear;
  if (!prior.period || !prior.direction || typeof prior.total !== 'number' || !prior.categories || Object.keys(prior.categories).length < 1) {
    throw new Error('上年同期基期资料不完整');
  }
  return value;
}

// 票级身份与归并：同一票货物无论由谁报送，只计一次。

// 报送渠道的权威等级：数值冲突时以等级高者为准，等级相同以报送时间晚者为准。
export const CHANNEL_AUTHORITY = Object.freeze({
  海关反馈: 3,
  市州汇总: 2,
  企业自报: 1,
});

function norm(text) {
  return typeof text === 'string' ? text.trim().toUpperCase() : '';
}

// 生成票级标识：优先报关单号；缺失时退回 运输工具+提单号+企业 组合。
export function shipmentKey(decl) {
  const customsNo = norm(decl.customsNo);
  if (customsNo) {
    return `C:${customsNo}`;
  }
  const carrier = norm(decl.carrier);
  const blNo = norm(decl.blNo);
  const enterpriseId = norm(decl.enterpriseId);
  if (carrier && blNo && enterpriseId) {
    return `T:${carrier}|${blNo}|${enterpriseId}`;
  }
  throw new Error('缺少可归并的票级标识(报关单号或运输工具+提单号+企业)');
}

// 从多条报送来源中裁定票面数值。
export function resolveValue(shipment) {
  const ranked = [...shipment.sources].sort((a, b) => {
    const byAuthority = (CHANNEL_AUTHORITY[b.channel] ?? 0) - (CHANNEL_AUTHORITY[a.channel] ?? 0);
    if (byAuthority !== 0) {
      return byAuthority;
    }
    return String(b.reportedAt).localeCompare(String(a.reportedAt));
  });
  return ranked.length ? ranked[0].value : 0;
}

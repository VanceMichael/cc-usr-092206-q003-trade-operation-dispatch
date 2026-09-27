// 统计与溯源：按实际统计期间归集，每个增减值可分解到票、商品类别与数据来源。
import { resolveValue } from './identity.js';

// 归集某一统计期间、某一方向的票面数值，保留逐票来源。
export function aggregate(shipments, { period, direction }) {
  const categories = {};
  let total = 0;
  for (const shipment of shipments) {
    if (shipment.period !== period || shipment.direction !== direction) {
      continue;
    }
    const value = resolveValue(shipment);
    const cell = (categories[shipment.category] ??= { value: 0, count: 0, items: [] });
    cell.value += value;
    cell.count += 1;
    total += value;
    cell.items.push({
      key: shipment.key,
      goods: shipment.goods,
      enterpriseId: shipment.enterpriseId,
      value,
      sources: shipment.sources.map((source) => ({
        channel: source.channel,
        reporter: source.reporter,
        reportedAt: source.reportedAt,
      })),
    });
  }
  return { period, direction, total, categories };
}

// 两期对比：增减值按商品类别分解，逐票明细随类别携带。
export function compare(current, previous) {
  const names = new Set([...Object.keys(current.categories), ...Object.keys(previous.categories)]);
  const contributions = [...names]
    .map((category) => {
      const cur = current.categories[category]?.value ?? 0;
      const prev = previous.categories[category]?.value ?? 0;
      return {
        category,
        current: cur,
        previous: prev,
        delta: cur - prev,
        items: current.categories[category]?.items ?? [],
      };
    })
    .sort((a, b) => b.delta - a.delta);
  const delta = current.total - previous.total;
  return {
    period: current.period,
    basePeriod: previous.period,
    delta,
    growth: previous.total === 0 ? null : delta / previous.total,
    contributions,
  };
}

// 迟到的报送结果：获知时间晚于实际统计期间。
export function isLateArrival(shipment) {
  return shipment.sources.some((source) => String(source.knownAt).slice(0, 7) > shipment.period);
}

// 迟到清单：归入实际统计期间，并注明获知时间。
export function lateArrivals(shipments) {
  return shipments.filter(isLateArrival).map((shipment) => {
    const knownAt = shipment.sources
      .map((source) => source.knownAt)
      .filter((at) => String(at).slice(0, 7) > shipment.period)
      .sort()
      .at(-1);
    return {
      key: shipment.key,
      goods: shipment.goods,
      category: shipment.category,
      value: resolveValue(shipment),
      period: shipment.period,
      knownAt,
    };
  });
}

// 距上一次两位数增长的月数；从未达到返回 null。
export function monthsSinceDoubleDigit(series, period, threshold = 0.1) {
  const hit = series
    .filter((entry) => entry.period < period && entry.growth >= threshold)
    .map((entry) => entry.period)
    .sort()
    .at(-1);
  return hit ? monthDiff(hit, period) : null;
}

function monthDiff(a, b) {
  const [ya, ma] = a.split('-').map(Number);
  const [yb, mb] = b.split('-').map(Number);
  return (yb - ya) * 12 + (mb - ma);
}

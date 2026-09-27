// 周研判：把最新态势、增减值溯源、迟到数据与一企一策进展汇入同一份周调度材料。
import { aggregate, compare, lateArrivals, monthsSinceDoubleDigit } from './statistics.js';

function priorYearOf(period) {
  const [year, month] = period.split('-').map(Number);
  return `${year - 1}-${String(month).padStart(2, '0')}`;
}

function priorYearAggregate(priorYear) {
  const categories = {};
  for (const [category, value] of Object.entries(priorYear.categories)) {
    categories[category] = { value, count: 0, items: [] };
  }
  return { period: priorYear.period, direction: priorYear.direction, total: priorYear.total, categories };
}

// 在 asOf 时点是否已办结：办结时间晚于 asOf 的事项视为仍在办理。
function isDoneAt(item, asOf) {
  return item.status === 'done' && String(item.closedAt ?? '9999-12-31') <= asOf;
}

export function buildWeeklyReview({ ledger, store, priorYear, importGrowth, asOf, previousReviewAt = null }) {
  const shipments = [...ledger.shipments.values()];
  if (!shipments.length) {
    throw new Error('台账中没有任何货物，无法形成周研判');
  }
  const period = shipments.map((shipment) => shipment.period).sort().at(-1);
  const expectedPrior = priorYearOf(period);
  if (priorYear.period !== expectedPrior) {
    throw new Error(`缺少上年同期基期资料: ${expectedPrior}`);
  }

  const currentImport = aggregate(shipments, { period, direction: 'import' });
  const currentExport = aggregate(shipments, { period, direction: 'export' });
  const cmp = compare(currentImport, priorYearAggregate(priorYear));
  const monthsSince = monthsSinceDoubleDigit(importGrowth, period);

  const items = [...ledger.serviceItems.values()];
  const open = items
    .filter((item) => !isDoneAt(item, asOf))
    .map((item) => ({ ...item, overdue: item.committedBy < asOf }));
  const resolved = items.filter(
    (item) => isDoneAt(item, asOf) && (!previousReviewAt || item.closedAt > previousReviewAt),
  );

  return {
    asOf,
    period,
    totals: { import: currentImport.total, export: currentExport.total },
    growth: cmp.growth,
    monthsSinceDoubleDigit: monthsSince,
    resumedDoubleDigit: cmp.growth !== null && cmp.growth >= 0.1 && monthsSince !== null,
    contributions: cmp.contributions,
    lateArrivals: lateArrivals(shipments),
    serviceItems: { open, resolved },
    releases: store
      .listAll()
      .map((release) => ({
        period: release.period,
        direction: release.direction,
        version: release.version,
        caliber: release.caliber,
        publishedAt: release.publishedAt,
      })),
  };
}

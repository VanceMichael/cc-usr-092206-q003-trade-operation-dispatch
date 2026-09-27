// 周研判演示：从示例资料生成一份周调度材料，并展示分级视图。
// 运行：npm run demo
import { readFile } from 'node:fs/promises';
import { parseSample } from '../src/sample.js';
import { buildPlatform, ingestDeclarations, ingestServiceItems, publishPeriod } from '../src/platform.js';
import { buildWeeklyReview } from '../src/weekly.js';
import { ROLES, makeActor, scopeShipments, scopeServiceItems } from '../src/access.js';

const raw = await readFile(new URL('../fixtures/platform-sample.json', import.meta.url), 'utf8');
const sample = parseSample(raw);
const platform = buildPlatform(sample);

// 第一阶段：2026-08-10 前获知的资料装账，发布 7 月第 1 版。
const knownAt = (decl) => decl.knownAt ?? decl.reportedAt;
ingestDeclarations(platform, sample.declarations.filter((decl) => knownAt(decl) <= '2026-08-10'));
publishPeriod(platform, {
  period: '2026-07',
  direction: 'import',
  caliber: '海关统计口径(万元,按放行日期归期)',
  conclusions: ['7月进口120万元,热带水果为主力'],
  publishedAt: '2026-08-10',
});

// 第二阶段：其余资料装账(含 9 月才获知的 7 月迟到报关结果)，发布第 2 版。
ingestDeclarations(platform, sample.declarations.filter((decl) => knownAt(decl) > '2026-08-10'));
publishPeriod(platform, {
  period: '2026-07',
  direction: 'import',
  caliber: '海关统计口径(万元,按放行日期归期,含迟到补录)',
  conclusions: ['补录1票迟到报关结果,7月进口上修至132万元'],
  publishedAt: '2026-09-10',
});
ingestServiceItems(platform, sample.serviceItems);

const asOf = '2026-09-27';
const review = buildWeeklyReview({
  ledger: platform.ledger,
  store: platform.store,
  priorYear: sample.priorYear,
  importGrowth: sample.importGrowth,
  asOf,
  previousReviewAt: '2026-09-20',
});

const pct = (value) => `${(value * 100).toFixed(1)}%`;
const fmt = (value) => `${value} 万元`;

console.log(`外贸运行周研判（截至 ${asOf}，单位：${sample.unit}）`);
console.log('='.repeat(48));

console.log('\n一、运行态势');
console.log(
  `- ${review.period} 进口 ${fmt(review.totals.import)}，同比 +${pct(review.growth)}，`
    + `为 ${review.monthsSinceDoubleDigit} 个月以来首次恢复两位数增长`,
);
console.log(`- ${review.period} 出口 ${fmt(review.totals.export)}`);

console.log('\n二、增减值溯源（进口同比分解，可逐级下钻到票与来源）');
for (const c of review.contributions) {
  const sign = c.delta >= 0 ? '+' : '';
  console.log(`- ${c.category} ${sign}${fmt(c.delta)}（本期 ${fmt(c.current)}，上年同期 ${fmt(c.previous)}）`);
  for (const item of c.items) {
    const channels = item.sources.map((s) => s.channel).join('/');
    console.log(`    ${item.goods} ${fmt(item.value)}｜票 ${item.key}｜来源 ${channels}`);
  }
}

console.log('\n三、迟到数据（归入实际统计期间，注明获知时间）');
for (const late of review.lateArrivals) {
  console.log(`- 票 ${late.key}（${late.goods} ${fmt(late.value)}）实际期间 ${late.period}，${late.knownAt} 获知`);
}
for (const release of review.releases.filter((r) => r.period === '2026-07')) {
  console.log(`- 2026-07 进口第 ${release.version} 版（${release.publishedAt} 发布）：${release.caliber}`);
}
console.log('- 已发布版本保留原口径与结论，补录只出新版本');

console.log('\n四、一企一策（责任人、承诺期限、办理结果进入本次周研判）');
for (const item of review.serviceItems.open) {
  const tag = item.overdue ? '【逾期】' : '';
  console.log(`- 办理中${tag} ${item.id} ${item.kind}（${item.enterpriseId}）：${item.summary}`);
  console.log(`    责任人 ${item.owner}，承诺 ${item.committedBy} 前办结`);
}
for (const item of review.serviceItems.resolved) {
  console.log(`- 本期办结 ${item.id} ${item.kind}（${item.enterpriseId}）：${item.result}`);
}

console.log('\n五、分级视图（同一台账，各见其所）');
const actors = [
  ['企业 ENT-001', makeActor({ role: ROLES.ENTERPRISE, enterpriseId: 'ENT-001' })],
  ['市州 PF-01', makeActor({ role: ROLES.PREFECTURE, prefectureId: 'PF-01' })],
  ['市州 PF-02', makeActor({ role: ROLES.PREFECTURE, prefectureId: 'PF-02' })],
  ['省级', makeActor({ role: ROLES.PROVINCE })],
];
const allShipments = [...platform.ledger.shipments.values()];
const allItems = [...platform.ledger.serviceItems.values()];
for (const [label, actor] of actors) {
  const s = scopeShipments(allShipments, actor, platform.directory).length;
  const i = scopeServiceItems(allItems, actor, platform.directory).length;
  console.log(`- ${label}：可见 ${s} 票货物、${i} 项服务事项`);
}

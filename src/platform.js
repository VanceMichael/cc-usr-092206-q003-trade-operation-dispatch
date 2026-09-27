// 组合根：把示例资料装入台账与发布库，供演示与测试复用。
import { createLedger } from './ledger.js';
import { createReleaseStore } from './publish.js';
import { aggregate } from './statistics.js';

export function buildPlatform(sample) {
  const directory = new Map(sample.directory.map((entry) => [entry.enterpriseId, entry]));
  const ledger = createLedger();
  const store = createReleaseStore();
  return { ledger, store, directory, sample };
}

export function ingestDeclarations(platform, declarations) {
  for (const decl of declarations) {
    platform.ledger.ingestDeclaration(decl);
  }
}

export function ingestServiceItems(platform, items) {
  for (const item of items) {
    platform.ledger.ingestServiceItem(item);
  }
}

// 按当前台账归集并发布某一期间的新版本。
export function publishPeriod(platform, { period, direction, caliber, conclusions, publishedAt }) {
  const snapshot = aggregate([...platform.ledger.shipments.values()], { period, direction });
  return platform.store.publish({ period, direction, caliber, snapshot, conclusions, publishedAt });
}

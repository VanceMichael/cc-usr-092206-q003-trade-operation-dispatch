// 发布版本：每一期的口径与结论一经发布即冻结，后续补录只出新版本，原版本保留。
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const key of Object.keys(value)) {
      deepFreeze(value[key]);
    }
    Object.freeze(value);
  }
  return value;
}

export function createReleaseStore() {
  const releases = [];

  return {
    publish(input) {
      for (const field of ['period', 'direction', 'caliber', 'snapshot', 'conclusions', 'publishedAt']) {
        if (input[field] === undefined) {
          throw new Error(`发布版本缺少必要字段: ${field}`);
        }
      }
      const version = releases.filter((r) => r.period === input.period && r.direction === input.direction).length + 1;
      const release = deepFreeze({ ...input, version });
      releases.push(release);
      return release;
    },

    get(period, direction, version = null) {
      const hits = releases.filter((r) => r.period === period && r.direction === direction);
      if (!hits.length) {
        return null;
      }
      return version === null ? hits.at(-1) : hits.find((r) => r.version === version) ?? null;
    },

    list(period, direction) {
      return releases.filter((r) => r.period === period && r.direction === direction);
    },

    listAll() {
      return [...releases];
    },
  };
}

// 读取并检查项目共享的领域资料。
export function parseDomain(raw) {
  const value = JSON.parse(raw);
  if (!value.domain || !value.version || !value.sample_id || !Array.isArray(value.actors) || value.actors.length < 2 || !Array.isArray(value.facts) || value.facts.length < 2 || !Array.isArray(value.constraints) || value.constraints.length < 2) {
    throw new Error('共享资料缺少必要字段');
  }
  const platform = value.platform;
  if (!platform || !platform.name || !Array.isArray(platform.levels) || platform.levels.length < 3 || !platform.cadence || !Array.isArray(platform.monitored_commodities) || platform.monitored_commodities.length < 2 || !platform.dedup || !platform.late_arrival || !platform.publication) {
    throw new Error('平台资料缺少必要字段');
  }
  const access = platform.access;
  if (!access || !access.enterprise || !access.prefecture || !access.province) {
    throw new Error('平台资料缺少分级视图说明');
  }
  const commitment = platform.commitment;
  if (!commitment || !Array.isArray(commitment.fields) || commitment.fields.length < 3 || !commitment.carry_into) {
    throw new Error('平台资料缺少一企一策承诺闭环说明');
  }
  return value;
}

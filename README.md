# 外贸运行调度台账

贯通企业、市州和省级部门的外贸日监测平台领域核心：记录外贸货物、企业诉求和分级调度，形成可解释统计，支撑每周外贸运行调度会当场说明增减原因、当场回答事项由谁处理。

## 仓库内容

- `contracts/` 共享资料结构约定（`domain.schema.json` 为领域资料，`platform-sample.schema.json` 为平台示例资料）
- `fixtures/` 不含真实个人信息的示例资料（`domain.json` 为领域事实，`platform-sample.json` 为平台样例）
- `src/` 平台领域核心模块
- `test/` 各条业务规则的校验测试
- `scripts/weekly-review.js` 周研判材料生成演示

## 业务规则与实现对照

| 业务规则 | 实现 | 校验测试 |
| --- | --- | --- |
| 同一票货物无论由谁报送只计一次 | `src/identity.js` 票级标识（报关单号优先，退回运输工具+提单号+企业），`src/ledger.js` 归并来源 | `test/identity.test.js`、`test/ledger.test.js` |
| 多渠道数值冲突可裁定 | `src/identity.js` 按渠道权威等级（海关反馈＞市州汇总＞企业自报）取值 | `test/identity.test.js` |
| 迟到的报关结果归入实际统计期间并注明获知时间 | `src/statistics.js` 按发生日期归期，迟到清单注明获知时间 | `test/statistics.test.js` |
| 已经发布的口径与结论保留原版本 | `src/publish.js` 发布即冻结，补录只出新版本 | `test/publish.test.js` |
| 企业只处理自身申报和服务事项，市州辖区协调，省级贯通 | `src/access.js` 分级视图与提交守卫 | `test/access.test.js` |
| 省级视图沿每个增减值找到货物、商品类别与数据来源 | `src/statistics.js` 增减值按类别分解并携带逐票来源 | `test/statistics.test.js`、`test/weekly.test.js` |
| 一企一策的责任人、承诺期限和办理结果进入下一次周研判 | `src/ledger.js` 结构化登记（缺责任人/承诺期限/办理结果即报错），`src/weekly.js` 自动带入下次周研判并标记逾期 | `test/ledger.test.js`、`test/weekly.test.js` |

## 本地校验与演示

```sh
npm test    # 校验全部业务规则
npm run demo  # 生成一份周研判材料（含增减值溯源、迟到数据、一企一策、分级视图）
```

## 资料边界

仓库不保存账号、密钥、连接串或真实身份信息；示例中的企业、责任人均为化名标识。统计口径以发布版本为准，历史版本只可引用、不可改写。

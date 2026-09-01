# Decisions

## ADR: Phase 2 deterministic combat core

- Date: 2026-09-01
- Status: accepted
- Context: 微信小游戏战斗规则必须可复现、可 headless 测试，并与 UI 和子系统随机消费解耦。
- Decision: 使用纯 TypeScript domain；`rulesVersion` 标识结算语义；run seed 派生 `mapRng/combatRng/rewardRng/eventRng`；每命令在 draft 上结算，失败整体回滚；trigger chain 使用确定性 ID、depth 32、effect+trigger 总步数 1024。
- Consequences: Phase 2 只实现 6 张机制卡和最小战斗闭环；SaveEnvelope、Cocos 表现层和正式内容延期。
- Evidence / repository references: `docs/phase-1-architecture.md`, `src/domain/`, `tests/domain/combat.test.ts`。
- Supersedes or superseded by: None.

## ADR: Phase 3 deterministic run slice and Cocos boundary

- Date: 2026-09-01
- Status: accepted with runtime validation pending
- Context: Phase 3 需在不污染纯 TypeScript domain 的前提下，交付从 New Run 到 Boss 结算的测试级单局闭环。
- Decision: 将唯一 domain 源移入 `assets/scripts/domain`；UI 经 `GameFacade` 交互；采用 9-rank 分层 DAG、四独立 RNG stream、版本化 `SaveEnvelope` 和 A/B 本地槽；Cocos 3.8.8 只实现程序化功能型 presentation。Phase 3 内容规模显式保持 6 张机制卡的测试级 override，不扩到完整 MVP。
- Consequences: headless/静态门禁已通过；正式美术、动画、音效、登录、云存档、排行和商业化仍不在范围。Cocos Editor 与微信真机结果在有真实证据前保持 blocked。
- Evidence / repository references: `assets/scripts/domain/`, `assets/scripts/app/game-facade.ts`, `assets/scripts/presentation/main-view.ts`, `assets/scenes/main.scene`, `tests/domain/`, `package.json`.
- Supersedes or superseded by: Extends `Phase 2 deterministic combat core`.

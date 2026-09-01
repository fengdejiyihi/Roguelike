# Decisions

## ADR: Phase 2 deterministic combat core

- Date: 2026-09-01
- Status: accepted
- Context: 微信小游戏战斗规则必须可复现、可 headless 测试，并与 UI 和子系统随机消费解耦。
- Decision: 使用纯 TypeScript domain；`rulesVersion` 标识结算语义；run seed 派生 `mapRng/combatRng/rewardRng/eventRng`；每命令在 draft 上结算，失败整体回滚；trigger chain 使用确定性 ID、depth 32、effect+trigger 总步数 1024。
- Consequences: Phase 2 只实现 6 张机制卡和最小战斗闭环；SaveEnvelope、Cocos 表现层和正式内容延期。
- Evidence / repository references: `docs/phase-1-architecture.md`, `src/domain/`, `tests/domain/combat.test.ts`。
- Supersedes or superseded by: None.

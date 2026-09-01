# Project

- Project goal: 原创微信卡牌构筑 Roguelike 小游戏，核心循环为路线选择、回合制战斗、奖励与单局构筑。
- Technology stack: Cocos Creator 3.8.8 LTS + TypeScript；纯 TypeScript domain 由 Node 24 headless 验证，Cocos 仅承载 scene/input/presentation/platform adapter。
- Architecture source: `docs/phase-1-architecture.md`。
- Key constraints: domain 不依赖 Cocos、`wx`、presentation 或 Node runtime；禁止 `Math.random()`；确定性与 rejected-command 原子性是硬门禁。
- Delivery workflow: 全局 `engineering-team` Dynamic Team Formation；可执行变更执行 Worker → QA → Reviewer → Brain。

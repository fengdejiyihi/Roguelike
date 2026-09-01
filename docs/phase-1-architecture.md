# 微信卡牌 Roguelike 小游戏：第一阶段产品与技术架构

> 状态：**Phase 1 已确认；Phase 2 无美术战斗垂直切片已获准**
> 版本：Phase 1 / 2026-09-01

## 0. 决策摘要与假设

- 单人 PvE、横屏触控、离线优先；单局目标 20–30 分钟，可随时退出续玩。
- 推荐 **Cocos Creator 3.8 LTS + TypeScript**；规则核不依赖 Cocos、微信 API 或 UI。
- MVP 验证“路线决策 → 战斗 → 奖励 → 构筑 → Boss”闭环，不验证商业化和长期留存。
- 战斗确定性；所有随机只来自 run seed 派生、带状态且可保存的独立 RNG streams。
- 题材暂不决定，但所有名称、美术、文案、数值和组合必须原创。

项目使用全局 `engineering-team` 多 Agent 开发 Skill，并叠加 Game Development Profile。当前阶段按其 Dynamic Team Formation 只启用必要角色；后续非简单实现执行 `Worker → 独立 QA → 独立 Reviewer → Brain 最终验收` 门禁。

## 1. 开源调研与技术栈

先评估成熟实现，再决定自建最小规则核：

| 候选 | 可借鉴 | 不直接采用的原因 |
|---|---|---|
| [Slay-The-Robot](https://github.com/DesirePathGames/Slay-The-Robot)（MIT，当前 271 stars） | data-driven action、确定性 RNG、规则/UI 分离、存档 | Godot 4.6 + GDScript，微信发布链和 TypeScript 目标不匹配 |
| [RogueDeck-Core](https://github.com/Paranoidgrinch/RogueDeck-Core)（MIT，当前 12 stars） | 有序效果队列、组合效果、状态快照与复现 | C#/.NET，成熟度不足以承担项目依赖 |

结论：**不 fork、不引入第三方战斗框架**；只借鉴已验证的结构，在本项目内实现最小纯 TypeScript 规则核。Cocos Creator 3.8 是 LTS，官方文档包含微信小游戏、开放数据域和分包发布链，平台适配成本最低：[Cocos Creator 3.8 文档](https://docs.cocos.com/creator/3.8/manual/en/index.html)。Phaser/PixiJS 需自担微信适配与资源管线；Unity 对本 MVP 偏重。

数据边界：

- 本地：单局存档、设置、教程标记。
- 云端（MVP 后）：跨设备存档、账号资产、排行榜、防作弊、运营配置。
- MVP 不主动登录；预留 `PlatformAdapter` 封装 `wx`，不是账号系统。
- **排行榜、独立账号、云存档不进 MVP**。排行榜若立项，应服务端验证 seed + 命令日志或服务端结算，不能信任客户端分数。

## 2. 产品定位与版权边界

定位：面向微信用户的短局、低学习门槛、高决策密度卡牌 Roguelike；核心体验是“读懂敌方下一步，用有限手牌和能量控制风险，完成一层探索”。差异点只押注移动端可读性、短局和信息透明，不增加新系统充数。

版权安全规则：

1. 不使用原作名称、角色、专有名词或“微信版某作品”等导流表达。
2. 不复制、描摹、改色或 AI 重绘原作美术、图标、卡背、UI、地图造型和视听资产。
3. 不翻译、近义改写原作卡牌、遗物、事件和敌人文案。
4. 通用机制可以使用；但单项内容不得同时复刻名称、费用、数值、效果组合、稀有度和图像意象。
5. 数值曲线和地图规则从本项目目标推导，不以原作数据表改数值。
6. 每项内容记录原创意图和素材许可证；若能被轻易一对一对应到原作，重做表达或机制组合。

## 3. 核心 Gameplay Loop

```text
开局（初始牌组/生命/金币/遗物）
→ 选择可达路线节点
→ 普通战斗 / 精英 / 商店 / 随机事件
→ 获得并确认奖励
→ 加牌、移牌、升级、获得遗物，形成单局构筑
→ 继续选路
→ Boss 检验构筑
→ 胜利结算，或生命归零结束本局
```

战斗子循环：展示敌方意图 → 回合开始/补能/抽牌 → 玩家出牌 → 结束回合 → 敌人按固定顺序行动 → 状态结算/死亡检查 → 下一回合或胜负结算。

单局成长只包含卡组变化、卡牌升级、遗物、金币、生命变化；局末全部清空，MVP 无永久属性成长。

## 4. MVP 范围

| 内容 | 基线 |
|---|---:|
| 可玩角色 / 初始卡组 | 1 / 10 张 |
| 卡牌 | 24 张（每张仅基础/升级版） |
| 普通敌人 / 精英 / Boss | 8 / 2 / 1 |
| 地图 | 1 层，9 个层级，每条路线实际经过 9 节点（含 Boss） |
| 遗物 / 事件 | 6 / 4（每事件 2–3 选项） |
| 商店 / 存档 | 基础规则 / 1 个自动覆盖单局槽 |

卡牌建议：8 攻击、7 防御、6 资源/抽牌/状态、3 构筑核心；至少支持三种小型协同方向。敌人各 2–3 个可预测行动；Boss 可有规则阶段切换，但不增加第二套角色资产。

不做：多角色、多层、PvP、好友助战、排行、云存档、独立账号、永久养成、抽卡/赛季/通行证、复杂剧情、多语言、编辑器、热更新平台和正式商业化。

## 5. 系统架构与核心系统

```text
Cocos Scene/UI --PlayerCommand--> GameFacade
                                  ├─ RunEngine：地图/节点/奖励/商店/事件
                                  ├─ CombatEngine：回合/牌区/敌人/胜负
                                  ├─ EffectResolver：有序效果队列
                                  ├─ TriggerResolver：Status/Relic 触发
                                  └─ RngStreams：map/combat/reward/event 独立随机流
                                             │
                                    RunState / CombatState
                                             │ DomainEvent[]
                                             v
                                 Presenter / Animation / Audio
```

- Turn/Energy：回合开始重置能量；阶段和触发窗口决定合法命令。
- Draw/Hand/Discard/Exhaust：抽牌不足时只用 `combatRng` 洗弃牌堆；手牌上限溢出产生明确事件；牌结算后进入弃牌或消耗区。
- CardEffect：白名单数据 + 有序 resolver；不执行配置字符串。
- Buff/Debuff/Power：统一为 `Status`，仅用 `category` 区分。
- Enemy intent/AI：优先条件规则 → 加权动作池 → seeded 选择；意图在玩家回合前锁定并展示，不用行为树。
- Relic/passive：与 Status 共用触发窗口和效果语言。
- Reward：胜利时一次生成并持久化 `pendingReward`，显式领取，支持三选一或跳过。
- Shop：入店时一次生成并保存库存；只做买卡、少量遗物和一次移牌服务。
- Event：按条件和 seeded 权重选择；选项使用受限的 RunEffect 白名单。
- Save/resume：只在效果队列清空的稳定点保存。

硬约束：UI 只能发命令、消费领域事件，不能改状态；禁止 `Math.random()`；domain 不得导入 Cocos、`wx` 或 presentation；动画快慢/跳过不影响规则；新增仅使用现有效果的卡牌只改数据。

## 6. 核心数据模型

```ts
type Card = { id: string; nameKey: string; cost: number; tags: string[];
  rarity: string; target: TargetRule; effects: CardEffect[]; upgradeTo?: string };
type CardEffect =
  | { kind: 'damage'|'block'|'draw'|'energy'|'heal'|'loseHp'; value: number; target: Target }
  | { kind: 'applyStatus'|'removeStatus'; statusId: string; stacks: number; target: Target }
  | { kind: 'discard'|'exhaust'|'moveCard'; count: number; target: Target }
  | { kind: 'addCard'; cardId: string; pile: Pile; count: number }
  | { kind: 'sequence'; effects: CardEffect[] }
  | { kind: 'if'; predicate: Predicate; then: CardEffect[]; else?: CardEffect[] }
  | { kind: 'forEach'; selector: TargetSelector; effect: CardEffect }
  | { kind: 'randomChoice'; options: CardEffect[] };

type Player = { characterId: string; hp: number; maxHp: number; gold: number;
  deck: CardInstance[]; relics: RelicInstance[] };
type Enemy = { instanceId: string; definitionId: string; hp: number; maxHp: number;
  statuses: StatusInstance[]; intent: Intent; order: number };
type Status = { id: string; category: 'buff'|'debuff'|'power'; stackPolicy: string;
  triggers: TriggerSpec[] };
type Relic = { id: string; triggers: TriggerSpec[] };
type RngStreams = { mapRng: RngState; combatRng: RngState;
  rewardRng: RngState; eventRng: RngState };
type CombatState = { phase: CombatPhase; turn: number; commandIndex: number; energy: number; player: Player;
  enemies: Enemy[]; draw: string[]; hand: string[]; discard: string[]; exhaust: string[];
  effectQueue: Effect[]; triggerQueue: Trigger[]; result?: CombatResult };
type RunState = { schemaVersion: number; contentVersion: string; rulesVersion: string;
  runId: string; seed: string; rngStreams: RngStreams;
  player: Player; map: MapNode[]; currentNodeId: string;
  visited: string[]; combat?: CombatState; pendingReward?: Reward; event?: EventState; shop?: ShopState };
type MapNode = { id: string; rank: number; lane: number; type: NodeType; next: string[]; visited: boolean };
type Event = { id: string; requirements: Predicate[]; choices: EventChoice[] };
type Reward = { id: string; source: string; options: RewardOption[]; selectedId?: string };
```

定义与实例分离：卡牌实例只保存 `instanceId/cardId/upgradeLevel`；配置引用 ID，不复制整份定义。

## 7. 确定性结算与战斗状态机

```text
Setup → CombatStartTriggers → PlanEnemyIntents
→ PlayerTurnStart → DrawCards → AwaitPlayerAction
   ├─ PlayCard → ResolveQueues → TerminalCheck → AwaitPlayerAction
   └─ EndTurn
→ PlayerTurnEnd → EnemyTurns（order 稳定排序）
→ RoundEnd → TerminalCheck
   ├─ Victory → RewardPending
   ├─ Defeat → RunEnded
   └─ PlanEnemyIntents → PlayerTurnStart
```

命令流程：校验 phase/cost/target → 扣费与移牌 → 按数据顺序入 `effectQueue` → 每个 effect 改状态并产出 `DomainEvent` → 在固定窗口收集触发器 → 按 `priority, ownerOrder, sourceId` 稳定排序 → 队列清空 → 胜负检查。

固定触发窗口：`CombatStart, TurnStart, CardPlayed, BeforeDamage, AfterDamage, EnemyDefeated, TurnEnd, CombatWon`。

Trigger chain 防护基线：

- 每个合法命令创建确定性的 `resolutionId = combatId:commandIndex`；因该命令产生的触发链共享 `triggerChainId`，子触发继承并增加 `depth`。
- MVP 固定 `maxDepth = 32`、单次 resolution 最多 1024 个已解析 effect/trigger；超限产生确定性 `ResolutionRejected`，整个命令回滚。
- 同一 `triggerChainId` 的祖先栈中，禁止再次进入相同 `(sourceId, triggerId, window)`；MVP 不提供 `reentrant` 例外。
- 内容加载时拒绝可静态识别的直接自触发；运行时发现间接循环、超深或超量时中止并回滚，不允许静默跳过。
- 命令先完整校验，再在隔离 draft 上结算；非法命令或 resolution 失败返回原 state，且不消耗任何已提交 RNG state，不产生 partial mutation。

run seed 通过固定、版本化的派生函数生成 `mapRng / combatRng / rewardRng / eventRng`。各系统只能消费自己的 stream；stream 状态全部存档，禁止靠调用顺序共享随机性。派生算法或结算语义变化必须提升 `rulesVersion`。

## 8. 地图生成

使用 9-rank 分层 DAG，不做通用图引擎：起点和 Boss 固定；中间 rank 每层 2–3 节点。先连相邻层，保证每节点至少一入一出，再按楼层白名单分配普通战斗、事件、商店、精英；至少存在包含商店、精英的合法路线，避免连续商店/事件。固定次数生成失败后使用内置合法模板，不无限重试。存档保存最终节点和边，恢复时不重生成。

不变量：所有起点可达 Boss；无回边/悬空；节点数量和楼层约束合法；同 seed + contentVersion 得到相同地图。

## 9. 存档方案

```text
SaveEnvelope = schemaVersion + contentVersion + rulesVersion + appBuild + generation
             + savedAt + payload:RunState + checksum
```

使用一个逻辑存档、A/B 两个物理槽：写非活动槽 → 立即读回校验 → 切换 active 指针；加载最高合法 `generation`，损坏则回退另一槽。保存 run seed、四个 RNG stream state、phase、未领奖励和商店库存。保存点：命令完整结算后、进入节点后、确认奖励/交易后。`schemaVersion` 管结构迁移，`contentVersion` 管内容兼容，`rulesVersion` 管确定性派生和规则结算语义；MVP 只承诺三者兼容时续局。

## 10. 最小目录结构

```text
assets/
  scenes/  ui/  art/  audio/  game-data/
  scripts/
    domain/       model.ts rng.ts effects.ts combat.ts run.ts map.ts save.ts
    app/          game-facade.ts content-loader.ts
    platform/     wechat.ts local-save.ts
    presentation/ combat-view.ts map-view.ts reward-view.ts
tests/domain/
```

不按卡牌/效果各拆文件；只有职责真实分裂时再拆。不引入 Redux、ECS、IOC、通用事件总线、脚本 DSL 或行为树。

## 11. Game Development Profile 与 Agent 分工

动态组队规则：只在当前 checkpoint 需要时启动角色；每个角色只交付可验收产物，不启动全部 Agent。

| 阶段 | 启动角色 | 交付 |
|---|---|---|
| 当前 Phase 1 | Brain / Game Director（Sol）、Game Architect（Sol）、主 Agent 整合 | 本文档与冲突裁决 |
| 战斗垂直切片 | Gameplay / Combat（Terra）、QA / Rules（Luna） | 规则核、意图测试、确定性日志 |
| 内容扩充 | Data / Balance（Terra）；需要时 Fast Coder（Spark） | 配置、批量模拟、窄补丁 |
| 可玩场景 | UI / Scene（Luna） | 触控、状态可读性、动画事件消费 |
| 阶段出口 | Reviewer（Sol） | 跨产品/架构/规则审查，不代替测试 |

Profile checkpoint：规则冻结 → 无美术战斗闭环 → 单局闭环 → 存档/真机 → 平衡/IP/发布候选。每步必须分别报告已完成、已验证、剩余和未验证项。

## 12. 分阶段开发计划

1. **Phase 1 架构确认（当前）**：冻结本文的循环、边界、规则次序、模型与验收；用户确认前停止。
2. **Phase 2 无美术垂直切片**：只做 5–6 张机制验证卡，覆盖 damage / block / draw / status / sequence / conditional effect；Node 环境先跑规则、原子性和确定性日志，不追求内容量。
3. **Phase 3 单局闭环**：路线、奖励、构筑、商店、事件、精英、Boss；扩至完整 MVP 内容量。
4. **Phase 4 存档与移动端**：A/B 存档、异常退出恢复、触控、包体与真机性能。
5. **Phase 5 平衡与候选包**：批量模拟、单局时长、原创性审查、微信审核准备。

## 13. 风险清单

| 风险 | 最小控制 |
|---|---|
| IP/同质化 | 原创记录 + 一对一对应检查 |
| 效果语言过度泛化 | 先限制 12–16 个原子 effect 和 predicate 白名单 |
| 触发顺序争议/死循环 | 固定窗口、稳定排序、事件上限、可读日志 |
| RNG 漂移 | 四个独立 stream、保存全部内部状态、状态摘要测试 |
| UI 驱动规则 | Presenter 只消费事件，关闭动画仍能战斗 |
| 存档损坏/重复领奖 | 稳定点保存、A/B 校验、pendingReward 持久化 |
| 地图导致局长超标 | 选择 9 ranks；超过 35 分钟先减节点，不加快动画掩盖 |
| 内容少/构筑浅 | 三种小型协同；先用敌人行动组合复用规则 |
| 包体/真机差异 | 简单资源、按场景 Bundle；真机前不宣称通过 |

显式冲突裁决：原提案“12–15 个节点”和“12–15 层×2–4 节点”不兼容短局目标，选 9-rank DAG；另一方案标记为 MVP 后待数据验证。

## 14. 验收标准

- 新玩家无需查说明，3 分钟内完成首回合；从开局到胜/负无断链或调试入口依赖。
- 普通战斗、精英、商店、事件、奖励和 Boss 均进入合法闭环；任意起点都可达 Boss。
- Node 环境无需 Cocos 即可运行战斗、地图、存档测试；关闭动画仍可完成战斗。
- 相同 `rulesVersion`、seed、初始状态和命令序列产生完全一致的 state digest 与 event sequence。
- 至少 1000 次 headless combat 无 crash、infinite loop、负能量、重复结算或死亡单位行动；地图 10,000 seeds 无断路并满足约束。
- domain 层不得依赖 Cocos、`wx` 或 presentation，且代码中禁止 `Math.random()`。
- rejected command 必须保持 state 原子性：state digest 与执行前一致、RNG stream 不前进、不允许 partial mutation。
- 牌区、能量、伤害/格挡、死亡、触发顺序均有验证“设计意图”的测试；UI 预览与实际结算一致。
- 新增只使用现有效果的卡牌仅改数据；错误 ID、范围、目标规则在内容加载时失败并明确报错。
- 任一稳定保存点强退后可恢复，不能重复奖励或改变后续 RNG；损坏主槽能回退。
- 熟练玩家单局中位数 20–30 分钟；初轮警戒线：Boss 到达率 35%–60%，通关率 15%–35%。
- 所有资产/文案有来源记录，版权直接对应检查无未关闭项。
- MVP 范围全部完成；所有不做项未进入主流程；微信真机、审核和云能力在获得真实证据前标记为未验证。

---

**审批门禁：Phase 1 已确认。Phase 2 仅限上述无美术、5–6 张机制验证卡的纯规则垂直切片；扩大内容或接入 Cocos 前必须再次验收。**

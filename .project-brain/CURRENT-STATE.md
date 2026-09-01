# Current state

- Date: 2026-09-01
- Current phase: Phase 4A UI Concept Review 已由用户验收通过；现进入 Phase 4B 的第一个 checkpoint，仅实现 Battle UI V1 可玩版。
- Implemented: Cocos Creator 3.8.8 最小工程与 `MainView`；`GameFacade` 边界；9-rank 确定性 DAG；128 条合法路线到 Boss 胜/负；2 普通敌人、1 精英、1 Boss；奖励、商店、2 事件、3 遗物；A/B 本地存档、版本/结构/阶段不变量校验与损坏回退；横屏战斗 UI Concept（玩家/敌人/Intent/HP/Block/状态/遗物/能量/手牌/结束回合）与中英切换。
- Test status: `node --import tsx/esm --test tests/domain/*.test.ts`，28 passed / 0 failed；包含 1000 次 headless combat、10,000 seeds 地图、128 条合法路线、44 项 checksum-valid 阶段矛盾存档矩阵。沙箱内 `npm run check` 的 tsx IPC 会报 `EPERM`，已用无 IPC 等价命令完成全量验证。
- Boundary status: `assets/scripts/domain` 无 `Math.random()`、Cocos、`wx`、presentation/platform、Node/browser runtime 依赖；presentation 通过 `GameFacade` 交互，platform adapter 使用 `sys.localStorage`。
- Typecheck/lint: `tsc --noEmit` 与 `biome check .` 通过。
- Active tasks: Phase 4B Battle UI V1：正式战斗 HUD、可复用卡牌/手牌视图、最小战斗反馈动画及 Victory/Defeat；地图、商店、事件 UI 不在本 checkpoint。
- Runtime status: 最新源码已由 Cocos Creator 3.8.8 构建为 1280x720 Web Desktop；New Run -> Map -> Combat、End Turn、抽牌形成 6 张手牌及中英切换均实测通过，控制台 0 error/warn。Phase 3 的桌面 `wechatgame` 横屏构建仍可运行。
- Blockers: None for the Battle UI V1 checkpoint.
- Deferred risks: 英文窄卡描述目前按字符换行，Phase 4B 应改为按单词换行或短文案；`Tween.delay()` shim 可进一步保留泛型 `T`；正式素材切图、动画、内容与数值平衡延后。
- Working tree: Phase 3 baseline `1e730aa` 已提交并推送；Phase 4A 实现仅改 `assets/scripts/presentation/main-view.ts` 与 `tools/types/cocos.d.ts`，另有本文件的 exit-gate 状态更新，均未提交。
- Next gate: Battle UI V1 完成 Cocos/微信构建、完整战斗、静态门禁、QA 与 Reviewer 后停止，等待用户视觉和交互验收；不得继续地图、商店、事件 UI。

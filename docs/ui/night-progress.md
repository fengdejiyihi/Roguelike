# Phase 4C.3 Night Progress

范围：Roguelike Full Flow UI Framework。所有页面均为可替换正式素材的工程框架；本轮未生成美术、未修改规则、未提交 Git。

## Event

- 状态：工程框架完成，已接入现有 `EventState` / `GameFacade.chooseEvent`。
- 文件：`assets/scripts/presentation/event-view.ts`、`assets/scripts/presentation/main-view.ts`。
- 入口：Run 进入 `event` phase 后自动显示；先选择选项，再确认；取消只清除当前选择。
- 测试结果：33/33 tests、typecheck、lint、Cocos Web/微信小游戏构建通过。
- 已知问题：事件结算由现有 domain 立即返回地图，因此没有独立的结算停留阶段。
- 等待美术资源：事件背景、NPC、选项框、奖励与风险图标。

## Shop

- 状态：工程框架完成，已接入现有商品库存、金币、购买、售罄与离开逻辑。
- 文件：`assets/scripts/presentation/shop-view.ts`、`assets/scripts/presentation/main-view.ts`。
- 入口：Run 进入 `shop` phase 后自动显示；购买统一经 `GameFacade.buyTransition`。
- 测试结果：33/33 tests、typecheck、lint、Cocos Web/微信小游戏构建通过。
- 已知问题：现有 domain 没有“移除卡牌”命令，入口保持禁用；没有伪造购买规则。
- 等待美术资源：商店背景、商人、商品底板、卡牌/遗物缩略框、金币与售罄状态。

## Camp

- 状态：展示与交互框架完成，暂未接入 Run 流程。
- 文件：`assets/scripts/presentation/camp-view.ts`。
- 入口：暂无；现有 `RunPhase`、地图节点和 GameFacade 均没有 Camp contract。
- 测试结果：组件已通过 typecheck、lint 与 Cocos 构建编译。
- 已知问题：Heal、Upgrade Card、Leave 均需后续获得 domain contract 才能显式启用；组件默认全部禁用，本轮未越权修改 RunEngine。
- 等待美术资源：营地背景、篝火、休息、升级、离开按钮及反馈图标。

## Deck

- 状态：只读框架完成，支持分类、卡牌选择、详情、遗物/状态列表和返回。
- 文件：`assets/scripts/presentation/deck-view.ts`、`assets/scripts/presentation/main-view.ts`。
- 入口：Event、Shop、Result 页面左上“牌组”；数据只读取 GameFacade projection。
- 测试结果：33/33 tests、typecheck、lint、Cocos Web/微信小游戏构建通过。
- 已知问题：当前只展示前 6 张卡，完整卡组滚动/分页留待正式页面迭代。
- 等待美术资源：牌组背景、筛选按钮、卡牌详情框、遗物与状态图标。

## Result

- 状态：Victory / Defeat 工程框架完成，支持统计、奖励摘要、查看只读地图、主菜单和重开。
- 文件：`assets/scripts/presentation/result-view.ts`、`assets/scripts/presentation/main-view.ts`。
- 入口：Run 进入 `won` 或 `lost` phase 后自动显示。
- 测试结果：33/33 tests、typecheck、lint、Cocos Web/微信小游戏构建通过。
- 已知问题：当前统计限于 GameFacade 已提供的探索节点、HP 和金币；“返回地图”为终局只读地图，不允许推进。
- 等待美术资源：胜利/失败背景、标题装饰、统计框、奖励摘要和按钮资源。

## Quality Gate

- Tests：33/33 PASS。
- Typecheck：PASS。
- Lint：PASS。
- `git diff --check`：PASS。
- Domain boundary / `Math.random()` prohibition：PASS。
- Web 1280×720 runtime smoke：Event 选择/确认/返回地图、Shop 金币不足/禁用移除/离开、Deck 分类/详情/返回、Result 返回只读地图/返回结算/重新开始均 PASS；控制台 0 error / warning。
- Cocos Creator 3.8.8 Web build：任务完成，产物位于 `/private/tmp/phase4c3-flow-web/web-mobile`。
- Cocos Creator 3.8.8 WeChat build：任务完成，横屏配置已验证，产物位于 `/private/tmp/phase4c3-flow-wechat/wechatgame`。
- 微信开发者工具 GUI：本轮未人工复验；仅确认微信小游戏构建产物完整且横屏配置正确。
- 说明：Creator CLI 在本机完成构建后仍返回状态码 36；构建日志明确为 `Finished`，且关键产物已逐项检查存在。

## Deferred by Contract

- Camp：等待 RunPhase / GameFacade 的正式营地命令。
- Shop Remove Card：等待 GameFacade 的正式移除卡牌命令。
- 正式视觉资源：全部等待独立 Art Pipeline 审核后替换。

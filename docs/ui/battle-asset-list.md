# Battle 正式素材清单

`docs/ui/final-ui-source.png` 是唯一视觉基准，禁止裁切、拆分或直接复用综合图；正式素材必须按其中的深海军蓝、梦境紫蓝与奶油纸张方向独立重建。

## 已提供 / 已接入

| 分组 | 实际文件 | 用途 | 状态 |
| --- | --- | --- | --- |
| 背景 | `assets/resources/art/battle/backgrounds/battle_bg_dream_forest_01.png` | Battle 战场背景 | 已提供/已接入 |
| 玩家 | `assets/resources/art/battle/characters/player/player_idle.png` | 玩家待机立绘 | 已提供/已接入 |
| 玩家 | `assets/resources/art/battle/characters/player/player_attack.png` | 玩家攻击反馈帧 | 已提供/已接入 |
| 敌人 | `assets/resources/art/battle/characters/enemy/enemy_idle.png` | 敌人待机立绘 | 已提供/已接入 |
| 敌人 | `assets/resources/art/battle/characters/enemy/enemy_cast.png` | 敌人施法反馈帧 | 已提供/已接入 |

以下清单中的其余素材仍为缺失，待后续提供。

## 待补齐素材清单

| 分组 | 建议文件名 | 用途 | 透明 / 9-slice | 建议尺寸 |
| --- | --- | --- | --- | --- |
| 背景 | `battle-bg-sky.png` | 天空、浮岛与远景 | 不透明 | 2048×1152 |
| 背景 | `battle-bg-forest.png` | 两侧树影、花朵、灯笼 | 透明 | 2048×1152 |
| 背景 | `battle-bg-ground.png` | 战场地面与石板 | 透明 | 2048×640 |
| 玩家 | `dreamer-avatar.png` | 顶部 HUD 头像 | 透明 | 96×96 |
| 玩家 | `dreamer-battle.png` | 玩家战场立绘/动画帧 | 透明 | 384×384（或 4×4 图集） |
| 敌人 | `enemy-scout.png` | 侦察兵正式立绘 | 透明 | 384×384（或图集） |
| 敌人 | `enemy-brute.png` | 悍将正式立绘 | 透明 | 384×384（或图集） |
| 敌人 | `enemy-elite.png` | 精英正式立绘 | 透明 | 448×448（或图集） |
| 敌人 | `enemy-boss.png` | 首领正式立绘 | 透明 | 512×512（或图集） |
| HUD | `battle-frame.png` | 深海军蓝圆角外框 | 透明，四角保留 | 1280×720 |
| HUD | `battle-hud.png` | 顶部 HUD 背板 | 透明，横向 9-slice | 1200×58 |
| HUD | `relic-rail.png` | 左侧遗物栏背板 | 透明，纵向 9-slice | 64×260 |
| HUD | `battle-bottom-bar.png` | 底部资源/导航背板 | 透明，横向 9-slice | 1200×54 |
| HUD | `settings.png` | 设置齿轮按钮 | 透明 | 48×48 |
| 卡牌 | `card-frame-attack.png` | 攻击卡奶油纸张卡框 | 透明，9-slice | 176×248 |
| 卡牌 | `card-frame-skill.png` | 技能卡奶油纸张卡框 | 透明，9-slice | 176×248 |
| 卡牌 | `card-frame-tactic.png` | 战术卡奶油纸张卡框 | 透明，9-slice | 176×248 |
| 卡牌 | `card-art-strike.png` | 打击星空插画 | 透明或不透明 | 144×96 |
| 卡牌 | `card-art-guard.png` | 守备星空插画 | 透明或不透明 | 144×96 |
| 卡牌 | `card-art-insight.png` | 洞察星空插画 | 透明或不透明 | 144×96 |
| 卡牌 | `card-art-toxin.png` | 毒液星空插画 | 透明或不透明 | 144×96 |
| 卡牌 | `card-art-double-cut.png` | 双斩星空插画 | 透明或不透明 | 144×96 |
| 卡牌 | `card-art-execute.png` | 处决星空插画 | 透明或不透明 | 144×96 |
| 控件 | `energy-orb.png` | 左下 Energy Orb | 透明 | 80×80 |
| 控件 | `end-turn.png` | End Turn 按钮 | 透明，9-slice | 184×52 |
| 图标 | `icon-hp.png` | HP 图标 | 透明 | 32×32 |
| 图标 | `icon-block.png` | Block 图标 | 透明 | 32×32 |
| 图标 | `icon-intent.png` | 敌人头顶 Intent 图标 | 透明 | 48×48 |
| 图标 | `icon-status-poison.png` | 中毒状态 | 透明 | 40×40 |
| 图标 | `icon-status-spike.png` | 尖刺状态 | 透明 | 40×40 |
| 图标 | `icon-relic-*.png` | 遗物栏与 HUD 遗物图标 | 透明 | 48×48 |
| 图标 | `icon-draw-pile.png` | 牌堆图标 | 透明 | 56×72 |
| 图标 | `icon-discard-pile.png` | 弃牌堆图标 | 透明 | 56×72 |
| 图标 | `icon-exhaust-pile.png` | 消耗牌堆图标 | 透明 | 56×72 |
| 图标 | `icon-status-menu.png` | 底部状态入口 | 透明 | 48×48 |
| 图标 | `icon-record.png` | 底部战斗记录入口 | 透明 | 48×48 |

卡牌、HUD 与按钮的 9-slice 中心区域应保持纯色或低纹理，避免拉伸时破坏纸张边缘和深海军蓝边框；立绘和图标保留透明边界，方便替换当前节点名带 `Placeholder` 的程序化节点。

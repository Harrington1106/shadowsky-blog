---
title: "Rime 输入法配置：Windows 与 Android 双端"
date: "2025-12-10"
category: "软件推荐"
author: "Thoi"
tags: ["Rime","输入法","Windows","Android","教程"]
excerpt: "Rime 没有广告，词库和配置全在本地，代价是没有图形设置界面，全靠改 yaml。这篇讲清 Windows 小狼毫和 Android 同文的配置方法、雾凇拼音词库，以及两端同步用户词库的做法。"
lastModified: "2026-08-03"
readTime: 8
coverImage: "/uploads/covers/c5924516.webp"
---

输入法是少数几个能看到你输入的每一个字的软件。除了隐私，弹窗广告、臃肿的体积和莫名其妙的联想词也够烦人的。

Rime（中州韵输入法引擎）是一个跨平台的输入法框架，在各个系统上有不同的名字：

| 平台 | 名称 |
|------|------|
| Windows | 小狼毫（Weasel） |
| Android | 同文输入法（Trime） |
| macOS | 鼠须管（Squirrel） |
| Linux | 中州韵（IBus-Rime / Fcitx-Rime） |

它的好处是开源免费、没有广告、词库和配置全部存在本地不上云（除非你自己配同步），而且从配色字体到码表快捷键都能改。

代价也很明确：没有图形化设置界面，大部分配置要手写 `.yaml`。这一点劝退了不少人，但真正需要动的地方其实不多。

## 一、Windows：小狼毫

### 下载安装

从[官网](https://rime.im/)或者 [GitHub Releases](https://github.com/rime/weasel/releases) 下载小狼毫。

安装一路下一步。装完会弹设置向导，让你选输入方案和配色，随便选，后面都要自己改。

### 找到配置文件夹

右下角托盘区找到「中」字图标，右键 →「用户文件夹」，一般在 `%APPDATA%\Rime`。

里面文件不少，日常只关心三个：

- `default.custom.yaml`：全局配置，控制有哪些输入方案、候选词个数
- `weasel.custom.yaml`：界面配置，控制皮肤、字体、横排竖排
- `installation.yaml`：本机信息，多端同步时会用到

有一条规则要记住：**不要直接改 `default.yaml`、`weasel.yaml` 这些不带 `custom` 的文件**，软件更新会覆盖它们。所有修改都写进对应的 `*.custom.yaml` 补丁文件。

### 候选词个数与输入方案

没有 `default.custom.yaml` 就新建一个：

```yaml
# default.custom.yaml
patch:
  "menu/page_size": 9  # 候选词个数，建议 5-9 个
  schema_list:
    - schema: luna_pinyin          # 朙月拼音（全拼）
    - schema: luna_pinyin_simp     # 朙月拼音·简化字
    - schema: double_pinyin_flypy  # 小鹤双拼
```

### 皮肤与字体

没有 `weasel.custom.yaml` 就新建一个。

如果打开发现文件里已经有一大段 `customization:` 开头的内容，那是小狼毫自动生成的记录信息，不用管，只关心 `patch:` 下面的部分：

```yaml
# weasel.custom.yaml 示例（头部是自动生成的）
customization:
  distribution_code_name: Weasel
  distribution_version: 0.17.4
  generator: "Weasel::UIStyleSettings"
  modified_time: "Tue Jun 10 16:00:20 2025"
  rime_version: 1.13.1
patch:
  "style/color_scheme": google  # 使用 Google 主题
  "style/display_tray_icon": false # 不显示托盘图标（清爽）
  "style/font_face": "Microsoft YaHei"  # 字体名称
  "style/font_point": 12        # 字体大小
  "style/horizontal": true      # true 为横排
```

### 用户词典

想让输入法越用越顺手，得确认它在记录你的用词习惯。

这个设置应该写在**输入方案**的配置文件里，文件名跟着你用的方案走。用「朙月拼音·简化字」就是 `luna_pinyin_simp.custom.yaml`：

```yaml
# luna_pinyin_simp.custom.yaml (或者 luna_pinyin.custom.yaml)
patch:
  "translator/enable_user_dict": true
```

有一种常见的困惑：你可能会在自动生成的 `weasel.custom.yaml` 里也看到 `translator/enable_user_dict: true`。那是安装包预设模板留下的。`weasel.custom.yaml` 负责的是 Windows 界面外观，不控制输入法的核心逻辑，所以写在那儿其实不生效。

好在绝大多数方案（包括后面要说的雾凇拼音）默认就开着用户词典，所以平时不会出问题。只有当你发现输入法确实记不住词的时候，才需要按上面的方式明确写进方案配置文件。

### 让配置生效

改完任何配置文件，都要右键托盘图标 →「重新部署（Redeploy）」。不重新部署，改了也不生效。

### 换用雾凇拼音

原版 Rime 自带的词库比较老。社区现在用得最多的是[雾凇拼音（Rime-Ice）](https://github.com/iDvel/rime-ice)，词库量大且维护活跃，联想质量和商业输入法基本没有差距。

如果用户文件夹里已经有 `melt_eng`（融拼）或 `radical_pinyin`（部首）这些文件，说明相关词库已经装过了。

没装的话：

1. 去 GitHub 下载 `rime-ice` 的全部文件
2. 把 yaml 文件和 `opencc` 等文件夹全部复制进用户文件夹，覆盖原文件
3. 打开 `default.custom.yaml`，方案改成 `rime_ice`，或者保留你习惯的 `luna_pinyin_simp`——雾凇也顺带优化了朙月拼音的体验
4. 重新部署

## 二、Android：同文输入法

### 下载安装

从 [GitHub Releases](https://github.com/osfans/trime/releases) 或者 F-Droid 下载 Trime。

装完打开 App，按引导给权限，点右下角「部署」，等它跑完就能用最基础的拼音输入了。

### 和 PC 同步配置

Rime 好用的一点是 PC 上的配置大部分能直接给手机用。

#### 方法一：手动复制

1. 手机连电脑
2. 找到手机内部存储的 `/rime` 文件夹
3. 把电脑 `%APPDATA%\Rime` 里的内容复制过去，但**跳过 `weasel.*` 开头的文件**，那些是 Windows 专用的界面配置
4. 手机上的主题配置是 `trime.yaml`，不要直接覆盖，手动调整
5. 在同文里点「部署」

#### 方法二：用坚果云或 Syncthing 同步

这个方式能把用户词库（你平时打出来的词）在两端自动同步。

1. 改电脑上的 `installation.yaml`，给这台机器起个名字，比如 `installation_id: "pc_thoi"`
2. 改手机 `/rime` 目录下的 `installation.yaml`，起另一个名字，比如 `installation_id: "android_thoi"`
3. 把 `sync_dir` 指向同步文件夹
4. 电脑上点「用户资料同步」，手机上点「同步用户数据」

两端 ID 必须不同，否则同步会互相覆盖。

### 手机端的主题

手机屏幕小，还是触摸输入，需要专门的主题。可以用[同文风](https://github.com/osfans/trime-theme)，或者直接用雾凇拼音自带的手机配置。

装了雾凇的话，里面通常带一个 `trime.yaml` 示例，按自己的习惯调键盘高度和按键大小就行。

## 三、常见问题

### 配置文件里为什么会有 `translator` 设置

在 `weasel.custom.yaml` 里看到 `translator` 相关设置，是安装程序生成的默认模板。界面配置文件里写引擎设置并不规范，但因为多数方案默认就开着该功能，平时不影响使用。真要改这个行为（比如关掉用户词典），得去改方案配置文件（`*.schema.yaml` 或对应的 `custom.yaml`），那里才生效。

### 候选项里出现繁体字怎么办

按 `F4` 或者 `Ctrl + \` 调出方案选单，选「简化字」或者「汉字 → 汉字」。

### 怎么加自己的生僻词

在用户文件夹里建一个 `custom_phrase.txt`：

```text
文字	编码	权重
我的名字	wdmz	1
```

然后重新部署。

### 部署失败怎么办

多半是 yaml 缩进错了。Rime 对缩进很敏感，必须用空格不能用 Tab，层级要对齐。用户文件夹的 `build` 或 `tmp` 目录下有日志，报错信息在里面。

## 小结

Rime 的门槛集中在最开始那一两个小时：找到用户文件夹、搞清 `custom.yaml` 的补丁机制、记住改完要重新部署。这三件事过了，后面都是微调。

它真正的价值在于配置的寿命。这套 yaml 可以跟着你很多年，换电脑换手机只要同步一下，输入手感原样回来——这是商业输入法给不了的。

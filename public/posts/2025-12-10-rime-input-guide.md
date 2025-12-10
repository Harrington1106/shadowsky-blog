---
title: "Rime (小狼毫) 输入法全平台（PC & Android）配置保姆级教程"
date: "2025-12-10"
category: "软件推荐"
author: "Thoi"
tags: ["rime", "input-method", "windows", "android", "tutorial"]
excerpt: "受够了流氓输入法的广告和隐私窥探？来试试 Rime（小狼毫/同文），一款开源、极度可定制、且完全属于你自己的输入法。本文将手把手教你如何在 PC 和 Android 上配置 Rime。"
readTime: 15
coverImage: "https://images.unsplash.com/photo-1555421689-d68471e189f2?auto=format&fit=crop&q=80&w=1000"
---

## 🧐 为什么选择 Rime？

在这个大数据时代，输入法往往成了隐私泄露的重灾区。除此之外，弹窗广告、臃肿的体积、莫名其妙的联想词也让人不胜其烦。

**Rime (中州韵输入法引擎)** 是一个跨平台的输入法算法框架。
*   **在 Windows 上**，它叫 **小狼毫 (Weasel)**。
*   **在 Android 上**，它叫 **同文输入法 (Trime)**。
*   **在 macOS 上**，它叫 **鼠须管 (Squirrel)**。
*   **在 Linux 上**，它叫 **中州韵 (IBus-Rime / Fcitx-Rime)**。

**它的优点：**
1.  **完全开源免费**：没有广告，没有后门。
2.  **数据安全**：所有词库和配置都存储在本地，不上传云端（除非你自己同步）。
3.  **极度可定制**：你可以定制从皮肤、配色、字体到输入方案、码表、快捷键的一切。
4.  **全平台通用**：一套配置，到处运行。

**它的缺点：**
*   **有一定的门槛**：没有图形化设置界面（大部分配置需要改 `.yaml` 文件），劝退了不少小白。

**但是！** 只要跟着这篇教程走，你也能轻松拥有一个神级输入法。

---

## 🖥️ 第一部分：PC 端（Windows 小狼毫）配置

### 1. 下载与安装

前往 Rime 官网或 GitHub 下载最新版本的 **小狼毫 (Weasel)**。

*   **官网**：[https://rime.im/](https://rime.im/)
*   **GitHub**：[https://github.com/rime/weasel/releases](https://github.com/rime/weasel/releases)

安装过程一路“下一步”即可。安装完成后，会弹出设置向导，让你选择输入方案（比如朙月拼音、双拼、五笔等）和配色。这里随便选，反正后面我们要自己改。

### 2. 找到配置文件夹

安装完成后，右下角托盘区找到“中”字图标（或者“小狼毫”图标），右键 -> **用户文件夹**。
通常位置在：`%APPDATA%\Rime`。

打开后，你会看到一堆文件。不要慌，我们主要关注这几个：

*   `default.custom.yaml`：全局配置（控制有哪些输入方案、候选词个数等）。
*   `weasel.custom.yaml`：界面配置（控制皮肤、字体、横排/竖排等）。
*   `installation.yaml`：本机信息（用于多端同步）。

> **注意**：永远不要直接修改 `default.yaml` 或 `weasel.yaml` 这种没有 `custom` 字样的文件，因为软件更新时会覆盖它们。永远只修改 `*.custom.yaml` 补丁文件。

### 3. 定制你的输入法

#### 3.1 修改候选词个数和输入方案

如果没有 `default.custom.yaml`，就新建一个。输入以下内容：

```yaml
# default.custom.yaml
patch:
  "menu/page_size": 9  # 候选词个数，建议 5-9 个
  schema_list:
    - schema: luna_pinyin          # 朙月拼音（全拼）
    - schema: luna_pinyin_simp     # 朙月拼音·简化字
    - schema: double_pinyin_flypy  # 小鹤双拼
```

#### 3.2 美化皮肤与字体

如果没有 `weasel.custom.yaml`，新建一个。

**注意：** 如果你发现文件里已经有了 `customization:` 开头的一大段内容（如下所示），**不要惊慌**，那是小狼毫自动生成的记录信息，我们只需要关注 `patch:` 下面的内容即可。

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

#### 3.3 开启用户词典记录 (关键)

为了让输入法越用越顺手，我们需要确保它在记录你的用词习惯。
在你的输入方案配置文件中加入以下内容。
**注意：** 根据你使用的方案不同，这个文件的名字也不同。如果你主要使用“朙月拼音·简化字”，那么文件名为 `luna_pinyin_simp.custom.yaml`。

**重要提醒：** 这段代码通常建议放在 **输入方案** 的配置文件里（比如 `luna_pinyin_simp.custom.yaml`）。

**疑难解答：** 你可能会发现，在某些自动生成的 `weasel.custom.yaml` 文件（开头带有 `customization` 信息）里，也包含了 `translator/enable_user_dict: true` 这行代码。
**这通常是安装包的预设模版导致的。** 虽然它写在那里，但 `weasel.custom.yaml` 主要负责 **Windows 界面外观**，并不直接控制输入法的核心逻辑（如词库记忆）。
不过，好消息是：绝大多数输入方案（包括雾凇拼音）默认都已经开启了用户词典。所以，即使那行代码写在“错”的地方，你的输入法依然能记录词汇。
**为了保险起见，或者当你发现“不记录词汇”时，请按照本教程，将设置明确写入方案配置文件中。**

```yaml
# luna_pinyin_simp.custom.yaml (或者 luna_pinyin.custom.yaml)
patch:
  "translator/enable_user_dict": true
```

> **小贴士**：大部分方案默认是开启的，但如果你发现输入法“记不住”你打过的词，检查一下这里。

#### 3.4 应用更改

修改完配置文件后，一定要做一步操作：
**右键托盘图标 -> 重新部署 (Redeploy)**。
只有重新部署，配置才会生效。

### 4. 进阶：配置“雾凇拼音” (强烈推荐)

原版的 Rime 词库比较老旧。现在社区最火的是 **[雾凇拼音 (Rime-Ice)](https://github.com/iDvel/rime-ice)**，它维护了极其庞大且优质的词库。

**如果你在你的用户文件夹里看到了 `melt_eng` (融拼) 或 `radical_pinyin` (部首) 等文件，说明你可能已经安装了相关词库。**

如果你还没安装，步骤如下：
1.  去 GitHub 下载 `rime-ice` 的所有文件。
2.  把下载下来的文件（`yaml` 文件和 `opencc` 等文件夹）全部复制到你的 **用户文件夹** 中，覆盖原文件。
3.  打开 `default.custom.yaml`，把输入方案改成 `rime_ice` 或者保留你喜欢的 `luna_pinyin_simp` (雾凇拼音其实也优化了朙月拼音的体验)。
4.  **重新部署**。

瞬间，你的输入法联想能力将提升 100 倍！

---

## 📱 第二部分：Android 端（同文输入法）配置

手机端的 Rime 叫 **Trime (同文输入法)**。

### 1. 下载与安装

*   **GitHub**：[https://github.com/osfans/trime/releases](https://github.com/osfans/trime/releases)
*   或者在 F-Droid 上下载。

### 2. 基础设置

安装后，打开 App，按照引导赋予权限。
点击右下角的“部署”按钮，等待部署完成。此时你已经可以使用最基础的拼音输入了。

### 3. 实现 PC 与 Android 配置同步

Rime 最强大的地方在于，你可以把 PC 上的配置直接丢给手机用（大部分通用的）。

#### 方法一：手动复制（适合小白）

1.  手机连接电脑。
2.  找到手机内部存储的 `/rime` 文件夹。
3.  把电脑上 `%APPDATA%\Rime` 文件夹里的所有内容（除了 `weasel.*` 开头的文件，因为那是 Windows 专用的界面配置）复制到手机的 `/rime` 文件夹里。
4.  **重要**：手机上的主题配置是 `trime.yaml`，不要直接覆盖，最好手动调整。
5.  在手机同文输入法 App 中，点击“部署”。

#### 方法二：使用坚果云/Syncthing 同步（推荐）

1.  修改电脑上的 `installation.yaml`，给电脑起个名字，比如 `installation_id: "pc_thoi"`。
2.  修改手机上的 `installation.yaml`（在 `/rime` 目录下），起个名字，比如 `installation_id: "android_thoi"`。
3.  配置 `sync_dir` 指向你的坚果云同步文件夹。
4.  在电脑上点击“用户资料同步”。
5.  在手机上点击“同步用户数据”。
6.  这样，你的用户词库（你平时打出来的词）就能在两端自动同步了！

### 4. 手机端专属优化

手机屏幕小，且需要触摸输入，所以需要专门的主题。
推荐使用 **[同文风 (Trime-Theme)](https://github.com/osfans/trime-theme)** 或者直接使用 **雾凇拼音** 自带的手机配置。

如果你用了雾凇拼音，它里面通常包含了一个 `trime.yaml` 的示例。你需要把它根据你的喜好进行微调，比如键盘高度、按键大小等。

---

## 🛠️ 常见问题 (FAQ)

**Q: 为什么我的配置文件里会有 `translator` 设置？**
A: 如果你在 `weasel.custom.yaml` 里看到了 `translator` 相关的设置，这通常是安装程序生成的默认模版。
虽然在 `weasel`（界面）配置文件里写 `translator`（引擎）设置是不规范的，但因为大多数方案默认就开启了该功能，所以平时使用不会有影响。
如果你需要修改这个行为（比如**关闭**用户词典），请务必去修改 **方案配置文件** (`*.schema.yaml` 或其对应的 `custom.yaml`)，那里才是真正生效的地方。

**Q: 输入法候选项里有繁体字怎么办？**
A: 按 `F4` (或者 `Ctrl + \` )，会出现方案选单，选择“简化字”或者“汉字 -> 汉字”即可切换。

**Q: 怎么添加自己的生僻词？**
A: 在用户文件夹里创建一个 `custom_phrase.txt`，格式如下：
```text
文字	编码	权重
我的名字	wdmz	1
```
然后重新部署。

**Q: 部署失败怎么办？**
A: 通常是 `.yaml` 文件格式错了（缩进不对）。Rime 对缩进非常敏感，一定要用空格，不能用 Tab，且层级要对齐。检查日志文件（在用户文件夹的 `build` 目录或 `tmp` 目录下）可以看到报错信息。

---

## 📝 总结

折腾 Rime 就像玩 LEGO，刚开始可能觉得散乱麻烦，但当你把它搭建成你心目中的样子时，那种顺手和掌控感是任何商业输入法都给不了的。

一旦配置好，这套配置可以伴随你很多年，换电脑、换手机，只需要几秒钟的同步，熟悉的输入手感就回来了。

希望这篇教程能带你入坑 Rime，开启高效输入之旅！
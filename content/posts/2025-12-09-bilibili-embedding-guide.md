---
title: "在个人网站嵌入 B 站视频：响应式、参数与踩坑记录"
date: "2025-12-28"
category: "前端"
author: "Thoi"
tags: ["Bilibili","嵌入","前端","iframe","教程"]
excerpt: "B 站官方给的嵌入代码不响应式，性能也差，而且 2026 年 7 月起 PC 外链播放器在第三方站点会被推广面板盖住画面。这篇讲怎么改成自适应、参数怎么调、以及那次遮挡问题的完整排查过程。"
lastModified: "2026-08-04"
readTime: 14
coverImage: "/uploads/covers/a794b4ce.webp"
---

> **2026-07-26 更新**：官方外链播放器 `player.bilibili.com/player.html` 现在在第三方站点内嵌时，画面区域会被「你感兴趣的视频都在B站」推广面板整块盖住。播放器本身是正常的——标题、进度条、时长都在，进度也在走，就是看不到画面。本文已把推荐做法换成 B 站的 H5 移动端播放器 `blackboard/html5mobileplayer.html`，第 2、4、8 节补上了实测过程。

直接复制 B 站分享按钮下面那段 iframe 代码，会遇到四个问题：手机端被截断或显示过小；iframe 阻塞主线程，拖慢 LCP；默认边框和滚动条跟页面设计不搭；没法控制自动播放、静音和清晰度。

下面从基础嵌入讲到框架封装，最后是那次画面被遮挡的排查记录。

## 一、基础嵌入

### 拿到 BV 号

B 站现在主要用 BV 号，在视频 URL 里就能看到：

`https://www.bilibili.com/video/BV1xx411c7mD`

### 选哪个播放器

B 站有两个可以外链的播放器地址，**2026 年 7 月起优先用后者**：

| 播放器 | 地址 | 现状 |
| :--- | :--- | :--- |
| PC 外链播放器 | `player.bilibili.com/player.html` | 第三方站点内嵌时画面被推广面板遮挡 |
| H5 移动端播放器 | `www.bilibili.com/blackboard/html5mobileplayer.html` | 正常出画面，界面也更干净 |

推荐的嵌入代码：

```html
<iframe
    src="//www.bilibili.com/blackboard/html5mobileplayer.html?bvid=BV1xx411c7mD&p=1&danmaku=0&hideCoverInfo=1&highQuality=1&fjw=0"
    scrolling="no"
    border="0"
    frameborder="no"
    framespacing="0"
    allowfullscreen="true">
</iframe>
```

传统写法仍然能用，只是会遇到上面说的遮挡：

```html
<iframe
    src="//player.bilibili.com/player.html?bvid=BV1xx411c7mD&page=1"
    scrolling="no"
    border="0"
    frameborder="no"
    framespacing="0"
    allowfullscreen="true">
</iframe>
```

几个属性的作用：`scrolling="no"` 禁止 iframe 内部滚动；`border="0" frameborder="no" framespacing="0"` 去掉默认边框；`allowfullscreen="true"` 允许全屏，漏了这个用户就没法全屏。

## 二、响应式

默认 iframe 要写死 `width` 和 `height`，在移动端会出问题。需要让容器随屏幕宽度缩放，同时保持 16:9。

### 方案 A：padding-top 比例盒子

利用 `padding-top` 百分比是基于宽度计算的特性，16:9 对应 `9 / 16 = 56.25%`。兼容性最好。

```html
<div class="bilibili-aspect-ratio">
    <iframe src="//player.bilibili.com/player.html?bvid=BV1xx411c7mD&page=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>
</div>

<style>
.bilibili-aspect-ratio {
    position: relative;
    width: 100%;
    height: 0;
    padding-top: 56.25%; /* 16:9 比例 */
    overflow: hidden;
}

.bilibili-aspect-ratio iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}
</style>
```

### 方案 B：aspect-ratio

只需要支持现代浏览器的话，这个写法简洁得多。

```html
<iframe 
    class="bilibili-player"
    src="//player.bilibili.com/player.html?bvid=BV1xx411c7mD"
    allowfullscreen="true">
</iframe>

<style>
.bilibili-player {
    width: 100%;
    aspect-ratio: 16 / 9;
    border: none;
}
</style>
```

## 三、参数

在 URL 后面拼 query 参数可以控制播放器行为。

两个播放器通用的：

| 参数名 | 说明 | 推荐值 | 备注 |
| :--- | :--- | :--- | :--- |
| `bvid` | 视频 BV 号 | 必填 | 取代旧版 `aid` |
| `p` | 分 P 索引 | `1` | 默认第一集 |
| `danmaku` | 弹幕开关 | `0` 关 / `1` 开 | 个人博客建议关掉 |
| `autoplay` | 自动播放 | `0` 关 / `1` 开 | 现代浏览器禁止带声音的自动播放 |
| `muted` | 静音 | `1` | 配合 `autoplay=1` 才能真的自动播 |
| `t` | 跳转时间 | 秒数 | `t=120` 从 2 分钟开始 |

下面这些是各自专有的，写错了不会报错，只是静默失效：

| 参数名 | 属于哪个播放器 | 说明 |
| :--- | :--- | :--- |
| `high_quality=1` | `player.html` | 画质优先 |
| `highQuality=1` | `html5mobileplayer.html` | 画质优先，注意是驼峰，和上面不通用 |
| `hideCoverInfo=1` | `html5mobileplayer.html` | 隐藏播放量等浮层信息 |
| `fjw=0` | `html5mobileplayer.html` | 关掉「上次看到 xx:xx / 跳转」提示条，默认开着 |
| `noFullScreenButton=1` | `html5mobileplayer.html` | 隐藏全屏按钮 |

一个组合示例，自动播放、关弹幕、高清优先、不显示播放量和记忆播放提示：

```text
//www.bilibili.com/blackboard/html5mobileplayer.html?bvid=BV1xx411c7mD&p=1&autoplay=1&danmaku=0&highQuality=1&hideCoverInfo=1&fjw=0
```

## 四、HTTPS 与 Mixed Content

站点是 HTTPS 而嵌入代码写的是 `http://player.bilibili.com...` 的话，浏览器会报 Mixed Content 并直接拦掉。

两个办法：写死 `https://`，或者用 `//player.bilibili.com/...` 让它跟随主站协议。后者更省事。

## 五、性能优化

iframe 会把 B 站那套庞大的播放器 JS 全下下来，对首屏影响很大。

### 原生懒加载

给 iframe 加 `loading="lazy"`，浏览器会等它快进入视口时才开始加载。

```html
<iframe src="..." loading="lazy" ...></iframe>
```

### 封面占位 + 点击加载

性能最好的做法：先只放一张封面图，用户点了再动态创建 iframe。这样首屏完全不碰播放器代码。

```html
<div class="b-video-container" data-bvid="BV1xx411c7mD">
    <!-- 封面图：可以使用 B 站 API 获取，或者自己上传 -->
    <img src="https://i0.hdslb.com/bfs/archive/YOUR_COVER_IMAGE.jpg" alt="Video Cover" class="poster">
    <div class="play-button">▶</div>
</div>

<style>
.b-video-container {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    cursor: pointer;
    background: #000;
}
.b-video-container .poster {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.8;
    transition: opacity 0.3s;
}
.b-video-container:hover .poster { opacity: 1; }
.b-video-container .play-button {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    font-size: 4rem; color: #fff;
    pointer-events: none;
    text-shadow: 0 0 10px rgba(0,0,0,0.5);
}
.b-video-container iframe { width: 100%; height: 100%; border: none; }
</style>

<script>
document.querySelectorAll('.b-video-container').forEach(container => {
    container.addEventListener('click', function() {
        const bvid = this.dataset.bvid;
        // 构建 iframe，添加 autoplay=1 实现点击即播
        const iframe = document.createElement('iframe');
        iframe.src = `//player.bilibili.com/player.html?bvid=${bvid}&autoplay=1&high_quality=1`;
        iframe.setAttribute('allowfullscreen', 'true');
        iframe.setAttribute('scrolling', 'no');
        iframe.setAttribute('border', '0');
        iframe.setAttribute('frameborder', 'no');
        
        // 清空容器并插入 iframe
        this.innerHTML = '';
        this.appendChild(iframe);
    });
});
</script>
```

## 六、各框架里的写法

### Hugo / Hexo

大多数静态博客支持直接在 Markdown 里写 HTML。不生效的话就做成 Shortcode。

`layouts/shortcodes/bilibili.html`：

```html
<div style="position: relative; width: 100%; padding-top: 56.25%;">
    <iframe src="//player.bilibili.com/player.html?bvid={{ .Get 0 }}&page={{ with .Get 1 }}{{ . }}{{ else }}1{{ end }}&high_quality=1" 
    scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" 
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe>
</div>
```

用法：`{{< bilibili BV1xx411c7mD >}}`

### React / Next.js

```jsx
import React from 'react';

const BilibiliPlayer = ({ bvid }) => {
  return (
    <div className="relative w-full pt-[56.25%]">
      <iframe
        src={`//player.bilibili.com/player.html?bvid=${bvid}&high_quality=1`}
        className="absolute top-0 left-0 w-full h-full border-0"
        scrolling="no"
        allowFullScreen
      />
    </div>
  );
};

export default BilibiliPlayer;
```

### Vue / Nuxt

```vue
<template>
  <div class="bilibili-wrapper">
    <iframe
      :src="`//player.bilibili.com/player.html?bvid=${bvid}&high_quality=1`"
      scrolling="no"
      border="0"
      frameborder="no"
      framespacing="0"
      allowfullscreen="true"
    ></iframe>
  </div>
</template>

<script setup>
defineProps({
  bvid: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.bilibili-wrapper {
  position: relative;
  width: 100%;
  padding-top: 56.25%;
}
.bilibili-wrapper iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
```

## 七、常见问题

| 问题现象 | 可能原因 | 解决方案 |
| :--- | :--- | :--- |
| 画面被「你感兴趣的视频都在B站」盖住 | B 站对第三方站点内嵌 `player.html` 的限制，播放器本身正常，只是画面区被推广面板覆盖 | 换用 `blackboard/html5mobileplayer.html`，详见下一节 |
| 嵌入后黑屏、无法播放 | 视频设了「禁止转载」；或浏览器 Referrer 策略限制 | 检查 B 站稿件设置；或加 `<meta name="referrer" content="no-referrer">`，慎用，会影响统计 |
| 加载极慢 | 没用懒加载；或 B 站服务器拥堵 | 用上面的封面占位方案，首屏不加载 iframe |
| 宽度溢出、手机端显示不全 | 没用响应式容器 | 用 `aspect-ratio` 或 `padding-top` 包一层 |
| 自动播放失效 | 浏览器禁止有声自动播放 | `autoplay=1` 和 `muted=1` 要同时给 |
| iOS Safari 全屏失效 | 缺 `allowfullscreen` | 确认 iframe 上有 `allowfullscreen="true"` |

## 八、推广面板遮挡：排查记录

2026-07-26 在本站做了一轮排查。先说结论：以下办法**都没用**，不用再试了。

- 给 `player.html` 加官方外链参数 `isOutside=true`
- 移除 iframe 的 `sandbox` 属性
- 给 iframe 加 `referrerPolicy="no-referrer"`（本文早期版本推荐过这条，对这个现象无效）

也可以排除「某个稿件设了禁止转载」这种可能：换三个不同的 BV 号，表现完全一致；而把同一个播放器 URL 在浏览器顶层直接打开，画面又是正常的。所以这是 B 站针对第三方内嵌的策略，站内绕不过去。

有效的只有一条：把 iframe 地址换成 `blackboard/html5mobileplayer.html`。在同一个页面里把两个播放器并排放，旧的仍然是占位图，移动端播放器正常出画面。

这类策略随时可能再变。如果哪天移动端播放器也被限制，兜底方案是在播放器旁边放一个「在 B 站打开」的外链按钮，至少别让访客对着一个黑框发愣。

## 小结

五条实践：

1. 用响应式容器，不要写死 `width="600"`
2. 性能上优先「点击加载」，退一步至少加 `loading="lazy"`
3. 参数上默认关弹幕、关自动播放、开高清（`player.html` 用 `high_quality=1`，移动端播放器用 `highQuality=1`）
4. iframe 的 `src` 用 `//` 开头，跟随主站协议
5. 播放器优先选 `blackboard/html5mobileplayer.html`，并留一个「在 B 站打开」的外链按钮兜底

最后这条是这次排查最大的教训：B 站的外链策略会变，而且变的时候不会通知你。留个外链按钮，成本很低。

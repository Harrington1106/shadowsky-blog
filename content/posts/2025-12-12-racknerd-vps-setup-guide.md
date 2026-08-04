---
title: "RackNerd 特价 VPS：过风控、连 SSH 与晚高峰优化"
date: "2025-12-12"
category: "教程"
author: "Thoi"
tags: ["RackNerd","VPS","SSH","教程"]
excerpt: "RackNerd 的年付方案便宜，但下单容易被欺诈检测砍掉，面板也比较老派。这篇讲怎么填资料才能过风控、密码去哪拿、SSH 常见报错，以及走 163 线路晚高峰卡顿的应对办法。"
lastModified: "2026-08-04"
readTime: 4
coverImage: "/uploads/covers/1ba48ffc.webp"
---

RackNerd 的入门款 VPS 一年十几美元，是这个价位里比较能打的选择。

麻烦在两头：下单时容易被 Fraud Check 拦下砍单，拿到机器后面板又比较老，新手常找不到密码在哪。这篇按顺序解决。

## 一、注册与购买

订单被砍多半是因为信息不一致。核心原则是保持真实。

### 网络环境

注册和下单时**关掉所有 VPN 和代理**。

系统看到你的 IP 在美国、支付方式却是支付宝、注册地址填的是中国，会直接按盗刷信用卡处理。直接用国内网络访问官网就行。

### 资料填写

- **Country**：选 China
- **Address**：用拼音填所在城市，比如 `Beijing`、`Shanghai`，不用精确到门牌号，但别乱填美国地址
- **Phone Number**：填真实的 `+86` 手机号
- **Email**：推荐 Gmail 或 Outlook。QQ 邮箱有时会把开通邮件拦掉

### 支付

直接选 Alipay。方便，而且和前面填的中国身份是一致的，对过风控有帮助。

## 二、拿服务器信息

付款成功后，别在 SolusVM 控制面板里翻密码，那个面板功能有限，主要用来重装系统和重启。

密码在邮件里：

1. 登录注册邮箱
2. 找标题带 **KVM VPS Login Information** 的那封
3. 里面有三项关键信息：
   - Main IP：服务器公网 IP
   - Root Password：初始 root 密码，一串随机字符
   - Control Panel：控制面板地址，平时用不上，重装系统时才需要

## 三、SSH 连接

推荐用 FinalShell、Xshell 或 Termius 这类工具，比系统自带的终端省事。

### 输密码没反应

用 Windows 自带的 PowerShell 或 CMD 连接时，输密码屏幕上不会显示星号或圆点，光标也不动。

这是 Linux 的正常行为，不是卡住了。照常输入或右键粘贴，然后直接回车。

### Permission denied

基本都是密码复制出了问题：

- 邮件里的密码前后容易带上多余空格，先粘到记事本确认一遍再复制
- Linux 密码严格区分大小写

### 连上之后

出现 `root@... #` 提示符就说明拿到最高权限了。后面按需求走：

- 搭代理环境，参考[阿里云轻量服务器搭建美国 IP 网络环境](/post/2025-12-08-alibaba-cloud-us-ip)里的部署部分，脚本对 Debian 和 Ubuntu 通用
- 部署网站或 Docker，参考[云服务器除了搭博客，还能拿来干什么](/post/2025-12-08-server-usage-guide)

## 四、晚高峰优化

RackNerd 走的是普通的 ChinaNet 163 线路，不是 CN2。晚上 20:00 到 23:00 拥堵是必然的，这一节讲怎么缓解。

### 开 BBR

非 CN2 线路上，BBR 是必开项。SSH 登录后执行：

```bash
echo "net.core.default_qdisc=fq" >> /etc/sysctl.conf
echo "net.ipv4.tcp_congestion_control=bbr" >> /etc/sysctl.conf
sysctl -p
```

用 `lsmod | grep bbr` 验证，看到 `tcp_bbr` 就是生效了。

### 协议选择

Shadowsocks 和 VMess 白天够用，晚高峰丢包会比较明显。

Hysteria 2 基于 UDP，在丢包严重的线路上表现明显更好，看 4K 视频时差别很直观。部署方法见 [Hysteria 2 一键部署](/post/2025-12-12-hysteria2-guide)。

### 两个协议一起装

这是我实际在用的做法。

同一台服务器上可以同时跑 Shadowsocks（比如占 50000 端口）和 Hysteria 2（比如占 40000 端口），两者互不冲突。客户端里把两个节点都添加上。

分工大致是：白天用 Shadowsocks，协议轻，手机耗电少，连接也更稳；晚高峰发现开始卡顿或断流，切到 Hysteria 2。

切换只是客户端点一下的事，所以没必要纠结选哪个，两个都部署上。

## 五、重装系统

机器搞坏了，或者想换系统版本：

1. 打开邮件里的 Control Panel 链接
2. 输入邮件中单独给的面板账号密码，注意这个和服务器 root 密码通常不一样
3. 找到 Reinstall
4. 选系统，推荐 Debian 11 或 Ubuntu 20.04
5. 重装后会生成新的 root 密码，记得存下来

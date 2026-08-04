---
title: "用 Mailcow 自建邮件服务器"
date: "2025-12-28"
category: "教程"
author: "Thoi"
tags: ["邮箱","自托管","Docker","Mailcow","教程"]
excerpt: "自建邮箱最难的不是装软件，是让发出去的信不进垃圾箱。这篇用 Mailcow Dockerized 部署，重点讲 25 端口、PTR 反向解析和 SPF/DKIM/DMARC 这几处决定成败的配置。"
lastModified: "2026-08-03"
readTime: 9
coverImage: "/uploads/covers/1bdba7d2.webp"
---

> 自建邮件服务器需要一定的 Linux 运维基础。本文用于技术交流，请勿用于发送垃圾邮件。国内云服务器通常封禁 25 端口，建议选择海外 VPS，并确认它支持设置 rDNS。

自建邮箱在 Docker 方案成熟之后已经不算难事。装起来只要十几分钟，真正花时间的是让邮件能顺利投递到 Gmail 和 Outlook 的收件箱而不是垃圾箱——那取决于 DNS 和 IP 信誉，跟你装的是哪套软件关系不大。

这篇用 Mailcow: Dockerized，从前置条件讲到收发测试。

## 一、前置条件

缺任何一项都会在后面卡住。

### 服务器配置

Mailcow 是全功能套件，包含 Postfix、Dovecot、Nginx、PHP、MySQL、Redis、ClamAV、SpamAssassin、Solr 等组件，资源占用不低：

- CPU：2 vCPU 起
- 内存：至少 4GB，建议 6GB 以上，否则 ClamAV 杀毒组件可能起不来
- 硬盘：至少 20GB 空闲，建议 40GB 以上
- 系统：Debian 11/12（推荐）或 Ubuntu 20.04/22.04 LTS

### 端口

这是最容易踩坑的地方。邮件发送依赖 **TCP 25** 端口，而 AWS、GCP、Azure、阿里云、腾讯云默认都封它。

买机器之前先测：在本地终端执行 `telnet <服务器IP> 25`，连接超时就是被封了。这一条不通，后面全都白搭。

其余用到的端口：80 和 443 用于 Web 面板和证书申请，465（SMTPS）、587（Submission）、993（IMAPS）、995（POP3S）用于客户端收发。

### 域名

需要一个顶级域名，以及对它 DNS 解析的管理权。推荐用 Cloudflare 托管，生效快且免费。

## 二、为什么选 Mailcow

主流的几套开源方案对比：

| 方案 | 架构 | 优点 | 缺点 | 适合谁 |
| :--- | :--- | :--- | :--- | :--- |
| Postfix + Dovecot | 纯手动 | 极度灵活，占用低 | 配置繁琐，排错困难 | Linux 专家 |
| iRedMail | 脚本安装 | 历史悠久，组件全 | 免费版功能受限，UI 老旧 | 传统运维 |
| Mailu | Docker | 轻量、简单 | 功能比 Mailcow 少 | 资源受限的场景 |
| Mailcow: Dockerized | Docker | 功能最全，UI 现代，自带 ActiveSync，更新频繁 | 内存占用高 | 大多数人 |

结论很简单：只要内存给得起 4GB，选 Mailcow。反垃圾、反病毒和 Web 管理都是现成的，省下来的时间远多于多花的那点内存钱。

## 三、先加一条 A 记录

安装之前，去 DNS 提供商那里加一条 A 记录指向服务器 IP。

假设域名是 `example.com`，服务器 IP 是 `1.2.3.4`：

- Type：`A`
- Name：`mail`，即 `mail.example.com`
- Content：`1.2.3.4`
- Proxy Status：**DNS Only**，把 Cloudflare 的小云朵关掉，邮件端口不能走 CDN

## 四、安装

### 装 Docker

SSH 连上服务器，切到 root：

```bash
# 1. 更新系统
apt update && apt upgrade -y

# 2. 安装必要工具
apt install curl git -y

# 3. 安装 Docker 和 Docker Compose
curl -sSL https://get.docker.com/ | CHANNEL=stable sh
systemctl enable --now docker

# 新版 Docker 已集成 Compose，无需单独安装，命令为 docker compose
docker compose version
```

### 克隆代码

```bash
cd /opt
git clone https://github.com/mailcow/mailcow-dockerized
cd mailcow-dockerized
```

### 生成配置

```bash
./generate_config.sh
```

脚本会问三个问题：

1. **Mail server hostname (FQDN)**：填 `mail.example.com`。必须是二级域名，不要填裸域名 `example.com`
2. **Timezone**：默认或者填 `Asia/Shanghai`
3. **Branch**：选 `1`（stable）

### 内存不够时的调整

服务器内存低于 4GB 的话，关掉 ClamAV 能省下大约 1GB：

```bash
nano mailcow.conf
```

把 `SKIP_CLAMD=n` 改成 `SKIP_CLAMD=y`。只有 4GB 内存的话，建议再开一点 Swap 防止 OOM。

### 启动

```bash
docker compose pull
docker compose up -d
```

等几分钟，所有容器状态变成 `Up` 就好了。

### 登录面板

浏览器访问 `https://mail.example.com`，默认账号 `admin`，默认密码 `moohoo`。

这个密码是公开的默认值，登录后第一件事就是改掉它。

## 五、添加域名和邮箱

进后台，顶部菜单 Configuration → Mail Setup。

添加域名：点 Add domain，填 `example.com`，描述随便写，点 Add domain and restart SOGO。

添加邮箱：切到刚加的域名旁边的 Mailboxes 标签页，点 Add mailbox，用户名填 `admin`（也就是 `admin@example.com`），设一个强密码。

## 六、DNS 详细配置

这一节决定你的邮件会不会进垃圾箱。

回到后台 Configuration → Mail Setup，在域名右侧点 DNS，Mailcow 会把需要的记录全列出来。然后去 DNS 提供商那里逐条添加。

### MX 记录

负责接收邮件。

- Type：`MX`
- Name：`@`
- Mail Server：`mail.example.com`
- Priority：`10`

### SPF 记录

声明哪些 IP 有权以你的域名发信。

- Type：`TXT`
- Name：`@`
- Content：`v=spf1 mx ip4:1.2.3.4 -all`

`-all` 表示除了列出的之外全部拒绝。

### DKIM 记录

给发出的邮件加数字签名。

- Type：`TXT`
- Name：`dkim._domainkey`，Mailcow 默认选择器是 dkim
- Content：从 Mailcow 的 DNS 界面完整复制，形如 `v=DKIM1; k=rsa; p=MIIBIjANBgkqhki...`

### DMARC 记录

告诉对方验证失败时怎么处理。

- Type：`TXT`
- Name：`_dmarc`
- Content：`v=DMARC1; p=quarantine; rua=mailto:admin@example.com`

建议初期先设 `p=none` 观察一段时间报告，确认没有误判之后再改成 `quarantine` 或 `reject`。

### PTR 记录

这条不在 DNS 托管商那里设，而是在 **VPS 服务商后台**，找 Reverse DNS 或 rDNS 选项，把 IP `1.2.3.4` 的 rDNS 设成 `mail.example.com`。

用 `dig -x 1.2.3.4` 验证，应该返回 `mail.example.com`。

没有 PTR 记录的话，Gmail 和 Outlook 基本一律拒信。这是整篇里最不能省的一步。

## 七、测试

### Webmail

访问 `https://mail.example.com/SOGo`，用刚建的邮箱登录，给自己的 Gmail 发一封，再回一封。

### 客户端配置

- 用户名：`admin@example.com`
- IMAP：`mail.example.com`，端口 `993`，SSL/TLS
- SMTP：`mail.example.com`，端口 `587`（STARTTLS）或 `465`（SSL/TLS）

### 评分测试

访问 [Mail-Tester](https://www.mail-tester.com/)，它会给一个临时地址，用你的自建邮箱发一封过去，然后看评分。

目标是 10/10。扣分项它会写清原因，按提示改 DNS 或邮件内容即可。

## 八、安全与维护

### Fail2ban

Mailcow 内置 Netfilter 容器充当这个角色，在 Configuration → Fail2ban parameters 里能看到被封的 IP。

默认策略比较严，密码输错几次就会封 IP，自己调试时也容易中招。

### 证书续期

内置的 `acme-mailcow` 容器会自动申请和续期 Let's Encrypt 证书。只要 80 端口通、DNS 解析正确，不需要人工干预。

### 备份

用自带的脚本：

```bash
cd /opt/mailcow-dockerized
./helper-scripts/backup_and_restore.sh backup all
```

建议配个 Cron 定期跑，并同步到对象存储。

## 九、常见问题

### 发不出邮件，提示 Connection timed out

ISP 或云厂商封了 25 端口。

用 `telnet gmail-smtp-in.l.google.com 25` 确认。不通的话只能向厂商申请解封，或者改用 SMTP 中继服务（AWS SES、SendGrid 这类）。

### 邮件进了垃圾箱

按顺序查三处：PTR 是否匹配；IP 是否在黑名单里，去 [MXToolBox](https://mxtoolbox.com/blacklists.aspx) 查，在的话要申诉；邮件本身是否太短、没主题、含敏感词。

### 收不到邮件

确认 25 端口的入站方向是否放行，以及 MX 记录是否指向了正确的主机。

### 证书申请失败

看日志：`docker compose logs -f acme-mailcow`。

多数是 HTTP-01 验证没过，也就是 80 端口不通或者被防火墙拦了。

## 小结

Mailcow 把自建邮箱的软件部分做得很省心，装完就有完整的反垃圾、反病毒和 Web 管理。

真正的门槛在两件事上：25 端口能不能用，以及 PTR 和 SPF/DKIM/DMARC 有没有配全。这两件事和用哪套软件无关，但它们决定了你的信能不能到达对方的收件箱。买机器之前先把 25 端口测通，能省掉后面全部的麻烦。

# CloudflareSub Lite（无 KV 极简版）

这是基于原项目精简后的个人自用版本：

- 不需要 KV 空间
- 不需要 Cloudflare API Token
- 不需要环境变量 / Secrets
- 不抓取第三方节点
- 不包含 ProxyIP / SOCKS5 / 白嫖节点 / 反代 HOST 逻辑
- 只做一件事：把你的原始节点按你输入的优选 IP / 优选域名批量替换，并生成订阅链接

## 部署方式

Cloudflare Workers 新版界面：

1. GitHub 上传本项目
2. Cloudflare → Workers → 创建 Worker → Continue with GitHub
3. 选择仓库
4. 构建命令留空
5. 部署命令填写：

```bash
npm run deploy
```

也可以本地安装 Wrangler 后执行：

```bash
npm install
npm run deploy
```

## 使用方式

打开 Worker 首页后：

1. 粘贴你的原始节点链接，例如 vless:// / vmess:// / trojan://
2. 粘贴你自己测出来的优选 IP 或优选域名，每行一个
3. 点击“生成订阅”
4. 复制 v2rayN / Clash / Shadowrocket 等订阅链接

优选地址支持：

```text
104.16.1.2#HK-01
104.17.2.3#HK-02
104.18.3.4:2053#US-Edge
example.com#优选域名
```

## 重要说明

因为这个版本去掉了 KV，所以不会把订阅内容保存到 Cloudflare 数据库里。

代价是：生成的订阅链接会把配置编码进 URL 里。如果你输入的原始节点和优选 IP 太多，链接会变长，少数客户端可能无法导入。

建议个人自用时控制数量，比如：

- 1 个原始节点
- 10 到 30 个优选 IP

如果你要生成几百个节点，原版 KV 短链方案更适合。

## 项目结构

```text
public/        前端页面
src/worker.js  Worker 后端逻辑
wrangler.toml  Cloudflare Worker 配置
```

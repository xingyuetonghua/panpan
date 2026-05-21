// Cloudflare Workers - 图形界面版 VLESS 优选 IP 订阅生成器
// 功能：粘贴一个原始 VLESS+WS+TLS+CF 节点链接，再批量粘贴优选 IP，一键生成通用订阅。
// 安全边界：本 Worker 只返回网页；所有转换都在浏览器本地完成。
// 不反代、不做 WebSocket 中转、不做 Tunnel、不转发任何代理流量。

export default {
  async fetch(request) {
    return new Response(HTML, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  },
};

const HTML = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CF 优选 IP 订阅生成器</title>
  <style>
    body { margin:0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#f5f5f7; color:#111827; }
    .wrap { max-width:980px; margin:0 auto; padding:24px; }
    .card { background:#fff; border:1px solid #e5e7eb; border-radius:18px; padding:20px; margin-bottom:18px; box-shadow:0 8px 24px rgba(0,0,0,.05); }
    h1 { font-size:26px; margin:0 0 8px; }
    h2 { font-size:18px; margin:0 0 12px; }
    p { line-height:1.6; color:#4b5563; }
    label { display:block; font-weight:700; margin-bottom:8px; }
    textarea, input, select { width:100%; box-sizing:border-box; border:1px solid #d1d5db; border-radius:12px; padding:12px; font-size:14px; background:#fff; color:#111827; outline:none; }
    textarea { min-height:120px; resize:vertical; }
    .row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .btns { display:flex; flex-wrap:wrap; gap:10px; margin-top:14px; }
    button { border:0; border-radius:12px; padding:11px 16px; font-weight:700; cursor:pointer; background:#111827; color:white; }
    button.secondary { background:#374151; }
    button.light { background:#e5e7eb; color:#111827; }
    .hint { font-size:13px; color:#6b7280; margin-top:8px; }
    .ok { color:#047857; font-weight:700; }
    .bad { color:#b91c1c; font-weight:700; }
    .mono { font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    @media (prefers-color-scheme: dark) {
      body { background:#0b1020; color:#e5e7eb; }
      .card { background:#111827; border-color:#253044; }
      p, .hint { color:#9ca3af; }
      textarea, input, select { background:#0b1020; color:#e5e7eb; border-color:#374151; }
      button.light { background:#253044; color:#e5e7eb; }
    }
    @media (max-width:760px) { .row { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="card">
      <h1>CF 优选 IP 订阅生成器</h1>
      <p>粘贴一个已经能用的 VLESS+WS+TLS+Cloudflare 节点链接，再批量粘贴优选 IP，即可生成通用订阅。本页面只做文本转换，不转发任何代理流量。</p>
    </section>

    <section class="card">
      <h2>1. 粘贴原始节点链接</h2>
      <label for="baseLink">原始 VLESS 链接</label>
      <textarea id="baseLink" placeholder="vless://UUID@你的域名:443?encryption=none&security=tls&sni=你的域名&type=ws&host=你的域名&path=%2Fxxx#原节点"></textarea>
      <div class="hint">建议粘贴一个已经能正常连接的 VLESS + WS + TLS + CF 橙云节点链接。</div>
    </section>

    <section class="card">
      <h2>2. 批量粘贴优选 IP</h2>
      <label for="ipList">优选 IP 列表</label>
      <textarea id="ipList" placeholder="每行一个，例如：\n162.159.192.1\n162.159.193.1\n104.18.1.1"></textarea>
      <div class="hint">支持每行一个 IP，也支持空格、逗号混排。会自动去重。</div>
    </section>

    <section class="card">
      <h2>3. 输出设置</h2>
      <div class="row">
        <div>
          <label for="namePrefix">节点名前缀</label>
          <input id="namePrefix" value="CF优选" />
        </div>
        <div>
          <label for="outputMode">输出格式</label>
          <select id="outputMode">
            <option value="plain">明文 vless:// 一行一个</option>
            <option value="base64">Base64 通用订阅</option>
          </select>
        </div>
      </div>
      <div class="btns">
        <button id="generateBtn">一键生成订阅</button>
        <button id="copyBtn" class="secondary">复制结果</button>
        <button id="downloadBtn" class="light">下载 sub.txt</button>
        <button id="clearBtn" class="light">清空</button>
      </div>
      <p id="status" class="hint"></p>
    </section>

    <section class="card">
      <h2>4. 生成结果</h2>
      <label for="output">订阅内容</label>
      <textarea id="output" class="mono" placeholder="生成后的订阅会出现在这里"></textarea>
      <div class="hint">复制这个结果到客户端，或下载为 txt 后放到自己的订阅地址里。</div>
    </section>
  </main>

  <script>
    function parseVless(link) {
      link = link.trim();
      if (!link.startsWith('vless://')) throw new Error('只支持 vless:// 链接');

      const withoutScheme = link.substring(8);
      const hashIndex = withoutScheme.indexOf('#');
      const mainAndQuery = hashIndex >= 0 ? withoutScheme.substring(0, hashIndex) : withoutScheme;
      const qIndex = mainAndQuery.indexOf('?');
      const userHost = qIndex >= 0 ? mainAndQuery.substring(0, qIndex) : mainAndQuery;
      const query = qIndex >= 0 ? mainAndQuery.substring(qIndex + 1) : '';

      const atIndex = userHost.indexOf('@');
      if (atIndex < 0) throw new Error('链接缺少 UUID@地址');

      const uuid = userHost.substring(0, atIndex);
      const hostPort = userHost.substring(atIndex + 1);
      let port = '443';

      if (hostPort.endsWith(']')) {
        port = '443';
      } else {
        const lastColon = hostPort.lastIndexOf(':');
        if (lastColon >= 0) port = hostPort.substring(lastColon + 1);
      }

      const params = new URLSearchParams(query);
      return { uuid: uuid, port: port, params: params };
    }

    function extractTargets(text) {
      const parts = text.replace(/，/g, ',').replace(/\r/g, '\n').split(/[\n,\t ]+/);
      const result = [];
      const seen = {};

      for (let i = 0; i < parts.length; i++) {
        let x = parts[i].trim();
        if (!x) continue;
        if (x.startsWith('http://')) x = x.substring(7);
        if (x.startsWith('https://')) x = x.substring(8);
        const slash = x.indexOf('/');
        if (slash >= 0) x = x.substring(0, slash);
        if (x.startsWith('[') && x.endsWith(']')) x = x.substring(1, x.length - 1);
        if (!x) continue;
        if (seen[x]) continue;
        seen[x] = true;
        result.push(x);
      }
      return result;
    }

    function safeName(s) {
      return encodeURIComponent(s).replace(/%20/g, '+');
    }

    function formatAddressForVless(address) {
      if (address.indexOf(':') >= 0 && !address.startsWith('[')) {
        return '[' + address + ']';
      }
      return address;
    }

    function b64(str) {
      const bytes = new TextEncoder().encode(str);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    }

    function generateSub() {
      const status = document.getElementById('status');
      try {
        const base = document.getElementById('baseLink').value;
        const ips = extractTargets(document.getElementById('ipList').value);
        const prefix = document.getElementById('namePrefix').value.trim() || 'CF优选';
        const mode = document.getElementById('outputMode').value;

        if (!base.trim()) throw new Error('请先粘贴原始 VLESS 节点链接');
        if (ips.length === 0) throw new Error('请至少粘贴一个优选 IP');

        const parsed = parseVless(base);
        if (!parsed.params.get('security')) parsed.params.set('security', 'tls');
        if (!parsed.params.get('encryption')) parsed.params.set('encryption', 'none');
        if (!parsed.params.get('type')) parsed.params.set('type', 'ws');

        const links = [];
        for (let i = 0; i < ips.length; i++) {
          const ip = ips[i];
          const p = new URLSearchParams(parsed.params.toString());
          const name = safeName(prefix + '-' + String(i + 1).padStart(3, '0') + '-' + ip);
          links.push('vless://' + parsed.uuid + '@' + formatAddressForVless(ip) + ':' + parsed.port + '?' + p.toString() + '#' + name);
        }

        const out = mode === 'base64' ? b64(links.join('\n')) : links.join('\n');
        document.getElementById('output').value = out;
        status.innerHTML = '<span class="ok">成功：</span>已生成 ' + links.length + ' 个节点。';
      } catch (e) {
        status.innerHTML = '<span class="bad">错误：</span>' + e.message;
      }
    }

    async function copyOutput() {
      const out = document.getElementById('output').value;
      if (!out) return;
      await navigator.clipboard.writeText(out);
      document.getElementById('status').innerHTML = '<span class="ok">已复制到剪贴板。</span>';
    }

    function downloadOutput() {
      const out = document.getElementById('output').value;
      if (!out) return;
      const blob = new Blob([out], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'sub.txt';
      a.click();
      URL.revokeObjectURL(a.href);
    }

    function clearAll() {
      document.getElementById('baseLink').value = '';
      document.getElementById('ipList').value = '';
      document.getElementById('output').value = '';
      document.getElementById('status').textContent = '';
    }

    document.getElementById('generateBtn').addEventListener('click', generateSub);
    document.getElementById('copyBtn').addEventListener('click', copyOutput);
    document.getElementById('downloadBtn').addEventListener('click', downloadOutput);
    document.getElementById('clearBtn').addEventListener('click', clearAll);
  </script>
</body>
</html>`;

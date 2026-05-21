export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 路由1：处理前端 UI 界面请求
    if (request.method === "GET" && !url.searchParams.has("sub")) {
      return new Response(getHTML(url.origin), {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    // 路由2：处理前端一键生成后、或者代理软件请求的订阅链接 (?sub=1)
    if (url.searchParams.has("sub")) {
      try {
        const b64Data = url.searchParams.get("data");
        if (!b64Data) {
          return new Response("Error: Missing data parameter", { status: 400 });
        }

        // 解密前端传过来的参数
        const decodedText = atob(b64Data);
        const config = JSON.parse(decodedText);

        const rawLink = config.rawLink.trim();
        const ipList = config.ipList;
        const prefix = config.prefix || "CF优选";

        if (!rawLink.startsWith("vless://")) {
          return new Response("Error: 目前仅支持 VLESS 原始链接", { status: 400 });
        }

        // 解析原始 VLESS 链接
        // 格式: vless://uuid@domain:port?query#remark
        const vlessReg = /^vless:\/\/([^@]+)@([^:]+):([^?]+)\?([^#]+)(?:#(.*))?$/;
        const match = rawLink.match(vlessReg);

        if (!match) {
          return new Response("Error: 原始 VLESS 链接格式解析失败", { status: 400 });
        }

        const [_, uuid, originalHost, originalPort, queryStr, originalRemark] = match;

        // 解析 Query 参数
        const searchParams = new URLSearchParams(queryStr);
        // 如果没有显式指定 host，则将原始域名作为 host 写入以确保混淆和 TLS 握手正确
        if (!searchParams.has("host")) {
          searchParams.set("host", originalHost);
        }
        if (!searchParams.has("sni")) {
          searchParams.set("sni", originalHost);
        }

        // 循环优选 IP 列表，生成新的节点链接
        let resultNodes = [];
        ipList.forEach((ipObj, index) => {
          const targetIP = ipObj.ip;
          const targetPort = ipObj.port || originalPort; // 如果优选IP带端口则用新的，否则沿用原始端口
          const nodeRemark = encodeURIComponent(`${prefix}_${index + 1}`);
          
          const newLink = `vless://${uuid}@${targetIP}:${targetPort}?${searchParams.toString()}#${nodeRemark}`;
          resultNodes.push(newLink);
        });

        const finalPayload = resultNodes.join("\n");
        
        // 根据客户端或配置要求返回 Base64 编码的通用订阅
        return new Response(btoa(finalPayload), {
          headers: { 
            "Content-Type": "text/plain;charset=UTF-8",
            "Cache-Control": "no-store"
          },
        });

      } catch (err) {
        return new Response(`Error: 订阅生成失败 (${err.message})`, { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};

// 内置图形化 UI 界面的 HTML 字符串
function getHTML(workerOrigin) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CF 优选 IP 订阅生成器</title>
    <style>
        :root {
            --bg-color: #f5f7fa;
            --card-bg: #ffffff;
            --text-color: #333333;
            --primary-color: #f38020; /* Cloudflare 橙 */
            --border-color: #e1e4e8;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            line-height: 1.6;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: var(--card-bg);
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        h1 {
            font-size: 24px;
            margin-top: 0;
            color: var(--primary-color);
            border-bottom: 2px solid var(--bg-color);
            padding-bottom: 10px;
        }
        .intro {
            font-size: 14px;
            color: #666;
            background: #fff8f2;
            padding: 12px;
            border-left: 4px solid var(--primary-color);
            border-radius: 4px;
            margin-bottom: 25px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            font-weight: 600;
            margin-bottom: 8px;
            font-size: 15px;
        }
        .hint {
            font-size: 12px;
            color: #888;
            margin-bottom: 6px;
        }
        textarea, input, select {
            width: 100%;
            box-sizing: border-box;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 10px;
            font-size: 14px;
            font-family: monospace;
            background-color: #fafafa;
        }
        textarea:focus, input:focus, select:focus {
            outline: none;
            border-color: var(--primary-color);
            background-color: #fff;
        }
        .row {
            display: flex;
            gap: 15px;
        }
        .col {
            flex: 1;
        }
        .btn-group {
            margin-top: 25px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        button {
            background-color: var(--primary-color);
            color: white;
            border: none;
            padding: 10px 20px;
            font-size: 14px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.2s;
        }
        button:hover {
            background-color: #d96f18;
        }
        button.btn-secondary {
            background-color: #6c757d;
        }
        button.btn-secondary:hover {
            background-color: #5a6268;
        }
        button.btn-clear {
            background-color: #dc3545;
        }
        button.btn-clear:hover {
            background-color: #bd2130;
        }
        .result-zone {
            margin-top: 25px;
            display: none;
            background: #f8f9fa;
            border: 1px dashed var(--primary-color);
            padding: 15px;
            border-radius: 6px;
        }
        .result-url {
            word-break: break-all;
            background: #fff;
            padding: 10px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-family: monospace;
            font-size: 13px;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>

<div class="container">
    <h1>CF 优选 IP 订阅生成器</h1>
    <div class="intro">
        粘贴一个已经能用的 VLESS+WS+TLS+Cloudflare 节点链接，再批量粘贴优选 IP，即可生成通用订阅。本页面只做文本转换，不转发任何代理流量。
    </div>

    <!-- 1. 粘贴原始节点 -->
    <div class="form-group">
        <label>1. 粘贴原始节点链接</label>
        <div class="hint">建议粘贴一个已经通过托管域名正常连接的 VLESS + WS + TLS + CF 橙云节点链接。</div>
        <textarea id="rawLink" rows="3" placeholder="vless://xxxx-xxxx-xxxx@yourdomain.com:443?encryption=none&security=tls&type=ws&host=yourdomain.com&path=%2F#orginal-node"></textarea>
    </div>

    <!-- 2. 批量粘贴优选IP -->
    <div class="form-group">
        <label>2. 批量粘贴优选 IP</label>
        <div class="hint">支持每行一个 IP，也支持带有端口的形式（如：104.18.1.1:8443）。空格、逗号、或者换行隔开均会自动去重解析。</div>
        <textarea id="ipList" rows="6" placeholder="每行一个，例如：&#10;162.159.192.1&#10;162.159.193.1:8443&#10;104.18.1.1"></textarea>
    </div>

    <!-- 3. 输出设置 -->
    <div class="row">
        <div class="col class class-group">
            <label>节点名前缀</label>
            <input type="text" id="prefix" value="CF优选">
        </div>
        <div class="col class class-group">
            <label>输出格式</label>
            <select id="outputFormat">
                <option value="base64">Base64 通用订阅</option>
            </select>
        </div>
    </div>

    <!-- 按钮组 -->
    <div class="btn-group">
        <button onclick="generateSubscription()">一键生成订阅</button>
        <button class="btn-secondary" onclick="copyResult()">复制结果</button>
        <button class="btn-secondary" onclick="downloadSub()">下载 sub.txt</button>
        <button class="btn-clear" onclick="clearAll()">清空</button>
    </div>

    <!-- 结果展示区域 -->
    <div id="resultZone" class="result-zone">
        <label>生成的订阅链接：</label>
        <div id="resultUrl" class="result-url"></div>
        <div class="hint" style="color: green; font-weight: bold;">请在代理软件（如 Clash、Karing、Nekobox 等）中直接添加上方链接即可。</div>
    </div>
</div>

<script>
    const workerOrigin = "${workerOrigin}";

    // 解析用户输入的 IP 文本
    function parseIPs(text) {
        if (!text) return [];
        // 匹配 IPv4/IPv6 以及可能带有的端口
        const lines = text.split(/[\s,\n]+/);
        const ipArray = [];
        const seen = new Set();

        lines.forEach(line => {
            let item = line.trim();
            if (!item) return;
            
            // 简单处理带端口的情况
            let ip = item;
            let port = null;
            
            if (item.includes(']') && item.includes(':')) { // IPv6 带端口 [::1]:443
                const lastColon = item.lastIndexOf(':');
                ip = item.substring(0, lastColon);
                port = item.substring(lastColon + 1);
            } else if (!item.includes(']') && item.includes(':') && (item.match(/:/g) || []).length === 1) { // IPv4 带端口 1.1.1.1:443
                const parts = item.split(':');
                ip = parts[0];
                port = parts[1];
            }

            if (!seen.has(item)) {
                seen.add(item);
                ipArray.push({ ip, port });
            }
        });
        return ipArray;
    }

    function generateSubscription() {
        const rawLink = document.getElementById('rawLink').value.trim();
        const ipText = document.getElementById('ipList').value.trim();
        const prefix = document.getElementById('prefix').value.trim();

        if (!rawLink) {
            alert('请先填写原始 VLESS 节点链接！');
            return;
        }
        const ipList = parseIPs(ipText);
        if (ipList.length === 0) {
            alert('请至少输入一个优选 IP！');
            return;
        }

        // 构造打包数据结构，并通过安全 Base64 传递给后端
        const configData = {
            rawLink: rawLink,
            ipList: ipList,
            prefix: prefix
        };

        // 转为 JSON 字符串后再进行 Base64 编码，防止特殊字符干扰 URL
        const b64Data = btoa(unescape(encodeURIComponent(JSON.stringify(configData))));
        const finalSubUrl = \`\${workerOrigin}/?sub=1&data=\${b64Data}\`;

        const resultZone = document.getElementById('resultZone');
        const resultUrl = document.getElementById('resultUrl');
        
        resultUrl.innerText = finalSubUrl;
        resultZone.style.display = 'block';
    }

    function copyResult() {
        const text = document.getElementById('resultUrl').innerText;
        if (!text) {
            alert('请先生成订阅链接');
            return;
        }
        navigator.clipboard.writeText(text).then(() => {
            alert('订阅链接已成功复制到剪贴板！');
        }).catch(err => {
            alert('复制失败，请手动选择复制');
        });
    }

    function downloadSub() {
        const text = document.getElementById('resultUrl').innerText;
        if (!text) {
            alert('请先生成订阅链接');
            return;
        }
        // 直接触发前端跳转去下载后端即时解密生成的文本流
        window.open(text, '_blank');
    }

    function clearAll() {
        document.getElementById('rawLink').value = '';
        document.getElementById('ipList').value = '';
        document.getElementById('resultZone').style.display = 'none';
        document.getElementById('resultUrl').innerText = '';
    }
</script>

</body>
</html>
  `;
}
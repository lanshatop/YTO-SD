FROM docker.1ms.run/library/node:20-slim

WORKDIR /app

COPY src/ /app/

RUN npm install --registry=https://registry.npmmirror.com && npx vite build

RUN npm install -g wrangler --registry=https://registry.npmmirror.com

# 反向代理脚本：监听 8867，转发到 8788，Host 固定为 sites.local（与 SITES_HOST 一致）
RUN cat > /app/proxy.js << 'PROXY'
const http = require('http');
http.createServer((req, res) => {
  const headers = { ...req.headers };
  headers.host = 'sites.local';
  const options = {
    hostname: '127.0.0.1',
    port: 8788,
    path: req.url,
    method: req.method,
    headers: headers
  };
  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxy.on('error', (e) => { res.writeHead(502); res.end('proxy error'); });
  req.pipe(proxy);
}).listen(8867, '0.0.0.0', () => console.log('proxy on 0.0.0.0:8867, host=sites.local'));
PROXY

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8788 8867

CMD ["/entrypoint.sh"]

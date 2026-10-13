#!/bin/sh
# 生成 .dev.vars
cat > /app/.dev.vars << EOF
WEBDAV_USERNAME=${WEBDAV_USERNAME:-admin}
WEBDAV_PASSWORD=${WEBDAV_PASSWORD:-admin}
WEBDAV_PUBLIC_READ=${WEBDAV_PUBLIC_READ:-0}
SITES_HOST=${SITES_HOST:-}
EOF

echo "=== .dev.vars ==="
cat /app/.dev.vars

# 启动反向代理（8867 -> 8788）
node /app/proxy.js &

# 启动 wrangler
exec npx wrangler pages dev build \
  --r2=BUCKET \
  --ip=0.0.0.0 \
  --port=8788 \
  --persist-to=/data/.wrangler \
  --show-interactive-dev-session=false

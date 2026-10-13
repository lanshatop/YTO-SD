# YTO-SD

基于 [Davflare](https://github.com/fanchenggang/Davflare) 改造的自托管云盘，适配飞牛OS (FNOS)，Docker 容器化部署，无需 Cloudflare。

## 功能

- 文件管理（上传/下载/删除/重命名/移动/搜索）
- WebDAV 访问
- 分享链接
- 图床（上传图片自动生成链接）
- 静态站点（发布文件夹为公开目录）
- 回收站
- 记事本

## 安装

### 方式一：飞牛OS 应用中心（推荐）

1. 下载最新版 `yto-sd_1.2.8.fpk`
2. 飞牛OS → 应用中心 → 手动安装 → 选择 FPK 文件
3. 按向导填写：
   - **用户名**：自定义登录用户名
   - **密码**：自定义登录密码
   - **数据目录**：NAS 上的存储路径（如 `/vol1/1000/yto-sd-data`）
4. 安装完成后打开应用

### 方式二：Docker Compose

```bash
git clone https://github.com/lanshatop/YTO-SD.git
cd YTO-SD
# 修改 docker-compose.yaml 中的环境变量和数据目录
docker compose up -d
```

## 访问

| 功能 | 地址 |
|------|------|
| 网盘管理 | `http://NAS_IP:8866/` |
| 公开站 | `http://NAS_IP:8866/sites/{slug}/` |
| 图床 | `http://NAS_IP:8866/i/{id}` |
| 外网（飞牛自动分配域名） | `https://your-fnos-domain/` |

> 外网访问时，公开站和图床路径不变：`https://your-fnos-domain/sites/{slug}/` 或 `https://your-fnos-domain/i/{id}`

## WebDAV

- 地址：`http://NAS_IP:8866/webdav/`
- 用户名密码与网盘登录相同
- 支持 Windows 映射网络驱动器、Mac 挂载、RaiDrive 等

## 配置说明

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `WEBDAV_USERNAME` | admin | 登录用户名 |
| `WEBDAV_PASSWORD` | - | 登录密码 |
| `SITES_HOST` | sites.local | 公开站域名（自托管留空即可） |

## 限制

- 公开目录大小：1TB
- 单文件上传：100GB
- 端口：8866

## 更新日志

### v1.2.8
- 未登录时隐藏主界面，只显示登录弹窗

### v1.2.7
- 修复发布公开目录时 worker 内存不足重启问题（改用 R2 原生 copy API）

### v1.2.6
- 修复图床上传 500 错误
- 修复图床链接格式，自动生成完整 URL
- 修复公开站 /sites/ 路径路由
- 修复桌面图标显示

### v1.2.0
- 单端口方案：通过 `/sites/` 和 `/i/` 路径区分公开站和图床
- 公开目录大小限制：1TB
- 单文件上传限制：100GB
- 品牌名改为 YTO-SD

## 源码结构

```
├── src/                    # Davflare 完整源码（含 YTO-SD 修改）
│   ├── functions/          # Cloudflare Pages Functions 后端
│   └── src/                # React 前端
├── Dockerfile              # Docker 构建文件
├── entrypoint.sh           # 容器启动脚本
├── docker-compose.yaml      # Docker Compose 配置
└── yto-sd_*.fpk            # 各版本安装包
```

## 致谢

- [Davflare](https://github.com/fanchenggang/Davflare) — 原始项目

# YTO-SD

基于 [Davflare](https://github.com/fanchenggang/Davflare) 改造的自托管云盘，适配飞牛OS (FNOS)。

## 功能

- 文件管理（上传/下载/删除/重命名/移动）
- WebDAV 访问
- 分享链接
- 图床 / 静态站点
- 回收站

## 部署

1. 下载最新版本 `yto-sd_1.2.6.fpk`
2. 飞牛OS → 应用中心 → 手动安装 → 选择 FPK 文件
3. 按向导填写用户名、密码、数据目录

## 访问

- 网盘管理：`http://NAS_IP:8866/`
- 公开站：`http://NAS_IP:8866/sites/{slug}/`
- 图床：`http://NAS_IP:8866/i/{id}`
- 外网：`https://your-fnos-domain/sites/{slug}/` 或 `https://your-fnos-domain/i/{id}`

## 更新日志

### v1.2.6
- 修复图床上传 500 错误（`contentTypeHeader.split(";").trim()` bug）
- 修复图床链接格式，自动生成完整 URL
- 修复公开站 /sites/ 路径路由
- 修复桌面图标显示

### v1.2.0
- 单端口方案：通过 `/sites/` 路径区分公开站，不需要第二个端口
- 公开目录大小限制：1TB
- 单文件上传限制：100GB
- 品牌名改为 YTO-SD

## 修改说明

- 单端口方案：通过 `/sites/` 和 `/i/` 路径区分，不需要双域名
- 公开目录大小限制：1TB
- 单文件上传限制：100GB
- 品牌名：YTO-SD

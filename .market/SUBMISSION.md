# DSH 插件市场收录准备

官方指南：<https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md>

## 准备好的内容

- 条目源文件：`L-eleven-1__dsh-wallpapers.yml`。
- 提交到官方列表时的目标路径：`data/plugins/L-eleven-1__dsh-wallpapers.yml`。
- PR 描述：`PULL_REQUEST.md`。
- 分类：`theme`；合并后由市场自动进入主题列表。
- 仓库根目录已有 `screenshots.json`，引用真实原图 `docs/reference.png`。
- 运行代码、bundle manifest、预构建客户端和 0.2.0 安装包已存在。

## 正式提交前

1. 已获仓库所有者明确授权公开代码与原图，仓库已改为 Public。匿名读取 `package.json` 已验证 HTTP 200，版本为 0.2.0。
2. 仓库创建时间为 2026-10-24 19:16:15（北京时间）。按官方满 1 天要求，最早在 **2026-10-25 19:16:15** 达标。
3. 给仓库添加 `dsh-plugin` topic。
4. 向官方列表提出只新增该 YAML 文件的 PR，等待 CI 和维护者审核。

当前文件只是准备材料，不表示已经提交申请或已被市场收录。仓库已公开；`dsh-plugin` topic 尚未保存成功。满 1 天并补齐 topic 后，再提交正式收录 PR。

# Money-Free 项目快速参考

## 🎯 关键信息

| 项目 | 版本 | 管理方式 |
|------|------|----------|
| Node.js | 20.19.5 LTS | nvm |
| pnpm | 9.6.0 | npm global |
| Python | 3.11.14 | Homebrew |
| Prisma | 6.19.2 | pnpm |

## ⚡ 常用命令

### 环境设置

```bash
# 一键设置（推荐）
./scripts/setup-env.sh

# 手动设置
nvm use                    # 切换到 Node.js 20
pnpm install               # 安装依赖
cd backend && pnpm prisma generate  # 生成 Prisma Client
```

### 开发

```bash
# 启动后端
pnpm --filter backend dev

# 启动前端
pnpm --filter frontend dev

# 同时启动
pnpm dev
```

### 数据库

```bash
cd backend

# 生成 Prisma Client
pnpm prisma generate

# 创建迁移
pnpm prisma migrate dev --name <migration-name>

# 查看数据库
pnpm prisma studio
```

### 测试

```bash
# 运行所有测试
pnpm test

# 运行后端测试
pnpm --filter backend test

# 运行前端测试
pnpm --filter frontend test

# 测试覆盖率
pnpm --filter backend test:cov
```

### 构建

```bash
# 构建所有项目
pnpm build

# 构建后端
pnpm --filter backend build

# 构建前端
pnpm --filter frontend build
```

## 🔧 Node.js 版本管理

### 检查版本

```bash
node --version             # 当前 Node.js 版本
nvm current                # nvm 当前使用的版本
nvm list                   # 列出已安装的版本
```

### 切换版本

```bash
nvm use                    # 使用 .nvmrc 中的版本
nvm use 20                 # 使用 Node.js 20
nvm use 20.19.5            # 使用具体版本
```

### 直接使用 Node.js 20（脚本中）

```bash
# 方式 1：设置 PATH
PATH=~/.nvm/versions/node/v20.19.5/bin:$PATH pnpm install

# 方式 2：直接调用
~/.nvm/versions/node/v20.19.5/bin/node --version
```

## 🐍 Python 环境

```bash
cd bridge

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 退出虚拟环境
deactivate
```

## 🐛 故障排查

### Prisma 生成失败

```bash
# 1. 确认 Node.js 版本
node --version  # 必须是 v20.19.5

# 2. 如果不对，切换版本
nvm use 20

# 3. 清理并重新安装
cd backend
rm -rf node_modules
pnpm install
pnpm prisma generate
```

### pnpm 命令不存在

```bash
# 安装 pnpm
npm install -g pnpm@9.6.0

# 验证
pnpm --version
```

### Python 虚拟环境问题

```bash
cd bridge

# 删除旧环境
rm -rf venv

# 重新创建
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 📁 项目结构速查

```
money-free/
├── .nvmrc                 # Node.js 版本锁定
├── package.json           # 根配置
├── pnpm-workspace.yaml    # pnpm monorepo
├── docker-compose.yml     # Docker 配置
│
├── backend/               # Nest.js API
│   ├── src/
│   ├── prisma/
│   │   └── schema.prisma  # 数据模型
│   └── test/
│
├── frontend/              # React + Vite
│   ├── src/
│   └── tests/
│
├── bridge/                # Python 数据桥接
│   ├── venv/
│   └── requirements.txt
│
├── data/                  # SQLite 数据库
│   └── .gitkeep
│
├── docs/                  # 文档
│   ├── NVM_GUIDE.md       # nvm 详细指南
│   └── QUICK_REFERENCE.md # 本文件
│
└── specs/                 # 功能规格
    └── 001-stock-analysis-tool/
```

## 🔗 快速链接

- **[详细 NVM 指南](NVM_GUIDE.md)** - Node.js 版本管理完整文档
- **[README](../README.md)** - 项目主文档
- **[功能规格](../specs/001-stock-analysis-tool/spec.md)** - 功能说明
- **[开发指南](../specs/001-stock-analysis-tool/quickstart.md)** - 快速上手

## 🆘 获取帮助

1. 查看 [常见问题](NVM_GUIDE.md#常见问题与解决方案)
2. 运行 `./scripts/setup-env.sh` 自动诊断
3. 检查 Node.js 版本：`node --version`
4. 阅读详细文档：`docs/NVM_GUIDE.md`

---

**提示**：将本文件加入书签，方便随时查阅！

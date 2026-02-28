# money-free
A股投资工具网站 - 股票技术分析平台

## 🚀 快速开始

### 一键安装（推荐）

```bash
# 克隆项目后，运行自动设置脚本
./scripts/setup-env.sh
```

这个脚本会自动：
- ✅ 检查并安装 Node.js 20.19.5 (via nvm)
- ✅ 安装 pnpm 9.6.0
- ✅ 安装所有项目依赖
- ✅ 生成 Prisma Client
- ✅ 设置 Python 虚拟环境

### 环境要求

- **Node.js**: 20.19.5 LTS (使用 nvm 管理)
- **pnpm**: 9.6.0
- **Python**: 3.11+ (用于 bridge)
- **Redis**: 7+ (可选，用于任务队列)

### Node.js 版本管理（重要！）

本项目使用 **Node.js 20.19.5**，通过 nvm 管理。项目根目录有 `.nvmrc` 文件锁定版本。

#### 方法 1：自动切换（推荐）

```bash
# 进入项目目录，nvm 会自动读取 .nvmrc
cd money-free

# 切换到 .nvmrc 指定的版本
nvm use

# 验证版本
node --version  # 应该显示 v20.19.5
```

#### 方法 2：手动指定版本

```bash
# 如果没有安装 Node.js 20，先安装
nvm install 20

# 切换到 Node.js 20
nvm use 20

# （可选）设置为默认版本
nvm alias default 20
```

#### 方法 3：直接使用绝对路径（Shell 脚本中）

如果在 CI/CD 或 Shell 脚本中，可以直接使用绝对路径：

```bash
# 查看 Node.js 20 的安装路径
ls ~/.nvm/versions/node/v20.19.5/bin/

# 在命令前添加 PATH 前缀
PATH=~/.nvm/versions/node/v20.19.5/bin:$PATH pnpm install
PATH=~/.nvm/versions/node/v20.19.5/bin:$PATH pnpm prisma generate
```

#### 验证环境

```bash
# 检查 Node.js 版本（必须是 20.19.5）
node --version

# 检查 npm 版本（应该是 10.x）
npm --version

# 检查 pnpm 是否可用
pnpm --version

# 如果 pnpm 不存在，安装它
npm install -g pnpm@9.6.0
```

#### 为什么必须使用 Node.js 20？

1. **Prisma 6.x 最佳兼容性**：Prisma 6.19.2 在 Node.js 20.19+ 上运行最稳定
2. **Prisma 7.x 最低要求**：未来升级到 Prisma 7 需要 Node.js 20.19+
3. **性能优化**：Node.js 20 LTS 有更好的性能和安全性
4. **避免兼容性问题**：Node.js 18 在 macOS 15.2 上可能出现 Prisma 引擎错误

### 安装依赖

```bash
# 1. 确保使用 Node.js 20
nvm use

# 2. 安装所有依赖（monorepo）
pnpm install

# 3. 生成 Prisma Client
cd backend
pnpm prisma generate

# 4. 设置 Python 环境（bridge）
cd ../bridge
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 开发

```bash
# 启动 backend（在根目录）
pnpm --filter backend dev

# 启动 frontend（在根目录）
pnpm --filter frontend dev
```

### 数据库

```bash
# 生成 Prisma Client
cd backend
pnpm prisma generate

# 创建数据库 migration
pnpm prisma migrate dev --name init

# 查看数据库
pnpm prisma studio
```

## 🔧 开发环境配置详解

### nvm 使用实践（本项目实际操作）

在本项目的设置过程中，我们遇到了以下问题和解决方案：

#### 问题 1：Prisma 在 Node.js 18 上崩溃

```bash
# 使用 Node.js 18.18.2 时
$ npx prisma generate
assertion failed [block != nullptr]: BasicBlock requested for unrecognized address
(BuilderBase.h:557 block_for_offset)
```

**解决方案**：切换到 Node.js 20

```bash
# 1. 检查已安装的 Node.js 版本
$ ls ~/.nvm/versions/node/
v10.24.1  v16.18.1  v18.18.2  v20.19.5  v22.22.0  v23.3.0

# 2. 验证 Node.js 20 可用
$ ~/.nvm/versions/node/v20.19.5/bin/node --version
v20.19.5

# 3. 在项目中使用 Node.js 20（方法 A：环境变量）
$ PATH=~/.nvm/versions/node/v20.19.5/bin:$PATH pnpm prisma generate
✔ Generated Prisma Client (v6.19.2) in 118ms

# 或者（方法 B：nvm use）
$ nvm use 20
Now using node v20.19.5 (npm v10.8.2)
```

#### 问题 2：Prisma 7.x 要求 Node.js 20.19+

```bash
# 尝试安装 Prisma 7.x
$ pnpm add -D prisma@latest
┌────────────────────────────────────────────────────────────┐
│  Prisma only supports Node.js versions 20.19+, 22.12+...  │
└────────────────────────────────────────────────────────────┘
```

**解决方案**：使用 Prisma 6.x（兼容 Node.js 20.19.5）

```bash
$ PATH=~/.nvm/versions/node/v20.19.5/bin:$PATH pnpm add -D prisma@^6.0.0
$ PATH=~/.nvm/versions/node/v20.19.5/bin:$PATH pnpm add @prisma/client@^6.0.0
```

#### 最佳实践：创建 .nvmrc 文件

```bash
# 在项目根目录创建 .nvmrc
$ echo "20.19.5" > .nvmrc

# 之后只需要运行
$ nvm use
Found '/Users/youxingzhi/ayou/money-free/.nvmrc' with version <20.19.5>
Now using node v20.19.5
```

### Shell 自动化脚本示例

如果需要在 CI/CD 或脚本中使用，可以这样写：

```bash
#!/bin/bash
# scripts/setup.sh

# 确保使用正确的 Node.js 版本
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm use 20 || nvm install 20

# 验证版本
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

# 安装依赖
pnpm install

# 生成 Prisma Client
cd backend && pnpm prisma generate
```

### pnpm + Node.js 20 配置

在 `package.json` 中锁定 Node.js 版本：

```json
{
  "engines": {
    "node": ">=20.19.5 <21.0.0",
    "pnpm": ">=9.6.0"
  }
}
```

## 📚 文档

### 开发文档
- **[快速参考](docs/QUICK_REFERENCE.md)** 🚀 - 常用命令和快速查询
- **[NVM 使用指南](docs/NVM_GUIDE.md)** ⭐ - 详细的 Node.js 版本管理说明

### 功能规格文档
详细文档请参阅 `specs/001-stock-analysis-tool/` 目录：
- `spec.md` - 功能规格说明
- `plan.md` - 技术实现方案
- `quickstart.md` - 开发指南
- `tasks.md` - 任务列表
- `research.md` - 技术调研
- `data-model.md` - 数据模型设计
- `contracts/api-spec.md` - API 接口规范

## ❓ 常见问题

### Q1: `nvm use` 不生效？

```bash
# 检查 nvm 是否正确加载
$ echo $NVM_DIR
/Users/youxingzhi/.nvm

# 如果为空，手动加载 nvm
$ export NVM_DIR="$HOME/.nvm"
$ [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 确保 .zshrc 或 .bashrc 中有以下配置
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

### Q2: Prisma 生成失败？

```bash
# 确认当前 Node.js 版本
$ node --version
v20.19.5  # ✅ 正确

# 如果不是 20.19.5，手动切换
$ nvm use 20
$ cd backend && pnpm prisma generate
```

### Q3: 在不同项目间切换 Node.js 版本？

```bash
# nvm 会自动读取每个项目的 .nvmrc 文件
$ cd project-a  # Node.js 18
$ nvm use       # 自动切换到 18

$ cd ../money-free  # Node.js 20
$ nvm use           # 自动切换到 20
```

### Q4: 如何在 VS Code / Cursor 中使用正确的 Node.js 版本？

在项目根目录创建 `.vscode/settings.json`（本项目已配置）：

```json
{
  "terminal.integrated.env.osx": {
    "PATH": "${env:HOME}/.nvm/versions/node/v20.19.5/bin:${env:PATH}"
  }
}
```

或者在 VS Code 终端中运行：

```bash
$ nvm use
$ code .  # 重新打开项目
```

### Q5: CI/CD 中如何使用 nvm？

GitHub Actions 示例：

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'  # 自动读取版本
      - run: corepack enable
      - run: pnpm install
      - run: pnpm build
```

## 🏗️ 项目结构

```
money-free/
├── backend/          # Nest.js API (Node.js 20 + Prisma 6)
├── frontend/         # React + Vite + TradingView Charts
├── bridge/           # Python 数据源桥接 (AkShare)
├── data/             # SQLite 数据库存储
├── specs/            # 功能规格和设计文档
└── pnpm-workspace.yaml
```

## ⚙️ 技术栈

### Backend
- **框架**: Nest.js 10+
- **ORM**: Prisma 6.x
- **数据库**: SQLite 3.40+
- **任务队列**: Bull + Redis
- **数据源**: Tushare Pro (HTTP API) - 使用前复权（qfq）数据

### Frontend
- **框架**: React 18+
- **构建工具**: Vite
- **图表**: TradingView Lightweight Charts
- **UI**: Ant Design
- **状态管理**: Zustand

### Bridge
- **语言**: Python 3.11+
- **数据源**: AkShare (备用数据源) - 使用前复权（qfq）数据
- **调用方式**: child_process (开发环境)

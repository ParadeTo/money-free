# nvm 使用指南 - Money-Free 项目

本文档详细说明了在 Money-Free 项目中如何使用 nvm 管理 Node.js 版本。

## 📋 目录

1. [为什么必须使用 Node.js 20.19.5](#为什么必须使用-nodejs-20195)
2. [如何切换到 Node.js 20](#如何切换到-nodejs-20)
3. [项目中的 nvm 实践](#项目中的-nvm-实践)
4. [常见问题与解决方案](#常见问题与解决方案)
5. [团队协作最佳实践](#团队协作最佳实践)

---

## 为什么必须使用 Node.js 20.19.5

### 技术原因

1. **Prisma 兼容性问题**
   - Prisma 5.x 在 macOS 15.2 上运行 Node.js 18.18.2 时会崩溃
   - 错误信息：`assertion failed [block != nullptr]`
   - 原因：Prisma 引擎与 macOS 15.2 的兼容性问题

2. **Prisma 7.x 最低要求**
   - Prisma 7.x 明确要求 Node.js >= 20.19.0
   - 未来升级路径考虑

3. **性能与安全性**
   - Node.js 20 是 LTS（长期支持）版本
   - 更好的性能和安全性更新

### 实际测试结果

| Node.js 版本 | Prisma 5.x | Prisma 6.x | Prisma 7.x |
|-------------|-----------|-----------|-----------|
| 18.18.2     | ❌ 崩溃    | ❌ 崩溃    | ❌ 不支持  |
| 20.19.5     | ✅ 正常    | ✅ 正常    | ✅ 正常    |
| 22.x        | ✅ 正常    | ✅ 正常    | ✅ 正常    |

**结论**：选择 Node.js 20.19.5 LTS 作为项目标准版本。

---

## 如何切换到 Node.js 20

### 方法 1：使用 .nvmrc（推荐 ⭐）

项目根目录有 `.nvmrc` 文件，内容为 `20.19.5`。

```bash
# 进入项目目录
cd money-free

# 自动切换到 .nvmrc 指定的版本
nvm use

# 验证
node --version  # 应该显示 v20.19.5
```

### 方法 2：手动指定版本

```bash
# 如果没有安装 Node.js 20，先安装
nvm install 20

# 切换到 Node.js 20
nvm use 20

# 验证
node --version  # 应该显示 v20.19.5
```

### 方法 3：设置为默认版本

```bash
# 将 Node.js 20 设置为全局默认版本
nvm alias default 20

# 验证
nvm current  # 应该显示 v20.19.5
```

### 方法 4：使用绝对路径（脚本/CI 中）

```bash
# 直接使用 Node.js 20 的绝对路径
~/.nvm/versions/node/v20.19.5/bin/node --version

# 在命令前添加 PATH
PATH=~/.nvm/versions/node/v20.19.5/bin:$PATH pnpm install
PATH=~/.nvm/versions/node/v20.19.5/bin:$PATH pnpm prisma generate
```

---

## 项目中的 nvm 实践

### 开发环境设置流程

本项目在开发过程中，遇到了以下问题并采取了相应的解决方案：

#### 问题 1：Prisma 在 Node.js 18 上崩溃

**错误信息**：
```bash
$ npx prisma generate
Prisma schema loaded from prisma/schema.prisma
assertion failed [block != nullptr]: BasicBlock requested for unrecognized address
(BuilderBase.h:557 block_for_offset)
```

**解决步骤**：

```bash
# 1. 检查已安装的 Node.js 版本
$ ls ~/.nvm/versions/node/
v10.24.1  v16.18.1  v18.18.2  v20.19.5  v22.22.0  v23.3.0

# 2. 验证 Node.js 20 可用
$ ~/.nvm/versions/node/v20.19.5/bin/node --version
v20.19.5

# 3. 使用 Node.js 20 运行命令
$ PATH=~/.nvm/versions/node/v20.19.5/bin:$PATH pnpm prisma generate
✔ Generated Prisma Client (v6.19.2) in 118ms
```

#### 问题 2：Prisma 7.x 版本限制

**错误信息**：
```bash
$ pnpm add -D prisma@latest
┌────────────────────────────────────────────────────────────┐
│  Prisma only supports Node.js versions 20.19+, 22.12+...  │
└────────────────────────────────────────────────────────────┘
```

**解决步骤**：

```bash
# 使用 Node.js 20 安装 Prisma 6.x
$ PATH=~/.nvm/versions/node/v20.19.5/bin:$PATH pnpm add -D prisma@^6.0.0
$ PATH=~/.nvm/versions/node/v20.19.5/bin:$PATH pnpm add @prisma/client@^6.0.0
```

### 项目配置文件

#### 1. `.nvmrc`（根目录）

```
20.19.5
```

作用：告诉 nvm 该项目使用的 Node.js 版本。

#### 2. `package.json` engines 字段

```json
{
  "engines": {
    "node": ">=20.19.5 <21.0.0",
    "pnpm": ">=9.6.0"
  },
  "packageManager": "pnpm@9.6.0"
}
```

作用：
- 限制 Node.js 版本范围
- 指定包管理器版本
- pnpm 会在安装时检查版本

#### 3. `.vscode/settings.json`

```json
{
  "terminal.integrated.env.osx": {
    "PATH": "${env:HOME}/.nvm/versions/node/v20.19.5/bin:${env:PATH}"
  }
}
```

作用：确保 VS Code / Cursor 终端使用正确的 Node.js 版本。

---

## 常见问题与解决方案

### Q1: `nvm: command not found`

**原因**：nvm 没有正确安装或未加载到 shell 环境。

**解决方案**：

```bash
# 检查 nvm 是否安装
ls ~/.nvm

# 如果不存在，安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 在 ~/.zshrc 或 ~/.bashrc 中添加
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# 重新加载配置
source ~/.zshrc  # 或 source ~/.bashrc
```

### Q2: `nvm use` 不生效

**原因**：当前 shell 会话没有加载 nvm。

**解决方案**：

```bash
# 手动加载 nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 然后再运行
nvm use
```

### Q3: Prisma 生成仍然失败

**原因**：当前 Node.js 版本不正确。

**解决方案**：

```bash
# 1. 确认当前版本
node --version

# 2. 如果不是 20.19.5，强制切换
nvm use 20.19.5

# 3. 清理并重新生成
cd backend
rm -rf node_modules .pnpm-store
pnpm install
pnpm prisma generate
```

### Q4: 在不同项目间切换导致版本混乱

**原因**：每个项目使用不同的 Node.js 版本。

**解决方案**：

```bash
# 使用 .nvmrc 自动管理
cd project-a
nvm use  # 自动切换到 project-a 的版本

cd ../money-free
nvm use  # 自动切换到 money-free 的版本（20.19.5）

# 或者在 ~/.zshrc 中添加自动切换
autoload -U add-zsh-hook
load-nvmrc() {
  local node_version="$(nvm version)"
  local nvmrc_path="$(nvm_find_nvmrc)"

  if [ -n "$nvmrc_path" ]; then
    local nvmrc_node_version=$(nvm version "$(cat "${nvmrc_path}")")

    if [ "$nvmrc_node_version" = "N/A" ]; then
      nvm install
    elif [ "$nvmrc_node_version" != "$node_version" ]; then
      nvm use
    fi
  elif [ "$node_version" != "$(nvm version default)" ]; then
    echo "Reverting to nvm default version"
    nvm use default
  fi
}
add-zsh-hook chpwd load-nvmrc
load-nvmrc
```

### Q5: VS Code / Cursor 终端使用的 Node.js 版本不对

**原因**：IDE 终端可能使用系统默认的 Node.js。

**解决方案**：

1. **方法 A：使用项目配置**（已完成）
   - 项目已有 `.vscode/settings.json` 配置
   - 重启 IDE 即可生效

2. **方法 B：手动在终端中切换**
   ```bash
   # 在 IDE 终端中运行
   nvm use
   ```

3. **方法 C：重新打开项目**
   ```bash
   # 在命令行中先切换版本
   cd money-free
   nvm use
   
   # 然后打开 IDE
   code .  # 或 cursor .
   ```

---

## 团队协作最佳实践

### 1. 使用自动化脚本

项目提供了 `scripts/setup-env.sh`，新成员可以一键设置环境：

```bash
./scripts/setup-env.sh
```

### 2. 文档先行

在 README.md 中明确说明：
- 必须使用的 Node.js 版本
- 如何安装和切换
- 常见问题的解决方案

### 3. CI/CD 配置

在 GitHub Actions 中使用 `.nvmrc`：

```yaml
- uses: actions/setup-node@v4
  with:
    node-version-file: '.nvmrc'
```

### 4. 锁定版本

- ✅ `.nvmrc` - nvm 版本锁定
- ✅ `package.json` engines - 版本范围限制
- ✅ `packageManager` - pnpm 版本锁定

### 5. 定期更新

- 每 6 个月检查一次 Node.js LTS 版本更新
- 测试新版本与 Prisma 的兼容性
- 更新 `.nvmrc` 和文档

---

## 参考资料

- [nvm 官方文档](https://github.com/nvm-sh/nvm)
- [Node.js 发行版本](https://nodejs.org/en/about/releases/)
- [Prisma 系统要求](https://www.prisma.io/docs/reference/system-requirements)
- [pnpm 官方文档](https://pnpm.io/)

---

**最后更新**: 2026-02-28
**项目版本**: 0.1.0
**Node.js 版本**: 20.19.5 LTS

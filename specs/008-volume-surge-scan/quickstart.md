# 快速开始指南：成交量激增扫描器

**功能**: 008-volume-surge-scan | **日期**: 2026-03-18  
**目的**: 帮助开发者快速搭建本地开发环境并运行功能

## 前提条件

### 系统要求

- **操作系统**: macOS 或 Linux
- **Node.js**: 
  - 后端：20.x（必须，通过nvm管理）
  - 前端：18+
- **数据库**: SQLite 3.40+（已包含在项目中）
- **包管理器**: npm

### 环境验证

```bash
# 检查Node.js版本
node --version  # 应显示 v18.x 或更高

# 检查npm版本
npm --version   # 应显示 9.x 或更高

# 检查nvm（后端需要）
nvm --version   # 应显示版本号
```

---

## 安装步骤

### 1. 克隆或切换到功能分支

```bash
cd /Users/youxingzhi/ayou/money-free
git checkout 008-volume-surge-scan
```

### 2. 安装后端依赖

```bash
cd backend

# 切换到Node.js 20.x
nvm use 20

# 安装依赖
npm install

# 验证Node版本
node --version  # 应显示 v20.x
```

### 3. 安装前端依赖

```bash
cd ../frontend
npm install
```

### 4. 配置数据库

```bash
cd ../backend

# 生成Prisma Client
npx prisma generate

# 运行数据库迁移（创建新表）
npx prisma migrate dev --name add_volume_surge_scan_tables
```

**预期输出**:
```
✔ Generated Prisma Client
✔ The migration has been created successfully
```

### 5. 验证安装

```bash
# 检查数据库表是否创建成功
npx prisma studio
```

在打开的浏览器中，应该看到以下新表：
- `volume_surge_scans`
- `scan_results`

---

## 运行应用

### 启动后端服务

```bash
cd backend

# 确保使用Node.js 20.x
nvm use 20

# 启动开发服务器
npm run start:dev
```

**预期输出**:
```
[Nest] 12345  - LOG [NestFactory] Starting Nest application...
[Nest] 12345  - LOG [InstanceLoader] AppModule dependencies initialized
[Nest] 12345  - LOG [RoutesResolver] VolumeSurgeController {/api/volume-surge}:
[Nest] 12345  - LOG [NestApplication] Nest application successfully started
```

后端服务运行在: `http://localhost:3000`

### 启动前端应用

在新终端窗口中：

```bash
cd frontend
npm run dev
```

**预期输出**:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

前端应用运行在: `http://localhost:5173`

---

## 功能验证

### 1. 测试后端API

使用curl或Postman测试API端点：

```bash
# 1. 触发自动模式扫描
curl -X POST http://localhost:3000/api/volume-surge/scan \
  -H "Content-Type: application/json" \
  -d '{"mode": "auto", "source": "cli"}'

# 预期响应:
# {
#   "success": true,
#   "data": {
#     "scanId": "550e8400-e29b-41d4-a716-446655440000",
#     "status": "running",
#     "message": "Scan started successfully"
#   }
# }

# 2. 查询扫描状态（将scanId替换为上面返回的值）
curl http://localhost:3000/api/volume-surge/scans/550e8400-e29b-41d4-a716-446655440000

# 3. 查询扫描结果
curl "http://localhost:3000/api/volume-surge/scans/550e8400-e29b-41d4-a716-446655440000/results?filter=matched"
```

### 2. 测试前端界面

1. 打开浏览器访问 `http://localhost:5173`
2. 导航到"Volume Surge Scan"页面（路由：`/volume-surge-scan`）
3. 点击"Start Scan"按钮
4. 等待扫描完成（应显示进度条）
5. 查看结果列表
6. 点击某只股票查看详情
7. 尝试导出CSV或Markdown

### 3. 测试CLI工具

```bash
cd backend

# 自动模式扫描
npm run scan:volume-surge

# 手动模式扫描（指定参考日期）
npm run scan:volume-surge -- --date 2026-03-02

# 扫描并导出CSV
npm run scan:volume-surge -- --export csv

# 扫描并导出Markdown
npm run scan:volume-surge -- --export markdown

# 详细日志模式
npm run scan:volume-surge -- --verbose
```

**预期输出**（自动模式）:
```
[INFO] Starting Volume Surge Scan...
[INFO] Scan Mode: auto
[INFO] Total Stocks: 3000
[PROGRESS] Scanning... 10% (300/3000)
[PROGRESS] Scanning... 20% (600/3000)
...
[SUCCESS] Scan completed in 8.5s
[RESULT] Matched Stocks: 42
[RESULT] Unmatched Stocks: 2958
```

---

## 开发工作流

### 运行测试

```bash
# 后端单元测试
cd backend
npm run test

# 前端组件测试
cd frontend
npm run test

# 后端测试覆盖率
cd backend
npm run test:cov
```

### 代码检查

```bash
# 后端ESLint
cd backend
npm run lint

# 前端ESLint
cd frontend
npm run lint

# 修复可自动修复的问题
npm run lint:fix
```

### 类型检查

```bash
# 后端TypeScript检查
cd backend
npm run build

# 前端TypeScript检查
cd frontend
npm run type-check
```

### 数据库管理

```bash
cd backend

# 打开Prisma Studio（可视化数据库管理）
npx prisma studio

# 重置数据库（开发环境）
npx prisma migrate reset

# 查看数据库Schema
npx prisma db pull
```

---

## 常见问题

### Q1: 后端启动失败，提示"Node.js版本不兼容"

**原因**: 后端需要Node.js 20.x

**解决方案**:
```bash
nvm install 20
nvm use 20
cd backend
npm install
npm run start:dev
```

### Q2: 数据库迁移失败

**原因**: 数据库文件损坏或Schema冲突

**解决方案**:
```bash
cd backend
# 重置数据库（会丢失所有数据）
npx prisma migrate reset
# 重新运行迁移
npx prisma migrate dev
```

### Q3: 前端无法连接后端API

**原因**: 后端服务未启动或端口冲突

**解决方案**:
1. 确认后端运行在 `http://localhost:3000`
2. 检查前端 `.env` 文件中的API地址配置
3. 检查浏览器控制台的网络请求错误

### Q4: CLI工具找不到命令

**原因**: `package.json` 中未添加CLI脚本

**解决方案**:
在 `backend/package.json` 中添加：
```json
{
  "scripts": {
    "scan:volume-surge": "ts-node src/scripts/scan-cli.ts"
  }
}
```

### Q5: 扫描速度慢，超过30秒

**原因**: 并发数过低或数据库查询未优化

**解决方案**:
1. 检查 `p-limit` 并发数配置（默认10，可调整到20）
2. 确认数据库索引已创建
3. 运行 `npm run scan:volume-surge -- --verbose` 查看详细日志

### Q6: 前端图表不显示

**原因**: ECharts库未正确加载

**解决方案**:
```bash
cd frontend
npm install echarts echarts-for-react
```

---

## 调试技巧

### 后端调试

**使用VSCode调试器**:

1. 在 `.vscode/launch.json` 中添加配置：

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "start:debug"],
  "cwd": "${workspaceFolder}/backend",
  "console": "integratedTerminal"
}
```

2. 设置断点
3. 按F5启动调试

**查看详细日志**:

```bash
cd backend
export LOG_LEVEL=debug
npm run start:dev
```

### 前端调试

**使用React DevTools**:

1. 安装Chrome插件：React Developer Tools
2. 打开浏览器开发者工具
3. 切换到"Components"标签
4. 查看组件状态和props

**查看API请求**:

1. 打开浏览器开发者工具（F12）
2. 切换到"Network"标签
3. 过滤XHR/Fetch请求
4. 查看请求和响应详情

### 数据库调试

**查看执行的SQL语句**:

在 `backend/prisma/schema.prisma` 中启用日志：

```prisma
generator client {
  provider = "prisma-client-js"
  log      = ["query", "info", "warn", "error"]
}
```

然后在代码中查看日志输出。

---

## 下一步

开发环境配置完成后，可以：

1. **阅读设计文档**:
   - [data-model.md](./data-model.md) - 数据模型设计
   - [contracts/api.md](./contracts/api.md) - API契约
   - [research.md](./research.md) - 技术决策

2. **创建任务列表**:
   ```bash
   # 运行speckit.tasks命令生成任务分解
   /speckit.tasks
   ```

3. **开始TDD开发**:
   - 先编写测试（参考 `plan.md` 中的测试策略）
   - 红-绿-重构循环
   - 确保测试覆盖率 > 80%

4. **参考现有代码**:
   - VCP模块：`backend/src/modules/vcp/`
   - 数据源服务：`backend/src/services/datasource/`
   - 前端页面示例：`frontend/src/pages/`

---

## 联系与帮助

如果遇到问题：

1. 检查本文档的"常见问题"章节
2. 查看项目根目录的 `.cursor/rules/` 开发指南
3. 查阅 `docs/` 目录中的相关文档
4. 检查Git提交历史中的类似功能实现

**重要提示**: 
- 后端开发必须使用Node.js 20.x（`nvm use 20`）
- 遵循TDD原则，测试先行
- 所有前端UI文本使用英文
- 提交前运行lint和测试

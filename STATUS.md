# Money-Free 项目状态

**最后更新**: 2026-02-28 16:44:00  
**项目版本**: 0.1.0  
**开发阶段**: Phase 3 完成，Phase 4 进行中

---

## 🎯 当前状态总览

### ✅ 已完成的阶段

#### Phase 1: Setup（项目初始化）✅
- Monorepo 结构（pnpm workspace）
- Backend: Nest.js + Prisma 6.x + SQLite
- Frontend: React 18 + Vite + Ant Design
- Bridge: Python 3.11 环境
- 开发环境完整配置

#### Phase 2: Foundational（基础架构）✅
- SQLite 数据库 + WAL 优化
- 全局异常过滤器 + 日志拦截器
- Python Bridge 服务 (child_process)
- Swagger API 文档
- 前端路由 + 状态管理

#### Phase 3: User Story 0（用户登录）✅
- JWT 认证系统
- 登录/登出功能
- ProtectedRoute 保护路由
- Session 持久化
- 管理员账户创建完成

### 🚧 进行中的阶段

#### Phase 4: User Story 1（K线图和技术指标）
- ✅ Stock API 实现
- ✅ 测试数据添加（5只股票）
- ⏳ KLine 数据服务（待实现）
- ⏳ 技术指标计算（待实现）
- ⏳ 前端图表组件（待实现）

---

## 📊 开发环境

### 正在运行的服务

| 服务 | 地址 | 状态 |
|------|------|------|
| Backend API | http://localhost:3000 | 🟢 运行中 |
| Frontend Dev | http://localhost:5173 | 🟢 运行中 |
| Swagger Docs | http://localhost:3000/api-docs | 🟢 可用 |
| SQLite DB | `data/stocks.db` | 🟢 已创建 |

### 环境版本

| 组件 | 版本 | 状态 |
|------|------|------|
| Node.js | 20.19.5 LTS | ✅ |
| pnpm | 9.6.0 | ✅ |
| Python | 3.11.14 | ✅ |
| Prisma | 6.19.2 | ✅ |
| Nest.js | 10.4.22 | ✅ |
| React | 18.3.1 | ✅ |

---

## 🧪 API 测试结果

### 认证 API

```bash
# 登录（返回 JWT token）
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
✅ 成功

# 获取当前用户
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <token>"
✅ 成功
```

### 股票 API

```bash
# 搜索所有股票
curl http://localhost:3000/api/v1/stocks/search
✅ 成功（返回 5 只股票）

# 按关键词搜索
curl "http://localhost:3000/api/v1/stocks/search?search=600"
✅ 成功（返回 2 只股票：600519, 600036）

# 获取股票详情
curl http://localhost:3000/api/v1/stocks/600519
✅ 成功（返回贵州茅台详情）
```

---

## 📁 项目结构

```
money-free/
├── backend/                    # Nest.js API (运行中)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/           # ✅ 认证模块
│   │   │   ├── stocks/         # ✅ 股票模块
│   │   │   └── prisma/         # ✅ Prisma 服务
│   │   ├── common/             # ✅ 通用组件
│   │   ├── config/             # ✅ 配置文件
│   │   ├── services/           # ✅ Python Bridge
│   │   └── scripts/            # ✅ 数据脚本
│   ├── prisma/
│   │   ├── schema.prisma       # ✅ 9 个实体
│   │   └── migrations/         # ✅ 初始 migration
│   └── test/                   # ✅ 测试框架
│
├── frontend/                   # React + Vite (运行中)
│   ├── src/
│   │   ├── pages/
│   │   │   └── LoginPage.tsx   # ✅ 登录页面
│   │   ├── components/common/  # ✅ 通用组件
│   │   ├── services/           # ✅ API 服务
│   │   ├── store/              # ✅ 状态管理
│   │   ├── hooks/              # ✅ 自定义 Hooks
│   │   ├── types/              # ✅ 类型定义
│   │   └── utils/              # ✅ 工具函数
│   └── tests/                  # ✅ 测试文件
│
├── bridge/                     # Python 桥接
│   ├── venv/                   # ✅ Python 3.11 环境
│   ├── health_check.py         # ✅ 健康检查
│   ├── calculate_kdj.py        # ✅ KDJ 计算
│   └── akshare_fetcher.py      # ✅ AkShare 数据
│
├── data/
│   └── stocks.db               # ✅ SQLite 数据库（5只股票）
│
├── docs/                       # ✅ 文档
│   ├── NVM_GUIDE.md
│   └── QUICK_REFERENCE.md
│
└── specs/                      # ✅ 功能规格
    └── 001-stock-analysis-tool/
```

---

## 💾 数据库状态

### 当前数据

- **用户**: 1 个（admin）
- **股票**: 5 只（测试数据）
  - 600519 贵州茅台
  - 000001 平安银行
  - 000858 五粮液
  - 601318 中国平安
  - 600036 招商银行

### 数据库优化

- ✅ WAL 模式已启用
- ✅ 缓存大小: 64MB
- ✅ 同步模式: NORMAL
- ✅ 外键约束已启用
- ✅ 临时数据存储: MEMORY

---

## 🔑 访问凭证

### 管理员账户

```
Username: admin
Password: admin123
```

**⚠️ 安全提示**: 生产环境请立即更改默认密码！

---

## 🧪 测试命令

### 后端测试

```bash
# 运行所有测试
cd backend && pnpm test

# 运行 Python Bridge 测试
cd backend && pnpm test test_python_bridge

# 运行集成测试
cd backend && pnpm test:e2e
```

### 前端测试

```bash
# 运行所有测试
cd frontend && pnpm test

# 运行特定测试
cd frontend && pnpm test LoginPage
```

---

## 📝 下一步任务

### 立即任务

1. **创建 KLine 数据服务** (T065)
   - 实现 GET /klines/:stockCode 端点
   - 添加日线/周线数据查询

2. **创建技术指标服务** (T066)
   - 实现 MA, KDJ, RSI 计算
   - 实现 GET /indicators/:stockCode 端点

3. **前端图表组件** (T082-T088)
   - 集成 TradingView Lightweight Charts
   - 实现 MA、KDJ、RSI 子图

### 后续任务

4. **数据初始化脚本** (T057-T059)
   - 从 Tushare/AkShare 获取历史数据
   - 批量计算技术指标

5. **收藏功能** (US2)
6. **选股策略** (US3)
7. **手动数据更新** (US5)

---

## 🐛 已知问题

1. ~~中文搜索不精确~~ → ✅ 已修复（使用 contains + startsWith）
2. 需要添加 K线历史数据
3. 需要实现技术指标计算

---

## 📚 快速链接

- **API 文档**: http://localhost:3000/api-docs
- **前端应用**: http://localhost:5173
- **详细文档**: [docs/QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)
- **NVM 指南**: [docs/NVM_GUIDE.md](docs/NVM_GUIDE.md)
- **任务列表**: [specs/001-stock-analysis-tool/tasks.md](specs/001-stock-analysis-tool/tasks.md)

---

## 🆘 故障排查

### 后端无法启动？

```bash
# 1. 检查 Node.js 版本
node --version  # 必须是 v20.19.5

# 2. 切换版本
nvm use

# 3. 重新生成 Prisma Client
cd backend && pnpm prisma generate

# 4. 重启服务
pnpm run start:dev
```

### 前端无法访问 API？

```bash
# 检查 .env 配置
cat frontend/.env
# 应该是: VITE_API_BASE_URL=http://localhost:3000/api/v1

# 检查 backend 是否运行
curl http://localhost:3000/api/v1/health
```

### Python Bridge 不工作？

```bash
# 激活虚拟环境
cd bridge && source venv/bin/activate

# 测试健康检查
echo '{}' | python health_check.py

# 测试 KDJ 计算
echo '{"high":[10,11,12],"low":[9,10,11],"close":[9.5,10.5,11.5],"period":3}' | python calculate_kdj.py
```

---

**提示**: 本文件会持续更新项目状态，建议经常查看！

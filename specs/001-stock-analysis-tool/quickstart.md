# 快速开始指南

**项目**: 股票分析工具  
**日期**: 2026-02-28  
**目标**: 帮助开发者在本地快速搭建开发环境并运行项目

---

## 前置要求

### 必需软件

- **Python**: 3.11 或更高版本
  ```bash
  python --version  # 应输出 Python 3.11.x 或更高
  ```

- **Node.js**: 18.x 或更高版本
  ```bash
  node --version  # 应输出 v18.x.x 或更高
  ```

- **npm**: 9.x 或更高版本（或使用 pnpm/yarn）
  ```bash
  npm --version  # 应输出 9.x.x 或更高
  ```

- **Git**: 用于版本控制

### 推荐工具

- **VS Code**: 推荐的代码编辑器
  - 推荐插件：
    - Python (ms-python.python)
    - Pylance (ms-python.vscode-pylance)
    - ESLint (dbaeumer.vscode-eslint)
    - Prettier (esbenp.prettier-vscode)
- **Postman** 或 **Insomnia**: 用于 API 测试

---

## 项目克隆

```bash
# 克隆仓库
git clone <仓库地址>
cd money-free

# 切换到特性分支
git checkout 001-stock-analysis-tool
```

---

## 后端设置

### 1. 创建虚拟环境

```bash
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境（macOS/Linux）
source venv/bin/activate

# 激活虚拟环境（Windows）
venv\Scripts\activate
```

### 2. 安装依赖

```bash
# 安装 Python 依赖
pip install --upgrade pip
pip install -r requirements.txt
```

**requirements.txt** 内容（参考）:
```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
pydantic==2.5.0
pandas==2.2.0
pandas-ta==0.3.14b
tushare==1.4.3
akshare==1.13.0
pyjwt==2.8.0
bcrypt==4.1.2
apscheduler==3.10.4
python-multipart==0.0.6
pytest==7.4.4
pytest-asyncio==0.23.3
httpx==0.26.0
```

### 3. 配置环境变量

```bash
# 创建 .env 文件
cp .env.example .env

# 编辑 .env 文件
nano .env
```

**.env** 示例内容:
```bash
# Tushare Pro Token（从 https://tushare.pro 获取）
TUSHARE_TOKEN=your_tushare_token_here

# SQLite 数据库路径
DATABASE_PATH=../data/stocks.db

# JWT 密钥（随机生成）
SECRET_KEY=your-secret-key-here

# 管理员账户密码（默认 admin）
ADMIN_PASSWORD=admin

# 环境（development/production）
ENVIRONMENT=development

# 日志级别
LOG_LEVEL=INFO
```

**获取 Tushare Token**:
1. 访问 [Tushare Pro](https://tushare.pro)
2. 注册账户并登录
3. 在"个人主页"中找到"接口Token"
4. 复制Token并填入 `.env` 文件

### 4. 初始化数据库

```bash
# 创建数据目录
mkdir -p ../data

# 运行数据库初始化脚本
python -m scripts.init_stocks

# 可选：获取历史K线数据（耗时较长，约30分钟-1小时）
python -m scripts.fetch_kline_data

# 可选：计算技术指标（耗时约10-20分钟）
python -m scripts.calculate_indicators
```

**注意**: 
- 首次运行 `fetch_kline_data` 会下载约1000只股票近20年的历史数据，需要较长时间
- 如果不运行数据初始化脚本，可以使用测试数据库（后续提供）

### 5. 启动后端服务

```bash
# 开发模式（热重载）
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# 或使用简化命令（如果配置了 Makefile）
make dev
```

后端服务将在 `http://localhost:8000` 启动。

**验证后端运行**:
- 访问 API 文档：`http://localhost:8000/docs` (Swagger UI)
- 访问健康检查：`http://localhost:8000/health`

---

## 前端设置

### 1. 安装依赖

```bash
cd ../frontend

# 使用 npm
npm install

# 或使用 pnpm（推荐，更快）
pnpm install

# 或使用 yarn
yarn install
```

**package.json** 依赖（参考）:
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "lightweight-charts": "^4.1.0",
    "axios": "^1.6.5",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.11",
    "typescript": "^5.3.3",
    "eslint": "^8.56.0",
    "prettier": "^3.2.4",
    "vitest": "^1.2.0",
    "@testing-library/react": "^14.1.2"
  }
}
```

### 2. 配置环境变量

```bash
# 创建 .env 文件
cp .env.example .env.local

# 编辑 .env.local 文件
nano .env.local
```

**.env.local** 示例内容:
```bash
# 后端 API 地址
VITE_API_BASE_URL=http://localhost:8000/api/v1

# 环境
VITE_ENVIRONMENT=development
```

### 3. 启动前端开发服务器

```bash
# 启动 Vite 开发服务器
npm run dev

# 或
pnpm dev

# 或
yarn dev
```

前端应用将在 `http://localhost:5173` 启动（Vite 默认端口）。

**验证前端运行**:
- 访问 `http://localhost:5173`
- 应该看到登录页面

---

## 完整开发流程

### 1. 启动后端和前端

**选项 A: 分别启动（推荐用于调试）**

```bash
# Terminal 1: 启动后端
cd backend
source venv/bin/activate
uvicorn src.main:app --reload

# Terminal 2: 启动前端
cd frontend
npm run dev
```

**选项 B: 使用 Makefile（如果配置）**

```bash
# 根目录
make dev-all  # 同时启动后端和前端
```

### 2. 登录系统

1. 打开浏览器访问 `http://localhost:5173`
2. 使用预设账户登录：
   - 用户名：`admin`
   - 密码：`admin`
3. 登录成功后进入主页面

### 3. 测试核心功能

#### 查看K线图
1. 在搜索框输入股票代码（如 `600519`）或股票名称（如 `茅台`）
2. 点击搜索结果中的股票
3. 查看K线图、添加技术指标（MA、KDJ、RSI等）
4. 切换日K/周K周期

#### 选股筛选
1. 进入"选股"页面
2. 添加筛选条件（如"RSI < 30"）
3. 点击"筛选"查看结果
4. 点击"保存为策略"保存筛选方案

#### 收藏股票
1. 在K线图页面点击"添加收藏"
2. 进入"收藏列表"查看已收藏股票
3. 拖动调整收藏顺序

#### 图表绘图
1. 在K线图页面选择绘图工具（趋势线、水平线等）
2. 在图表上点击绘制
3. 刷新页面验证绘图对象是否保存

---

## 运行测试

### 后端测试

```bash
cd backend

# 运行所有测试
pytest

# 运行单元测试
pytest tests/unit

# 运行集成测试
pytest tests/integration

# 查看测试覆盖率
pytest --cov=src --cov-report=html
```

### 前端测试

```bash
cd frontend

# 运行所有测试
npm run test

# 运行测试（监听模式）
npm run test:watch

# 查看测试覆盖率
npm run test:coverage
```

---

## 常见问题

### 1. Tushare API 积分不足

**问题**: 运行 `fetch_kline_data` 时提示"积分不足"

**解决方案**:
- Tushare Pro 新用户每日有调用次数限制
- 升级账户等级获得更多积分：https://tushare.pro/document/1?doc_id=13
- 或使用 AkShare 作为备用数据源（自动降级）

### 2. 数据库文件过大

**问题**: SQLite 文件大小超过预期

**解决方案**:
```bash
# 压缩数据库
sqlite3 ../data/stocks.db "VACUUM;"

# 查看数据库大小
du -sh ../data/stocks.db
```

### 3. 前端无法连接后端

**问题**: 前端请求后端 API 失败（CORS 错误）

**解决方案**:
- 检查后端是否启动：`curl http://localhost:8000/health`
- 检查 CORS 配置（backend/src/main.py）:
  ```python
  from fastapi.middleware.cors import CORSMiddleware
  
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["http://localhost:5173"],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```

### 4. 图表加载缓慢

**问题**: K线图加载时间超过2秒

**解决方案**:
- 检查数据库索引是否创建
- 减少查询的历史数据范围（默认20年可能过多）
- 使用浏览器开发者工具检查网络请求耗时

### 5. 技术指标计算错误

**问题**: RSI、KDJ 等指标值与第三方工具不一致

**解决方案**:
- 验证 pandas-ta 版本：`pip show pandas-ta`
- 检查计算参数是否正确（K=9, D=3, RSI=14）
- 参考 pandas-ta 文档：https://github.com/twopirllc/pandas-ta

---

## 数据备份

### 备份数据库

```bash
# 手动备份
cp ../data/stocks.db ../data/stocks_backup_$(date +%Y%m%d).db

# 或使用脚本（如果配置）
python scripts/backup_database.py
```

### 恢复数据库

```bash
# 从备份恢复
cp ../data/stocks_backup_20260228.db ../data/stocks.db
```

---

## 部署

### 开发环境 vs 生产环境

| 配置项 | 开发环境 | 生产环境 |
|--------|---------|---------|
| 后端主机 | 0.0.0.0:8000 | 0.0.0.0:8000 (通过 Nginx 代理) |
| 前端构建 | `npm run dev` | `npm run build` + Nginx 托管 |
| 日志级别 | DEBUG | INFO |
| 错误堆栈 | 显示 | 隐藏 |
| CORS | 允许 localhost | 限制特定域名 |

### 生产环境快速部署（Docker）

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

**docker-compose.yml** 示例（待实现）:
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
    environment:
      - TUSHARE_TOKEN=${TUSHARE_TOKEN}
      - DATABASE_PATH=/app/data/stocks.db
  
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

---

## 下一步

1. **阅读技术文档**:
   - [数据模型设计](./data-model.md)
   - [REST API 契约](./contracts/rest-api.md)
   - [技术研究报告](./research.md)

2. **开发任务**:
   - 查看 [tasks.md](./tasks.md) 了解具体开发任务（Phase 2 生成）

3. **联系支持**:
   - 遇到问题时，查看 [常见问题](#常见问题) 章节
   - 或提交 GitHub Issue

---

**文档版本**: v1.0  
**最后更新**: 2026-02-28

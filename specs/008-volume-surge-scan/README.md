# 008 - Volume Surge Scanner (成交量激增扫描器)

> 识别早期启动信号，避免高点买入

---

## 🎯 功能概述

自动扫描全市场股票，识别以下特征：

1. **成交量从萎缩到放大** - 识别量能转折点
2. **50日均线开始向上** - 均线趋势判断
3. **买量支撑充足** - 上涨日成交量 > 下降日成交量

### 典型案例：比亚迪（SZ002594）

- 3月2日前：成交量持续萎缩
- 3月2日起：成交量突然放大
- 之后：上涨日成交量始终大于下降日
- 结果：避免买在高点，捕获早期启动信号

---

## ⚡ 快速开始

### 1. CLI工具（最快）

```bash
cd backend
npm run vss:scan
```

**5分钟内完成扫描并导出结果**。

### 2. Web界面

```bash
# 启动后端
cd backend && npm run start:dev

# 启动前端（新终端）
cd frontend && npm run dev
```

访问: `http://localhost:5173/volume-surge-scan`

### 3. API调用

```bash
curl -X POST http://localhost:3000/api/volume-surge/scan \
  -H "Content-Type: application/json" \
  -d '{"mode": "AUTO", "source": "cli"}'
```

---

## 📚 文档导航

### 开发者文档

1. **[spec.md](./spec.md)** - 功能规格说明
   - 用户故事
   - 功能需求
   - 验收标准

2. **[plan.md](./plan.md)** - 技术实施计划
   - 架构设计
   - 技术栈选择
   - 实施阶段

3. **[tasks.md](./tasks.md)** - 任务分解清单
   - 75个具体任务
   - TDD测试策略
   - 并行化标记

### 技术文档

4. **[research.md](./research.md)** - 技术决策文档
   - 算法研究
   - 依赖库选型
   - 性能优化策略

5. **[data-model.md](./data-model.md)** - 数据模型设计
   - Prisma Schema
   - 字段说明
   - 索引策略

6. **[contracts/api.md](./contracts/api.md)** - API契约规范
   - 7个REST端点
   - 请求/响应格式
   - 错误码定义

### 使用文档

7. **[quickstart.md](./quickstart.md)** - 快速开始指南
   - 环境配置
   - 安装步骤
   - 功能验证

8. **[cli-usage.md](./cli-usage.md)** - CLI使用指南
   - 命令语法
   - 示例用法
   - 常见问题

9. **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - 实施总结
   - 架构概览
   - 关键指标
   - 优化建议

---

## 🛠️ 技术栈

### 后端

- **NestJS** - Web框架
- **Prisma** - ORM
- **SQLite** - 数据库
- **TypeScript** - 编程语言
- **p-limit** - 并发控制
- **yargs** - CLI工具

### 前端

- **React 18** - UI框架
- **TypeScript** - 编程语言
- **Ant Design** - UI组件库
- **Axios** - HTTP客户端
- **Vite** - 构建工具

---

## 📊 项目结构

```
008-volume-surge-scan/
├── README.md                    # 本文件
├── spec.md                      # 功能规格
├── plan.md                      # 实施计划
├── tasks.md                     # 任务清单
├── research.md                  # 技术研究
├── data-model.md                # 数据模型
├── quickstart.md                # 快速开始
├── cli-usage.md                 # CLI指南
├── IMPLEMENTATION_SUMMARY.md    # 实施总结
├── contracts/
│   └── api.md                   # API契约
└── checklists/
    └── requirements.md          # 需求检查清单
```

---

## 🚀 常用命令

### 开发

```bash
# 后端开发服务器
cd backend && npm run start:dev

# 前端开发服务器
cd frontend && npm run dev

# 运行测试
cd backend && npm run test
```

### CLI工具

```bash
# 运行扫描
npm run vss:scan

# 查看历史
npm run vss:list

# 导出结果
npm run vss:export <scanId> -- --format csv

# 对比扫描
npm run vss:compare <scan1> <scan2>

# 验证安装
npm run verify:vss
```

### 数据库

```bash
# 打开Prisma Studio
npx prisma studio

# 同步Schema
npx prisma db push

# 生成Client
npx prisma generate
```

---

## 🎯 使用场景

### 场景1: 日常选股

**目标**: 每日扫描全市场，找出早期启动信号

```bash
npm run vss:scan -- --export markdown
```

导出结果保存到文件，用于日报或分享。

### 场景2: 特定日期分析

**目标**: 分析某个特定日期的市场状况

```bash
npm run vss:scan -- --mode manual --date 2026-03-02
```

### 场景3: 持续股票追踪

**目标**: 识别连续多天都符合条件的强势股

```bash
npm run vss:compare <today-scan-id> <yesterday-scan-id>
```

### 场景4: Web可视化分析

**目标**: 深入分析单只股票的详细数据

1. 打开Web界面
2. 查看扫描结果列表
3. 点击股票查看详情Modal
4. 查看成交量模式、买量支撑、均线趋势

---

## ⚠️ 注意事项

1. **数据要求**
   - 股票至少需要25天的日K线数据
   - 计算均线需要150天历史数据

2. **性能考虑**
   - 首次扫描需要8-10秒
   - 并发数默认10，可根据机器配置调整

3. **使用建议**
   - 结合基本面分析使用
   - 技术指标仅供参考
   - 投资有风险，入市需谨慎

---

## 🔗 相关功能

- **VCP选股器** - 基于VCP形态的股票扫描器
- **K线图表** - 股票K线和技术指标可视化
- **自选股管理** - 管理自选股列表

---

## 📞 帮助与支持

**文档**: 参考 `quickstart.md` 和 `cli-usage.md`  
**API**: 参考 `contracts/api.md`  
**问题**: 查看 `quickstart.md` 中的"常见问题"章节

---

**Feature Version**: 1.0.0  
**Last Updated**: 2026-03-18  
**Status**: ✅ Production Ready

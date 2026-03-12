# Research & Design Decisions: 单股票VCP分析查询

**Feature**: 004-stock-vcp-analysis  
**Date**: 2026-03-11  
**Status**: Phase 0 Complete

## 1. K线图页面集成方案

### Decision: 在工具栏添加"生成VCP分析"按钮

**Rationale**:
- K线图页面已有 `ChartToolbar` 组件，用于展示时间范围选择器、周期切换等工具
- 在工具栏添加按钮符合用户习惯，与其他图表操作保持一致
- 按钮状态（生成中/已完成/失败）可以通过图标和文本清晰传达

**Implementation Approach**:
```typescript
// 在 ChartToolbar 组件中添加 VcpGenerateButton
<ChartToolbar>
  <PeriodToggle />
  <TimeRangeSelector />
  <VcpGenerateButton stockCode={stockCode} /> {/* 新增 */}
</ChartToolbar>
```

**Alternatives Considered**:
- ❌ **在页面底部添加浮动按钮**: 可能遮挡图表内容，不够直观
- ❌ **在侧边栏添加**: K线图页面目前无侧边栏，增加新布局会破坏现有设计

---

## 2. VCP分析报告页面路由设计

### Decision: 使用独立路由 `/vcp-analysis/:stockCode`

**Rationale**:
- 符合 React Router 的单页应用模式
- URL 包含股票代码，支持直接访问和分享
- 可以使用浏览器的前进/后退功能
- 便于将来添加书签和收藏功能

**Implementation Approach**:
```typescript
// frontend/src/App.tsx
<Route path="/vcp-analysis/:stockCode" element={<VcpAnalysisPage />} />

// 从 K线图页面跳转
navigate(`/vcp-analysis/${stockCode}`);
// 或在新标签页打开
window.open(`/vcp-analysis/${stockCode}`, '_blank');
```

**Alternatives Considered**:
- ❌ **使用弹窗模态框**: 无法独立访问和分享，不符合"新页面查看"的需求
- ❌ **使用 Query Parameters (`/vcp-analysis?stock=xxx`)**: URL 语义不够清晰

---

## 3. 数据获取策略：缓存优先 vs 实时计算

### Decision: 混合策略 - 优先使用缓存，提供实时重算选项

**Rationale**:
- **缓存优先**符合性能要求（SC-001: 3秒内响应），避免每次都计算300天K线
- **实时重算选项**满足用户对最新数据的需求，作为"刷新"功能提供
- 过期数据（>7天）显示警告但仍可查看，平衡了即时性和可用性

**Implementation Approach**:
```typescript
// API 设计
GET /vcp/:stockCode/analysis
  Query params: 
    - forceRefresh: boolean (default: false) // 强制实时计算
  Response:
    - data: VcpAnalysisResult
    - cached: boolean // 是否来自缓存
    - scanDate: string // 扫描日期
    - isExpired: boolean // 是否过期 (>7天)
```

**Cache Strategy**:
1. 首次请求：检查 `VcpScanResult` 表是否有该股票数据
   - 有数据 → 返回缓存 + 标注 `cached: true` 和 `isExpired` 状态
   - 无数据 → 实时计算并保存到数据库
2. `forceRefresh=true`：忽略缓存，重新计算并更新数据库

**Alternatives Considered**:
- ❌ **完全缓存策略**: 无法获取最新数据，不符合实时分析需求
- ❌ **完全实时计算**: 性能差，无法满足3秒响应要求

---

## 4. 命令行脚本实现模式

### Decision: 复用现有 `analyze-stock-vcp.ts` 架构，扩展为独立脚本

**Rationale**:
- 项目已有成熟的脚本模式（`backend/src/scripts/analyze-stock-vcp.ts`）
- 使用 NestJS ApplicationContext，可以注入服务依赖
- 输出格式已经符合需求（格式化中文文本 + 表格）

**Implementation Approach**:
```bash
# 脚本命令
cd backend
npm run generate-vcp-analysis 605117

# 或直接运行
ts-node src/scripts/generate-vcp-analysis.ts 605117
```

**Script Structure**:
```typescript
// src/scripts/generate-vcp-analysis.ts
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vcpService = app.get(VcpService);
  const formatter = app.get(VcpFormatterService);
  
  const stockCode = process.argv[2];
  const analysis = await vcpService.generateAnalysis(stockCode);
  
  // 输出格式化的中文报告
  console.log(formatter.formatToText(analysis));
}
```

**Output Format** (基于现有脚本):
```
========================================
📈 VCP 形态分析 - 德业股份 (605117)
========================================

📊 最新扫描结果 (2026-03-11):
  ✓ 趋势模板: ✅ 通过
  ✓ 收缩次数: 3
  ✓ 最后收缩幅度: 12.34%
  ...

────────────────────────────────────────
📉 收缩阶段详情 (3 个):

  [收缩 1]
    期间: 2025-12-01 → 2025-12-15
    高点: 45.67
    ...
```

**Alternatives Considered**:
- ❌ **创建全新的脚本架构**: 浪费现有代码，增加维护成本
- ❌ **使用第三方CLI框架（如Commander.js）**: 对于简单脚本过度设计

---

## 5. 数据格式化服务设计

### Decision: 创建独立的 `VcpFormatterService`，支持多种输出格式

**Rationale**:
- 将格式化逻辑从业务逻辑中分离，符合单一职责原则
- 便于未来扩展支持其他格式（JSON、Markdown、PDF等）
- 可以在命令行脚本和Web API中共享

**Service Interface**:
```typescript
@Injectable()
export class VcpFormatterService {
  // 格式化为文本报告（命令行）
  formatToText(analysis: VcpAnalysisResult, options?: FormatOptions): string;
  
  // 格式化为前端展示数据（Web）
  formatToDisplay(analysis: VcpAnalysisResult): VcpDisplayData;
  
  // 格式化收缩阶段表格
  private formatContractionTable(contractions: ContractionResult[]): string;
  
  // 格式化回调阶段表格
  private formatPullbackTable(pullbacks: PullbackResult[]): string;
  
  // 格式化K线数据表格
  private formatKLineTable(klines: KLineBar[], count: number): string;
}
```

**Format Options**:
```typescript
interface FormatOptions {
  locale: 'zh-CN' | 'en-US'; // 默认 zh-CN
  colorOutput: boolean;       // 是否使用终端颜色（默认 true）
  maxContractions: number;    // 显示的收缩数量（默认全部）
  maxPullbacks: number;       // 显示的回调数量（默认全部）
}
```

**Alternatives Considered**:
- ❌ **在 VcpService 中内联格式化**: 违反单一职责，代码冗长
- ❌ **使用模板引擎（如Handlebars）**: 对于文本输出过度设计

---

## 6. 前端状态管理策略

### Decision: 使用 React Query (或 SWR) 管理服务端状态，Zustand 管理UI状态

**Rationale**:
- **React Query**: 自动处理缓存、重新请求、错误重试，非常适合服务端数据管理
- **Zustand**: 轻量级状态管理，用于UI状态（如生成按钮的loading状态）
- 项目已使用 Zustand (`useChartStore`)，保持技术栈一致性

**Implementation Approach**:
```typescript
// hooks/useVcpAnalysis.ts
export function useVcpAnalysis(stockCode: string, forceRefresh = false) {
  return useQuery({
    queryKey: ['vcp-analysis', stockCode, forceRefresh],
    queryFn: () => vcpService.generateAnalysis(stockCode, forceRefresh),
    staleTime: 7 * 24 * 60 * 60 * 1000, // 7天
  });
}

// store/vcpGenerate.store.ts (Zustand)
interface VcpGenerateState {
  isGenerating: boolean;
  setGenerating: (loading: boolean) => void;
}
```

**Alternatives Considered**:
- ❌ **Redux**: 过于复杂，对于这个功能来说过度设计
- ❌ **纯 useState + useEffect**: 需要手动处理缓存、错误、加载状态，代码冗长

---

## 7. 组件设计模式

### Decision: 采用 Presentation/Container 分离模式

**Rationale**:
- **Presentation 组件**: 纯UI组件，接收props渲染，易于测试和复用
- **Container 组件**: 负责数据获取和状态管理，连接hooks和services
- 符合 React 最佳实践和 Constitution 的 Component-First 原则

**Component Hierarchy**:
```
VcpAnalysisPage (Container)
├── VcpAnalysisHeader (Presentation)
│   ├── StockInfo
│   └── ScanDateBadge
├── VcpSummarySection (Presentation)
│   ├── VcpStatusCard
│   └── TrendTemplateCard
├── ContractionList (Presentation)
│   └── ContractionItem[]
├── PullbackList (Presentation)
│   └── PullbackItem[]
└── KLineDataTable (Presentation)
    └── KLineRow[]
```

**Component Props Design**:
```typescript
// Presentation 组件示例
interface ContractionListProps {
  contractions: ContractionResult[];
  onItemClick?: (index: number) => void;
  highlightIndex?: number;
}

// Container 组件示例
function VcpAnalysisPage() {
  const { stockCode } = useParams();
  const { data, loading, error } = useVcpAnalysis(stockCode);
  
  if (loading) return <Spin />;
  if (error) return <Alert />;
  
  return (
    <div>
      <VcpAnalysisHeader stock={data.stock} scanDate={data.scanDate} />
      <ContractionList contractions={data.contractions} />
      {/* ... */}
    </div>
  );
}
```

**Alternatives Considered**:
- ❌ **单一巨型组件**: 难以测试和复用，违反 Component-First 原则
- ❌ **Atomic Design**: 对于此功能粒度过细，增加不必要的复杂度

---

## 8. API 接口设计

### Decision: RESTful API + 标准 HTTP 状态码

**API Endpoints**:
```
GET /api/vcp/:stockCode/analysis
  Query params:
    - forceRefresh: boolean (optional, default: false)
  Response 200:
    {
      stockCode: string;
      stockName: string;
      scanDate: string;
      cached: boolean;
      isExpired: boolean;
      hasVcp: boolean;
      summary: {
        contractionCount: number;
        lastContractionPct: number;
        volumeDryingUp: boolean;
        rsRating: number;
        // ...
      };
      contractions: ContractionResult[];
      pullbacks: PullbackResult[];
      klines: KLineBar[];
      trendTemplate: {
        pass: boolean;
        checks: { name: string; pass: boolean }[];
      };
    }
  Response 404:
    { error: "Stock not found", stockCode: string }
  Response 400:
    { error: "Insufficient K-line data (< 30 days)", stockCode: string }
```

**Error Handling Strategy**:
- 使用标准 HTTP 状态码（200, 400, 404, 500）
- 错误响应包含明确的错误消息（中文）和相关上下文
- 前端根据状态码和错误消息展示不同的用户提示

**Alternatives Considered**:
- ❌ **GraphQL**: 对于简单的单资源查询过度设计
- ❌ **自定义状态码**: 违反 HTTP 标准，增加理解成本

---

## 9. 中文本地化策略

### Decision: 硬编码中文文本 + 格式化工具函数

**Rationale**:
- 项目只需要中文支持（FR-013），无需国际化框架
- 硬编码简单直接，无运行时开销
- 格式化工具函数确保数值格式一致（FR-014）

**Implementation Approach**:
```typescript
// utils/formatters.ts
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatPrice(value: number): string {
  return value.toLocaleString('zh-CN', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  });
}

export function formatVolume(value: number): string {
  const lots = Math.floor(value / 100);
  return `${lots.toLocaleString('zh-CN')} 手`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('zh-CN');
}

// 使用示例
<div>收缩幅度：{formatPercent(contraction.depthPct)}</div>
<div>高点价格：{formatPrice(contraction.swingHighPrice)}</div>
<div>成交量：{formatVolume(contraction.avgVolume)}</div>
```

**Alternatives Considered**:
- ❌ **使用 i18n 库（如 react-i18next）**: 对于单语言支持过度设计
- ❌ **服务端格式化**: 前端需要灵活控制显示格式，不应依赖后端

---

## 10. 页面设计参考

### Decision: 使用 `~/.claude/skills/frontend-design` 技能设计页面

**Rationale**:
- Constitution 要求所有新页面设计必须使用 frontend-design 技能
- 该技能提供了现代化的设计模式、组件结构和UX最佳实践
- 确保页面设计的一致性和高质量

**Action Required**:
在 Phase 1 设计 `VcpAnalysisPage` 组件时，阅读并遵循 `~/.claude/skills/frontend-design/SKILL.md` 中的指导：
- 页面布局设计
- 颜色和排版规范
- 交互反馈设计
- 响应式设计原则

---

## Summary

所有关键技术决策已完成研究和确定：

| 决策领域 | 选择 | 状态 |
|---------|------|------|
| K线图集成 | 工具栏添加按钮 | ✅ Resolved |
| 页面路由 | `/vcp-analysis/:stockCode` | ✅ Resolved |
| 数据获取 | 缓存优先 + 实时重算选项 | ✅ Resolved |
| 命令行脚本 | 复用现有架构 | ✅ Resolved |
| 格式化服务 | 独立 VcpFormatterService | ✅ Resolved |
| 状态管理 | React Query + Zustand | ✅ Resolved |
| 组件模式 | Presentation/Container | ✅ Resolved |
| API 设计 | RESTful + 标准状态码 | ✅ Resolved |
| 本地化 | 硬编码中文 + 格式化工具 | ✅ Resolved |
| 页面设计 | frontend-design 技能 | ✅ Resolved |

**Next Steps**: 进入 Phase 1 - 设计数据模型、API合约和快速开始指南

# Data Model: VCP K-Line Chart Overlay

**Feature**: 006-vcp-kline-overlay  
**Date**: 2026-03-14  
**Phase**: 1 - Design & Contracts

本文档定义 VCP 叠加层的数据模型、类型定义和状态管理。

---

## 1. 核心数据实体

### 1.1 VcpLineData (收缩/回调线数据)

从现有 `Contraction` 和 `Pullback` 类型派生的可视化数据结构。

```typescript
/**
 * VCP 线条可视化数据（统一格式）
 */
interface VcpLineData {
  /** 唯一标识符 */
  id: string;
  
  /** 线条类型 */
  type: 'contraction' | 'pullback';
  
  /** 索引编号（C1, C2... or P1, P2...） */
  index: number;
  
  /** 起点（高点） */
  startPoint: VcpPoint;
  
  /** 终点（低点） */
  endPoint: VcpPoint;
  
  /** 幅度百分比（正数） */
  depthPercent: number;
  
  /** 持续天数 */
  durationDays: number;
  
  /** 平均成交量 */
  avgVolume: number;
  
  /** 状态（仅 pullback 使用） */
  status?: 'active' | 'completed';
  
  /** Pullback 特有：距离低点天数 */
  daysSinceLow?: number;
  
  /** Pullback 特有：是否在上升趋势 */
  isInUptrend?: boolean;
}

/**
 * 点坐标（日期 + 价格）
 */
interface VcpPoint {
  /** 日期 (ISO string) */
  date: string;
  
  /** 价格 */
  price: number;
}
```

**数据来源**:
- Contraction → VcpLineData (type: 'contraction')
- Pullback → VcpLineData (type: 'pullback')

**转换函数**:
```typescript
function convertToVcpLineData(
  contractions: Contraction[],
  pullbacks: PullbackWithStatus[]
): VcpLineData[] {
  const contractionLines: VcpLineData[] = contractions.map((c, idx) => ({
    id: `C-${c.index}`,
    type: 'contraction',
    index: c.index,
    startPoint: { date: c.swingHighDate, price: c.swingHighPrice },
    endPoint: { date: c.swingLowDate, price: c.swingLowPrice },
    depthPercent: c.depthPct,
    durationDays: c.durationDays,
    avgVolume: c.avgVolume,
  }));

  const pullbackLines: VcpLineData[] = pullbacks.map((p, idx) => ({
    id: `P-${p.index}`,
    type: 'pullback',
    index: p.index,
    startPoint: { date: p.highDate, price: p.highPrice },
    endPoint: { date: p.lowDate, price: p.lowPrice },
    depthPercent: p.pullbackPct,
    durationDays: p.durationDays,
    avgVolume: p.avgVolume,
    status: p.daysSinceLow === 0 ? 'active' : 'completed',
    daysSinceLow: p.daysSinceLow,
    isInUptrend: p.isInUptrend,
  }));

  return [...contractionLines, ...pullbackLines];
}
```

---

### 1.2 VcpLineStyle (线条样式配置)

```typescript
/**
 * VCP 线条视觉样式
 */
interface VcpLineStyle {
  /** 线条颜色 (hex) */
  color: string;
  
  /** 线条宽度 (pixels) */
  lineWidth: number;
  
  /** 虚线样式 [实线长度, 间隙长度] */
  dashArray: [number, number];
  
  /** 透明度 (0-1) */
  opacity: number;
}

/**
 * 预定义样式常量
 */
const VCP_LINE_STYLES: Record<string, VcpLineStyle> = {
  contraction: {
    color: '#2563eb',     // 深青蓝色
    lineWidth: 2,
    dashArray: [8, 4],    // 8px 实线, 4px 间隙
    opacity: 0.8,
  },
  pullbackCompleted: {
    color: '#f59e0b',     // 琥珀橙色
    lineWidth: 2,
    dashArray: [5, 5],    // 5px 实线, 5px 间隙
    opacity: 0.7,
  },
  pullbackActive: {
    color: '#fb923c',     // 亮橙色
    lineWidth: 2,
    dashArray: [5, 5],
    opacity: 0.9,
  },
};
```

---

### 1.3 VcpMarkerData (标记点数据)

```typescript
/**
 * VCP 标记点（swing high/low）
 */
interface VcpMarkerData {
  /** 唯一标识符 */
  id: string;
  
  /** 标记类型 */
  type: 'swing-high' | 'swing-low';
  
  /** 关联的线条 ID */
  lineId: string;
  
  /** 位置 */
  point: VcpPoint;
  
  /** 标记颜色（继承自线条） */
  color: string;
  
  /** 半径 (pixels) */
  radius: number;
}

/**
 * 从 VcpLineData 生成标记点
 */
function generateMarkers(lines: VcpLineData[]): VcpMarkerData[] {
  const markers: VcpMarkerData[] = [];

  lines.forEach(line => {
    const color = getLineStyle(line).color;

    markers.push({
      id: `${line.id}-high`,
      type: 'swing-high',
      lineId: line.id,
      point: line.startPoint,
      color,
      radius: 4,
    });

    markers.push({
      id: `${line.id}-low`,
      type: 'swing-low',
      lineId: line.id,
      point: line.endPoint,
      color,
      radius: 4,
    });
  });

  return markers;
}
```

---

### 1.4 VcpLabelData (标签数据)

```typescript
/**
 * VCP 线条标签（显示在中点）
 */
interface VcpLabelData {
  /** 唯一标识符 */
  id: string;
  
  /** 关联的线条 ID */
  lineId: string;
  
  /** 显示文本（如 "C1: 7.5%"） */
  text: string;
  
  /** 标签位置（线段中点） */
  position: VcpPoint;
  
  /** 标签颜色（继承自线条） */
  color: string;
  
  /** 字体大小 */
  fontSize: number;
  
  /** 背景半透明 */
  backgroundColor: string;
}

/**
 * 从 VcpLineData 生成标签
 */
function generateLabels(lines: VcpLineData[]): VcpLabelData[] {
  return lines.map(line => {
    const midPoint = calculateMidpoint(line.startPoint, line.endPoint);
    const prefix = line.type === 'contraction' ? 'C' : 'P';
    const text = `${prefix}${line.index}: ${line.depthPercent.toFixed(1)}%`;

    return {
      id: `${line.id}-label`,
      lineId: line.id,
      text,
      position: midPoint,
      color: getLineStyle(line).color,
      fontSize: 11,
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
    };
  });
}

function calculateMidpoint(start: VcpPoint, end: VcpPoint): VcpPoint {
  // 简化：使用价格中点（实际需要图表坐标系统计算像素中点）
  return {
    date: start.date, // 实际应计算时间中点
    price: (start.price + end.price) / 2,
  };
}
```

---

### 1.5 VcpTooltipData (Tooltip 数据)

```typescript
/**
 * VCP Tooltip 数据
 */
interface VcpTooltipData {
  /** 关联的线条 ID */
  lineId: string;
  
  /** 线条类型 */
  lineType: 'contraction' | 'pullback';
  
  /** 显示内容 */
  content: VcpTooltipContent;
  
  /** Tooltip 位置 */
  position: { x: number; y: number };
  
  /** 是否可见 */
  visible: boolean;
}

/**
 * Tooltip 内容结构
 */
interface VcpTooltipContent {
  title: string;                  // "Contraction #1" or "Pullback #2"
  depth: string;                  // "Depth: 7.43%"
  duration: string;               // "Duration: 25 days"
  avgVolume: string;              // "Avg Volume: 12.5M"
  dateRange: string;              // "2024-01-15 → 2024-02-10"
  priceRange: string;             // "¥45.20 → ¥41.85"
  additionalInfo?: string[];      // Pullback 特有信息
}

/**
 * 格式化 Tooltip 内容
 */
function formatTooltipContent(line: VcpLineData): VcpTooltipContent {
  const typeLabel = line.type === 'contraction' ? 'Contraction' : 'Pullback';
  
  const content: VcpTooltipContent = {
    title: `${typeLabel} #${line.index}`,
    depth: `Depth: ${line.depthPercent.toFixed(2)}%`,
    duration: `Duration: ${line.durationDays} days`,
    avgVolume: `Avg Volume: ${(line.avgVolume / 10000).toFixed(1)}K`,
    dateRange: `${line.startPoint.date} → ${line.endPoint.date}`,
    priceRange: `¥${line.startPoint.price.toFixed(2)} → ¥${line.endPoint.price.toFixed(2)}`,
  };

  if (line.type === 'pullback') {
    content.additionalInfo = [
      `Days Since Low: ${line.daysSinceLow}`,
      `In Uptrend: ${line.isInUptrend ? 'Yes' : 'No'}`,
      `Status: ${line.status === 'active' ? 'Active' : 'Completed'}`,
    ];
  }

  return content;
}
```

---

## 2. 状态管理

### 2.1 Chart Store 扩展 (Zustand)

```typescript
/**
 * 扩展现有 chart.store.ts
 */
interface ChartStore {
  // ... 现有状态 (period, timeRange, showMA, etc.)
  
  // 新增: VCP 叠加层可见性
  vcpOverlayVisible: boolean;
  
  // 新增: 当前悬停的线条 ID
  hoveredVcpLineId: string | null;
  
  // Actions
  toggleVcpOverlay: () => void;
  setHoveredVcpLine: (lineId: string | null) => void;
}

// Store 实现
const useChartStore = create<ChartStore>((set) => ({
  // ... 现有状态
  
  vcpOverlayVisible: true, // 默认显示
  hoveredVcpLineId: null,
  
  toggleVcpOverlay: () =>
    set((state) => ({ vcpOverlayVisible: !state.vcpOverlayVisible })),
  
  setHoveredVcpLine: (lineId) =>
    set({ hoveredVcpLineId: lineId }),
}));
```

### 2.2 Component State (Local)

```typescript
/**
 * VcpOverlayLayer 组件内部状态
 */
interface VcpOverlayState {
  /** 可见范围内的线条 */
  visibleLines: VcpLineData[];
  
  /** 可见范围内的标记 */
  visibleMarkers: VcpMarkerData[];
  
  /** 可见范围内的标签 */
  visibleLabels: VcpLabelData[];
  
  /** Tooltip 状态 */
  tooltip: VcpTooltipData | null;
  
  /** 鼠标位置 */
  mousePosition: { x: number; y: number } | null;
}
```

---

## 3. 数据流

```mermaid
graph TD
    A[useVcpDetail Hook] -->|VcpAnalysis| B[convertToVcpLineData]
    B -->|VcpLineData[]| C[Visible Range Filter]
    C -->|Filtered Lines| D[generateMarkers]
    C -->|Filtered Lines| E[generateLabels]
    D -->|VcpMarkerData[]| F[VcpOverlayLayer]
    E -->|VcpLabelData[]| F
    F -->|Render| G[Canvas Primitives]
    
    H[Mouse Events] -->|Hover| I[Detect Line Hit]
    I -->|lineId| J[formatTooltipContent]
    J -->|TooltipData| K[VcpTooltip Component]
```

**详细步骤**:
1. `useVcpDetail` 获取原始 VCP 数据（contractions, pullbacks）
2. `convertToVcpLineData` 转换为统一的 `VcpLineData[]`
3. Visible Range Filter 过滤仅可见的线条
4. `generateMarkers` 和 `generateLabels` 生成衍生数据
5. `VcpOverlayLayer` 通过 Series Primitives 渲染到 Canvas
6. Mouse Events 触发 Hit Detection，显示 Tooltip

---

## 4. 数据验证规则

### 4.1 必填字段验证

```typescript
function validateVcpLineData(line: VcpLineData): boolean {
  return !!(
    line.id &&
    line.type &&
    line.index >= 0 &&
    line.startPoint.date &&
    line.startPoint.price > 0 &&
    line.endPoint.date &&
    line.endPoint.price > 0 &&
    line.depthPercent >= 0 &&
    line.durationDays > 0 &&
    line.avgVolume >= 0
  );
}
```

### 4.2 数据一致性检查

```typescript
function validateDataConsistency(lines: VcpLineData[]): string[] {
  const errors: string[] = [];

  lines.forEach(line => {
    // 检查：起点日期应早于终点日期
    if (new Date(line.startPoint.date) >= new Date(line.endPoint.date)) {
      errors.push(`${line.id}: startPoint date must be before endPoint date`);
    }

    // 检查：起点价格应高于终点价格（收缩/回调都是下降的）
    if (line.startPoint.price <= line.endPoint.price) {
      errors.push(`${line.id}: startPoint price must be higher than endPoint price`);
    }

    // 检查：Pullback 必须有 status
    if (line.type === 'pullback' && !line.status) {
      errors.push(`${line.id}: pullback must have status`);
    }
  });

  return errors;
}
```

---

## 5. 数据模型关系图

```
VcpAnalysis (from API)
  ├── contractions: Contraction[]
  │     └─> VcpLineData[] (type: 'contraction')
  │           ├─> VcpMarkerData[] (swing-high, swing-low)
  │           └─> VcpLabelData[] (midpoint label)
  └── pullbacks: PullbackWithStatus[]
        └─> VcpLineData[] (type: 'pullback')
              ├─> VcpMarkerData[] (swing-high, swing-low)
              └─> VcpLabelData[] (midpoint label)

ChartStore (Zustand)
  ├── vcpOverlayVisible: boolean
  └── hoveredVcpLineId: string | null

VcpOverlayLayer Component State
  ├── visibleLines: VcpLineData[]
  ├── visibleMarkers: VcpMarkerData[]
  ├── visibleLabels: VcpLabelData[]
  └── tooltip: VcpTooltipData | null
```

---

## 6. Type 文件组织

新增类型定义将添加到现有 `frontend/src/types/vcp.ts`:

```typescript
// frontend/src/types/vcp.ts

// ... 现有类型 (VcpAnalysis, Contraction, Pullback, etc.)

// 新增：VCP 叠加层类型
export interface VcpLineData { ... }
export interface VcpPoint { ... }
export interface VcpLineStyle { ... }
export interface VcpMarkerData { ... }
export interface VcpLabelData { ... }
export interface VcpTooltipData { ... }
export interface VcpTooltipContent { ... }

export const VCP_LINE_STYLES: Record<string, VcpLineStyle> = { ... };
```

---

## Phase 1 数据模型完成标志

✅ 所有核心实体已定义  
✅ 类型定义完整且类型安全  
✅ 数据转换函数已设计  
✅ 状态管理方案已确定  
✅ 数据流清晰  

**下一步**: 创建 [contracts/vcp-overlay.contract.md](./contracts/vcp-overlay.contract.md)

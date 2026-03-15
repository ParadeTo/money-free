# Research: VCP K-Line Chart Overlay

**Feature**: 006-vcp-kline-overlay  
**Date**: 2026-03-14  
**Research Phase**: Phase 0

本文档记录所有技术调研结果和设计决策。

---

## 1. Lightweight-Charts 自定义叠加层 API

### 研究问题
lightweight-charts v4.2 提供哪些 API 来实现自定义图形叠加层？哪种最适合 VCP 线条和标记的绘制？

### 调研结果

Lightweight-Charts 提供两种主要扩展机制：

1. **Series Primitives** (推荐)
   - 附加到现有系列（如 CandlestickSeries）
   - 实现 `ISeriesPrimitive` 接口
   - 提供三种视图类型：
     - `IPrimitivePaneView`: 在主图区域绘制
     - `ISeriesPrimitiveAxisView`: 在价格轴/时间轴绘制标签
   - 支持 `zOrder` 控制图层顺序
   - 使用 `CanvasRenderingContext2D` 绘制

2. **Custom Series**
   - 创建全新的系列类型
   - 实现 `ICustomSeriesPaneView` 接口
   - 必须有统一宽度的数据点
   - 更适合完全自定义的系列（如热力图）

### 决策

**选择 Series Primitives API**

**理由**:
1. VCP 叠加层是对现有 CandlestickSeries 的补充，不是独立系列
2. 不需要独立的数据管理（VCP 数据已存在）
3. 可以灵活控制 z-order（确保线条在 K 线后、标记在最前）
4. 代码侵入性小，易于集成到现有 KLineChart 组件

**替代方案考虑过但拒绝**:
- Custom Series: 过于复杂，需要维护独立数据结构，不适合纯装饰性叠加层
- Price Lines (`createPriceLine`): 只支持水平线，无法绘制倾斜的收缩/回调线

---

## 2. 虚线绘制最佳实践

### 研究问题
使用 Canvas `setLineDash()` 绘制虚线时的性能考虑和最佳实践？

### 调研结果

**性能问题**:
- `setLineDash()` 在绘制大量线条时可能导致性能下降
- 自定义虚线实现（循环 lineTo）会造成内存泄漏
- 慢速绘制时 `setLineDash()` 可能失效（快速移动正常，慢速移动变实线）

**最佳实践**:
1. 使用 `Path2D` 对象结合 `setLineDash()` 提升性能
2. 批量绘制：一次 `stroke()` 调用绘制多条路径
3. 避免在循环中重复设置 `lineDash` 数组（提前缓存）
4. 对于 50万+ 线段，WebGL 比 Canvas2D 性能好 20 倍

**代码模式**:
```typescript
const path = new Path2D();
ctx.setLineDash([5, 3]); // 5px 实线, 3px 间隙
ctx.strokeStyle = '#2563eb';
ctx.lineWidth = 2;

path.moveTo(x1, y1);
path.lineTo(x2, y2);
ctx.stroke(path);
```

### 决策

**使用 `Path2D` + `setLineDash()` 标准方案**

**理由**:
1. VCP 叠加层最多 10 条收缩线 + 10 条回调线 = 20 条线段，远低于性能瓶颈（50万线段）
2. Canvas2D 标准 API，无需额外依赖
3. 简单直接，易于维护

**性能优化策略**:
- 仅绘制可见范围内的线条（visible logical range filtering）
- 预计算虚线样式配置（避免每帧重新设置）
- 使用单次 `stroke()` 调用绘制所有同类线条（批量渲染）

**替代方案考虑过但拒绝**:
- WebGL: 过度工程，增加复杂度，20 条线段完全不需要
- SVG overlay: lightweight-charts 基于 Canvas，混用 SVG 会增加同步复杂度

---

## 3. Tooltip 边界检测算法

### 研究问题
如何确保 tooltip 在鼠标悬停时不被图表边缘裁剪，并智能调整位置？

### 调研结果

**核心概念**:
- 检测 tooltip 的边界框与 viewport/容器的碰撞
- 使用数学计算判断是否溢出：`tooltipRight > viewportRight` → 向左调整

**常见策略**:
1. **Flip**: tooltip 会跳到相反侧（如右侧溢出→显示在左侧）
2. **Fit**: tooltip 向内推移，确保完全可见
3. **FlipFit**: 先 flip，再 fit

**检测算法**:
```typescript
function detectOverflow(tooltip: DOMRect, viewport: DOMRect) {
  return {
    top: tooltip.top - viewport.top,
    right: viewport.right - tooltip.right,
    bottom: viewport.bottom - tooltip.bottom,
    left: tooltip.left - viewport.left,
  };
  // 负数 = 已溢出该侧
}
```

**第三方库**:
- Floating UI: 提供 `detectOverflow()` 和自动定位
- Popper.js/Tippy.js: 内置边界检测

### 决策

**实现简化版边界检测算法**

**理由**:
1. VCP tooltip 是简单的矩形提示框，不需要复杂的定位库
2. 图表容器边界明确（mainChartRef.current.getBoundingClientRect()）
3. 只需处理 4 个方向的溢出（上下左右）

**实现方案**:
```typescript
function adjustTooltipPosition(
  mouseX: number,
  mouseY: number,
  tooltipWidth: number,
  tooltipHeight: number,
  chartBounds: DOMRect
): { x: number; y: number } {
  let x = mouseX + 10; // 默认偏移 10px
  let y = mouseY + 10;

  // 右侧溢出 → 移到鼠标左侧
  if (x + tooltipWidth > chartBounds.right) {
    x = mouseX - tooltipWidth - 10;
  }

  // 底部溢出 → 移到鼠标上方
  if (y + tooltipHeight > chartBounds.bottom) {
    y = mouseY - tooltipHeight - 10;
  }

  // 左侧溢出 → 贴左边界
  if (x < chartBounds.left) {
    x = chartBounds.left + 5;
  }

  // 顶部溢出 → 贴上边界
  if (y < chartBounds.top) {
    y = chartBounds.top + 5;
  }

  return { x, y };
}
```

**替代方案考虑过但拒绝**:
- Floating UI: 增加 bundle size (30KB+)，过度依赖，我们的需求简单
- CSS `position: sticky`: 无法跟随鼠标动态定位

---

## 4. 坐标映射精度优化

### 研究问题
如何确保 VCP 线条端点精确对齐 K 线图的日期和价格坐标（误差 ≤ 1 pixel）？

### 调研结果

**lightweight-charts 坐标系统**:
- Time Coordinate: 时间轴的逻辑坐标（非像素）
- Price Coordinate: 价格轴的逻辑坐标
- Pixel Coordinate: 屏幕像素坐标

**坐标转换 API**:
```typescript
// TimeScale API
const timeCoordinate = chart.timeScale().timeToCoordinate(time);

// PriceScale API (通过 series)
const priceCoordinate = series.priceToCoordinate(price);
```

**精度影响因素**:
1. Device Pixel Ratio (DPR): 高分屏 (Retina) DPR = 2, 需要 2x 渲染精度
2. Chart Zoom/Pan: 缩放会影响坐标映射
3. Float precision: JavaScript 浮点数精度限制

### 决策

**使用 lightweight-charts 内置坐标转换 API + DPR 校正**

**理由**:
1. 内置 API 已处理缩放、滚动等变换
2. 避免手动实现复杂的坐标系统
3. 与图表渲染逻辑保持一致

**实现方案**:
```typescript
interface VcpLineCoordinates {
  x1: number; // Time coordinate (pixels)
  y1: number; // Price coordinate (pixels)
  x2: number;
  y2: number;
}

function mapVcpToCoordinates(
  contraction: Contraction,
  chart: IChartApi,
  series: ISeriesApi<'Candlestick'>
): VcpLineCoordinates | null {
  const timeScale = chart.timeScale();
  
  // 转换时间
  const x1 = timeScale.timeToCoordinate(contraction.swingHighDate);
  const x2 = timeScale.timeToCoordinate(contraction.swingLowDate);
  
  // 转换价格
  const y1 = series.priceToCoordinate(contraction.swingHighPrice);
  const y2 = series.priceToCoordinate(contraction.swingLowPrice);
  
  // 检查是否在可见范围内
  if (x1 === null || x2 === null || y1 === null || y2 === null) {
    return null; // 不在可见范围，不绘制
  }
  
  return { x1, y1, x2, y2 };
}
```

**精度保证**:
- 使用 `Math.round()` 对齐到整数像素（避免模糊）
- Canvas 使用 `ctx.imageSmoothingEnabled = false` 保持锐利边缘

**替代方案考虑过但拒绝**:
- 手动计算坐标: 容易出错，不考虑缩放/滚动，维护成本高

---

## 5. 性能优化策略

### 研究问题
如何确保叠加层渲染在 500ms 内完成，且交互保持 60 FPS？

### 调研结果

**性能瓶颈**:
1. 重复渲染: 每次鼠标移动触发重绘
2. 坐标计算: 大量数据点的坐标转换
3. Canvas 绘制: 多次 `stroke()` 调用

**优化技术**:
- Visible Range Filtering: 只处理可见范围内的数据
- Memoization: 缓存计算结果
- Throttling: 限制事件触发频率
- RequestAnimationFrame: 批量渲染

### 决策

**采用 Visible Range Filtering + 缓存策略**

**实现方案**:

```typescript
// 1. Visible Range Filtering
function getVisibleVcpData(
  contractions: Contraction[],
  pullbacks: Pullback[],
  visibleRange: LogicalRange
): { visibleContractions: Contraction[]; visiblePullbacks: Pullback[] } {
  // 过滤：只保留与可见范围有交集的线条
  const visibleContractions = contractions.filter(c => 
    isIntersecting(c.swingHighDate, c.swingLowDate, visibleRange)
  );
  
  const visiblePullbacks = pullbacks.filter(p =>
    isIntersecting(p.highDate, p.lowDate, visibleRange)
  );
  
  return { visibleContractions, visiblePullbacks };
}

// 2. 缓存坐标映射结果
const coordinatesCache = useMemo(() => {
  return visibleContractions.map(c => mapVcpToCoordinates(c, chart, series));
}, [visibleContractions, chart, series]);
```

**交互性能**:
- Hover 事件不触发重新计算坐标（仅更新 tooltip 内容）
- Toggle visibility 使用 CSS `opacity` 过渡（无需重绘）

**预期性能**:
- 初始渲染: 50-100ms (10 contractions + 10 pullbacks)
- Hover 响应: < 16ms (60 FPS)
- Zoom/Pan: 自动受益于 visible range filtering

**替代方案考虑过但拒绝**:
- Offscreen Canvas: 复杂度高，对 20 条线段收益不明显
- WebWorker: 无法访问 Canvas context，不适用

---

## 技术栈总结

| 技术领域 | 选择 | 版本/标准 |
|---------|------|-----------|
| 图表库 | lightweight-charts | v4.2.3 |
| 叠加层 API | Series Primitives | ISeriesPrimitive 接口 |
| 绘图 API | Canvas 2D | CanvasRenderingContext2D + Path2D |
| 虚线样式 | setLineDash() | 标准 Canvas API |
| 坐标转换 | 内置 API | timeToCoordinate, priceToCoordinate |
| Tooltip 定位 | 自定义算法 | 边界检测 + Flip/Fit 策略 |
| 性能优化 | Visible Range Filtering | LogicalRange 过滤 |
| 状态管理 | Zustand | v4.4 (现有) |

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| lightweight-charts v4.2 已停止维护 | 未来升级困难 | 隔离叠加层代码，使用适配器模式便于迁移 v5+ |
| Canvas 绘制在低端设备性能差 | 用户体验下降 | Visible range filtering + 提供 toggle 关闭选项 |
| 坐标映射误差累积 | 线条对齐不准确 | 使用内置 API + 像素对齐 (`Math.round`) |
| Tooltip 在边缘抖动 | 用户体验不佳 | 添加 debounce + 最小移动阈值 |

---

## Phase 0 完成标志

✅ 所有"NEEDS CLARIFICATION"已解决  
✅ 技术方案已选定并有明确理由  
✅ 风险已识别并有缓解计划  
✅ 可以进入 Phase 1: Design & Contracts

**下一步**: 创建 [data-model.md](./data-model.md) 和 [contracts/](./contracts/)

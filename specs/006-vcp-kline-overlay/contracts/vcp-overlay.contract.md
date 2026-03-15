# Component Contract: VCP Overlay Layer

**Feature**: 006-vcp-kline-overlay  
**Date**: 2026-03-14  
**Phase**: 1 - Design & Contracts

本文档定义 VCP 叠加层相关组件的 API 契约，确保组件接口清晰、可测试、可复用。

---

## 1. VcpOverlayLayer Component

**职责**: 在 lightweight-charts 上绘制 VCP 线条、标记和标签

### 1.1 Props Contract

```typescript
interface VcpOverlayLayerProps {
  /**
   * VCP 分析数据（必需）
   * 包含 contractions 和 pullbacks 原始数据
   */
  vcpData: VcpAnalysis | null;

  /**
   * 图表实例（必需）
   * 用于获取坐标转换 API
   */
  chart: IChartApi;

  /**
   * Candlestick 系列（必需）
   * 用于价格坐标转换和附加 primitives
   */
  series: ISeriesApi<'Candlestick'>;

  /**
   * 叠加层可见性（可选，默认 true）
   */
  visible?: boolean;

  /**
   * 悬停回调（可选）
   * 当鼠标悬停在线条上时触发
   */
  onLineHover?: (lineId: string | null) => void;

  /**
   * 点击回调（可选）
   * 当用户点击线条时触发
   */
  onLineClick?: (lineId: string) => void;
}
```

### 1.2 Behavior Contract

**渲染行为**:
- 当 `vcpData` 为 `null` 时，不渲染任何内容
- 当 `visible` 为 `false` 时，隐藏所有叠加层元素（使用 CSS opacity transition）
- 仅渲染可见范围内的线条、标记和标签（performance optimization）

**交互行为**:
- 鼠标悬停在线条 ±5px 范围内时，触发 `onLineHover` 回调
- 悬停时线条高亮（lineWidth +1, opacity +0.1）
- 点击线条时触发 `onLineClick` 回调

**更新行为**:
- `vcpData` 变化时，重新计算并渲染
- `chart` zoom/pan 时，自动更新可见线条（订阅 timeScale 变化）
- `series` 数据更新时，重新计算坐标

### 1.3 Usage Example

```typescript
function KLineChart({ stockCode }: { stockCode: string }) {
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const { data: vcpData } = useVcpDetail(stockCode);
  const { vcpOverlayVisible } = useChartStore();

  return (
    <div>
      {/* Existing chart setup */}
      
      {chartRef.current && seriesRef.current && (
        <VcpOverlayLayer
          vcpData={vcpData}
          chart={chartRef.current}
          series={seriesRef.current}
          visible={vcpOverlayVisible}
          onLineHover={(lineId) => console.log('Hovered:', lineId)}
        />
      )}
    </div>
  );
}
```

---

## 2. VcpTooltip Component

**职责**: 显示 VCP 线条的详细信息 tooltip

### 2.1 Props Contract

```typescript
interface VcpTooltipProps {
  /**
   * Tooltip 数据（必需）
   */
  data: VcpTooltipData | null;

  /**
   * 图表容器边界（必需）
   * 用于边界检测和防遮挡
   */
  chartBounds: DOMRect;

  /**
   * 鼠标位置（必需）
   */
  mousePosition: { x: number; y: number };

  /**
   * 自定义样式（可选）
   */
  className?: string;
}
```

### 2.2 Behavior Contract

**显示逻辑**:
- `data` 为 `null` 时，不显示（`display: none`）
- `data.visible` 为 `false` 时，不显示
- 默认位置：鼠标右下方 10px 偏移
- 边界检测：右侧/底部溢出时自动调整到左侧/上方

**动画**:
- 出现: `opacity 0 → 1` (150ms ease-out)
- 消失: `opacity 1 → 0` (100ms ease-in)
- 位置变化: 无动画（instant snap，避免抖动）

**样式**:
- 背景: 半透明白色 `rgba(255, 255, 255, 0.95)`
- 边框: 1px solid, 颜色继承自线条
- 阴影: `0 2px 8px rgba(0, 0, 0, 0.15)`
- 字体: 11px, line-height 1.5
- Padding: 8px 12px
- Border-radius: 4px

### 2.3 Usage Example

```typescript
function VcpOverlayLayer({ vcpData, chart }: VcpOverlayLayerProps) {
  const [tooltip, setTooltip] = useState<VcpTooltipData | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const chartBounds = chart.chartElement().getBoundingClientRect();

  const handleMouseMove = (event: MouseEvent) => {
    setMousePos({ x: event.clientX, y: event.clientY });
    
    const hoveredLine = detectLineHit(event, visibleLines);
    if (hoveredLine) {
      setTooltip({
        lineId: hoveredLine.id,
        lineType: hoveredLine.type,
        content: formatTooltipContent(hoveredLine),
        position: { x: event.clientX, y: event.clientY },
        visible: true,
      });
    } else {
      setTooltip(null);
    }
  };

  return (
    <>
      {/* Canvas rendering */}
      
      <VcpTooltip
        data={tooltip}
        chartBounds={chartBounds}
        mousePosition={mousePos}
      />
    </>
  );
}
```

---

## 3. VcpOverlayControl Component

**职责**: 提供 Toggle 按钮控制 VCP 叠加层的显示/隐藏

### 3.1 Props Contract

```typescript
interface VcpOverlayControlProps {
  /**
   * 当前可见性状态（必需）
   */
  visible: boolean;

  /**
   * 切换回调（必需）
   */
  onToggle: () => void;

  /**
   * 按钮位置（可选，默认 'top-right'）
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

  /**
   * 自定义样式（可选）
   */
  className?: string;

  /**
   * 禁用状态（可选）
   * 当无 VCP 数据时禁用按钮
   */
  disabled?: boolean;
}
```

### 3.2 Behavior Contract

**交互**:
- 点击按钮触发 `onToggle()`
- 禁用时不响应点击，显示 disabled 样式
- Hover 时显示 tooltip: "Show/Hide VCP Overlay"

**样式**:
- 按钮样式: Ant Design Button (text type)
- Icon: EyeOutlined (visible) / EyeInvisibleOutlined (hidden)
- 颜色: 
  - visible: primary color (#1890ff)
  - hidden: secondary color (#8c8c8c)
  - disabled: disabled color (#d9d9d9)

**Accessibility**:
- `aria-label`: "Toggle VCP Overlay"
- `aria-pressed`: visible 状态
- Keyboard: Space/Enter 触发 toggle

### 3.3 Usage Example

```typescript
function ChartToolbar() {
  const { vcpOverlayVisible, toggleVcpOverlay } = useChartStore();
  const { data: vcpData } = useVcpDetail(stockCode);

  return (
    <div className={styles.toolbar}>
      {/* Other toolbar buttons */}
      
      <VcpOverlayControl
        visible={vcpOverlayVisible}
        onToggle={toggleVcpOverlay}
        position="top-right"
        disabled={!vcpData}
      />
    </div>
  );
}
```

---

## 4. useVcpOverlay Hook

**职责**: 封装 VCP 叠加层的核心逻辑（数据转换、坐标映射、可见性过滤）

### 4.1 Hook Contract

```typescript
interface UseVcpOverlayParams {
  /**
   * VCP 分析数据
   */
  vcpData: VcpAnalysis | null;

  /**
   * 图表实例
   */
  chart: IChartApi | null;

  /**
   * Candlestick 系列
   */
  series: ISeriesApi<'Candlestick'> | null;

  /**
   * 可见性
   */
  visible: boolean;
}

interface UseVcpOverlayReturn {
  /**
   * 可见范围内的线条数据
   */
  visibleLines: VcpLineData[];

  /**
   * 可见范围内的标记数据
   */
  visibleMarkers: VcpMarkerData[];

  /**
   * 可见范围内的标签数据
   */
  visibleLabels: VcpLabelData[];

  /**
   * 是否正在加载/计算
   */
  isLoading: boolean;

  /**
   * 错误信息
   */
  error: string | null;

  /**
   * 重新计算（手动触发）
   */
  recalculate: () => void;
}

function useVcpOverlay(params: UseVcpOverlayParams): UseVcpOverlayReturn;
```

### 4.2 Behavior Contract

**数据转换**:
- 输入 `VcpAnalysis` → 输出 `VcpLineData[]`
- 使用 `useMemo` 缓存转换结果
- 依赖: `[vcpData]`

**可见性过滤**:
- 订阅 `chart.timeScale().subscribeVisibleLogicalRangeChange()`
- 过滤仅在可见范围内的线条
- 使用 `useState` + `useEffect` 管理可见数据

**坐标映射**:
- 将 `VcpPoint` (date, price) → pixel coordinates
- 使用 `timeToCoordinate` 和 `priceToCoordinate`
- 处理 null 返回值（超出范围）

**错误处理**:
- 捕获坐标转换错误
- 捕获数据验证错误
- 返回 `error` 字段

### 4.3 Usage Example

```typescript
function VcpOverlayLayer({
  vcpData,
  chart,
  series,
  visible,
}: VcpOverlayLayerProps) {
  const {
    visibleLines,
    visibleMarkers,
    visibleLabels,
    isLoading,
    error,
  } = useVcpOverlay({ vcpData, chart, series, visible });

  if (error) {
    console.error('[VcpOverlay]', error);
    return null;
  }

  if (isLoading) {
    return <div>Loading overlay...</div>;
  }

  // Render primitives
  return (
    <CanvasOverlay
      lines={visibleLines}
      markers={visibleMarkers}
      labels={visibleLabels}
    />
  );
}
```

---

## 5. Testing Contracts

### 5.1 VcpOverlayLayer Tests

```typescript
describe('VcpOverlayLayer', () => {
  it('should not render when vcpData is null', () => {
    const { container } = render(
      <VcpOverlayLayer
        vcpData={null}
        chart={mockChart}
        series={mockSeries}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render lines for contractions and pullbacks', () => {
    const { container } = render(
      <VcpOverlayLayer
        vcpData={mockVcpData}
        chart={mockChart}
        series={mockSeries}
      />
    );
    // Assert: Canvas primitives attached
    expect(mockSeries.attachPrimitive).toHaveBeenCalled();
  });

  it('should hide overlay when visible=false', () => {
    const { rerender } = render(
      <VcpOverlayLayer
        vcpData={mockVcpData}
        chart={mockChart}
        series={mockSeries}
        visible={true}
      />
    );
    
    rerender(
      <VcpOverlayLayer
        vcpData={mockVcpData}
        chart={mockChart}
        series={mockSeries}
        visible={false}
      />
    );
    
    // Assert: Opacity = 0 or display = none
  });

  it('should trigger onLineHover when mouse enters line', () => {
    const onLineHover = jest.fn();
    render(
      <VcpOverlayLayer
        vcpData={mockVcpData}
        chart={mockChart}
        series={mockSeries}
        onLineHover={onLineHover}
      />
    );
    
    // Simulate mouse event
    fireEvent.mouseMove(canvas, { clientX: 100, clientY: 200 });
    
    expect(onLineHover).toHaveBeenCalledWith('C-1');
  });
});
```

### 5.2 VcpTooltip Tests

```typescript
describe('VcpTooltip', () => {
  it('should not render when data is null', () => {
    const { container } = render(
      <VcpTooltip
        data={null}
        chartBounds={mockBounds}
        mousePosition={{ x: 100, y: 100 }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should position tooltip at mouse position + offset', () => {
    const { container } = render(
      <VcpTooltip
        data={mockTooltipData}
        chartBounds={mockBounds}
        mousePosition={{ x: 100, y: 100 }}
      />
    );
    
    const tooltip = container.firstChild as HTMLElement;
    expect(tooltip.style.left).toBe('110px'); // +10 offset
    expect(tooltip.style.top).toBe('110px');
  });

  it('should flip to left when overflowing right edge', () => {
    const { container } = render(
      <VcpTooltip
        data={mockTooltipData}
        chartBounds={{ ...mockBounds, right: 500 }}
        mousePosition={{ x: 480, y: 100 }}
      />
    );
    
    const tooltip = container.firstChild as HTMLElement;
    // Assert: tooltip positioned to the left of mouse
    expect(parseInt(tooltip.style.left)).toBeLessThan(480);
  });
});
```

### 5.3 useVcpOverlay Tests

```typescript
describe('useVcpOverlay', () => {
  it('should return empty arrays when vcpData is null', () => {
    const { result } = renderHook(() =>
      useVcpOverlay({
        vcpData: null,
        chart: mockChart,
        series: mockSeries,
        visible: true,
      })
    );

    expect(result.current.visibleLines).toEqual([]);
    expect(result.current.visibleMarkers).toEqual([]);
    expect(result.current.visibleLabels).toEqual([]);
  });

  it('should convert contractions to VcpLineData', () => {
    const { result } = renderHook(() =>
      useVcpOverlay({
        vcpData: mockVcpData,
        chart: mockChart,
        series: mockSeries,
        visible: true,
      })
    );

    expect(result.current.visibleLines.length).toBeGreaterThan(0);
    expect(result.current.visibleLines[0].type).toBe('contraction');
  });

  it('should filter lines by visible range', () => {
    const { result } = renderHook(() =>
      useVcpOverlay({
        vcpData: mockVcpDataWithManyLines,
        chart: mockChartWithNarrowRange,
        series: mockSeries,
        visible: true,
      })
    );

    // Assert: only lines within visible range are returned
    expect(result.current.visibleLines.length).toBeLessThan(
      mockVcpDataWithManyLines.contractions.length
    );
  });
});
```

---

## 6. Contract Versioning

当前版本: `v1.0.0`

**Breaking Changes Policy**:
- Props 必填字段的变更 → Major version bump
- Props 类型变更（incompatible） → Major version bump
- Behavior 逻辑变更（影响现有用户） → Major version bump

**Non-Breaking Changes**:
- 新增可选 props → Minor version bump
- 性能优化（不改变 API） → Patch version bump
- Bug 修复 → Patch version bump

---

## Phase 1 Contracts 完成标志

✅ 所有组件 Props 定义清晰  
✅ Behavior Contract 明确且可测试  
✅ Usage Examples 完整  
✅ Testing Contracts 覆盖核心场景  

**下一步**: 创建 [quickstart.md](./quickstart.md) + 运行 agent context update

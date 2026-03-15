# Feature Specification: VCP K-Line Chart Overlay

**Feature Branch**: `006-vcp-kline-overlay`  
**Created**: 2026-03-14  
**Status**: Draft  
**Input**: User description: "把 vcp 相关信息直接绘制到每个股票详情的 k 线图上面"

## Clarifications

### Session 2026-03-14

- Q: 收缩区和回调区应该使用什么可视化方式？ → A: 不使用阴影区域，使用虚线连接高点和低点，收缩和回调使用不同的虚线样式来区分
- Q: 收缩线和回调线应该使用什么颜色来区分？ → A: 使用颜色区分，遵循 frontend-design 设计原则。收缩线使用深青蓝色（#2563eb 或类似），回调线使用琥珀橙色（#f59e0b 或类似），避免通用红绿配色，采用现代专业的蓝橙对比方案
- Q: 收缩线和回调线的标签（如 C1、C2、P1 等）应该显示在什么位置？ → A: 显示在线的中点旁边，避开价格走势密集区
- Q: 当用户悬停在虚线上时，tooltip 应该显示在什么位置？ → A: 跟随鼠标指针显示，智能避让图表边缘和遮挡
- Q: Swing high 和 Swing low 标记点应该使用什么视觉样式？ → A: 小圆点，与对应的虚线颜色一致（收缩用蓝色，回调用橙色）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Contraction Lines on Chart (Priority: P1)

Users can visually identify VCP contraction phases directly on the K-line chart without switching between separate views or components. Each contraction is clearly marked by dashed lines connecting swing high and swing low points.

**Why this priority**: This is the core value of VCP pattern visualization. Contractions are the fundamental building blocks of the VCP pattern, and seeing them overlaid on price action provides immediate pattern recognition.

**Independent Test**: Can be fully tested by loading a stock with valid VCP data and verifying that contraction dashed lines connect swing high and swing low points with appropriate labels.

**Acceptance Scenarios**:

1. **Given** a stock with 3 contractions detected, **When** user views the K-line chart, **Then** 3 distinct dashed lines appear connecting each contraction's swing high point to swing low point
2. **Given** a contraction line is displayed, **When** user hovers over the line, **Then** a tooltip shows contraction details (index number, depth percentage, duration in days, average volume)
3. **Given** multiple contractions exist, **When** displayed on chart, **Then** lines are visually distinct with progressive numbering (C1, C2, C3...) and each contraction's depth percentage is labeled at the midpoint of each line

---

### User Story 2 - View Pullback Lines on Chart (Priority: P2)

Users can see pullback phases marked on the chart to understand retracement patterns between contractions. Pullback dashed lines show the high-to-low movement with distinct styling from contractions.

**Why this priority**: Pullbacks are secondary to contractions but essential for complete VCP pattern analysis. They help users identify entry timing and pattern progression.

**Independent Test**: Can be fully tested by loading a stock with pullback data and verifying that pullback dashed lines connect high and low points with distinct styling from contractions.

**Acceptance Scenarios**:

1. **Given** a stock with 2 pullbacks detected, **When** user views the K-line chart, **Then** 2 pullback dashed lines appear connecting high point to low point with distinct line style from contractions
2. **Given** a pullback line is displayed, **When** user hovers over it, **Then** tooltip shows pullback details (index, percentage, duration, days since low, uptrend status)
3. **Given** a stock is currently in pullback, **When** viewing chart, **Then** the active pullback line has different styling from completed pullbacks

---

### User Story 3 - Toggle VCP Overlay Visibility (Priority: P3)

Users can show or hide VCP overlay elements to reduce visual clutter when analyzing other chart aspects or comparing stocks without VCP patterns.

**Why this priority**: While visualization is valuable, users may want to focus on raw price action or other indicators without VCP overlays. This is a quality-of-life feature.

**Independent Test**: Can be fully tested by toggling a control (button/checkbox) and verifying that all VCP overlay elements (contraction lines, pullback lines, markers) appear or disappear accordingly.

**Acceptance Scenarios**:

1. **Given** VCP overlay is currently visible, **When** user clicks toggle control, **Then** all VCP lines and markers disappear from chart while preserving other chart elements
2. **Given** VCP overlay is hidden, **When** user clicks toggle control, **Then** all VCP lines and markers reappear in their original positions
3. **Given** user toggles visibility, **When** navigating to different stock, **Then** toggle state persists for new stock view

---

### User Story 4 - View Key Price Markers (Priority: P2)

Users can see important VCP price points marked directly on the chart, including swing highs, swing lows, and breakout levels.

**Why this priority**: Specific price points are critical for VCP analysis and trade planning. Marking them on the chart eliminates the need to cross-reference with separate data displays.

**Independent Test**: Can be fully tested by verifying that markers appear at exact dates/prices matching VCP analysis data, with clear labels distinguishing marker types.

**Acceptance Scenarios**:

1. **Given** a stock with contraction data, **When** viewing chart, **Then** swing high and swing low points are marked with small colored circular dots at their respective dates and prices, using colors matching their associated lines
2. **Given** a marker is displayed, **When** user hovers over it, **Then** tooltip shows marker type (swing high/low), date, price, and associated contraction/pullback index
3. **Given** a stock has valid VCP pattern, **When** viewing chart, **Then** potential breakout level (last contraction high) is marked with special indicator

---

### Edge Cases

- What happens when a stock has no VCP data or analysis has not been run? (Display message prompting user to generate VCP analysis, no overlay shown)
- How does system handle stocks with 10+ contractions? (Display all lines, but use smart label placement at midpoints to reduce density; for very crowded charts, allow labels to have semi-transparent backgrounds to maintain readability)
- What happens when contraction/pullback lines cross or overlap? (Lines can cross naturally; ensure different line styles keep them distinguishable)
- How does system handle very narrow contractions (< 3 days)? (Draw lines at actual dates, ensure markers at endpoints are visible even for short lines)
- What happens when VCP data is loading or refresh in progress? (Show loading indicator on chart, keep last known overlay visible with reduced opacity, update when data arrives)
- How does system handle date range filtering (e.g., user zooms to 3-month view)? (Only display contraction/pullback lines where both endpoints fall within visible date range or extend lines to viewport boundary if partially visible)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST fetch VCP analysis data (contractions, pullbacks, trend template) for the currently displayed stock
- **FR-002**: System MUST render contraction patterns as dashed lines connecting swing high point to swing low point on the K-line chart
- **FR-003**: System MUST label each contraction line with its index number (C1, C2, C3...) and depth percentage at the midpoint of the line, avoiding price-dense areas
- **FR-004**: System MUST render pullback patterns as dashed lines connecting high point to low point with distinct line style from contractions, and label each pullback line with its index (P1, P2, P3...) and pullback percentage at the midpoint of the line
- **FR-005**: System MUST display tooltips on hover over contraction lines showing complete details (index, depth %, duration days, average volume, swing high/low dates and prices), positioned near the mouse pointer with intelligent boundary detection to avoid being cut off at chart edges
- **FR-006**: System MUST display tooltips on hover over pullback lines showing complete details (index, pullback %, duration days, days since low, average volume, high/low dates and prices, uptrend status), positioned near the mouse pointer with intelligent boundary detection to avoid being cut off at chart edges
- **FR-007**: System MUST place swing high markers as small circular dots at exact date/price coordinates from contraction data, using the same color as the associated line (cyan-blue #2563eb for contractions, amber-orange for pullbacks)
- **FR-008**: System MUST place swing low markers as small circular dots at exact date/price coordinates from contraction data, using the same color as the associated line (cyan-blue #2563eb for contractions, amber-orange for pullbacks)
- **FR-009**: System MUST provide a toggle control (button or checkbox) to show/hide all VCP overlay elements
- **FR-010**: System MUST preserve overlay visibility state when user navigates between different stocks
- **FR-011**: System MUST visually distinguish between active (current) pullbacks and completed pullbacks by using brighter orange (#fb923c) for active pullbacks and standard amber (#f59e0b) for completed pullbacks
- **FR-012**: System MUST handle cases where VCP data is unavailable by displaying a non-intrusive message on the chart
- **FR-013**: System MUST synchronize overlay rendering with chart zoom and pan actions, updating visible lines based on date range
- **FR-014**: System MUST display VCP overlays in proper z-order: contraction lines behind price bars, pullback lines above contractions, markers on top
- **FR-015**: System MUST update overlay when VCP data changes (after regeneration or refresh) without requiring page reload

### Key Entities

- **Contraction Line**: Visual overlay representing a contraction phase as dashed line, with attributes for swing high/low points (date, price), depth percentage, duration, line style (dashed pattern, deep cyan-blue color #2563eb, medium width)
- **Pullback Line**: Visual overlay representing a pullback phase as dashed line, with attributes for high/low points (date, price), pullback percentage, duration, status (active/completed), line style (dashed pattern, amber-orange color #f59e0b for completed or brighter #fb923c for active, medium width)
- **VCP Marker**: Point marker displayed as small circular dot on chart representing key price points (swing high, swing low, breakout level), with attributes for date, price, type, associated line index, and color matching the associated line (cyan-blue for contraction endpoints, amber-orange for pullback endpoints)
- **Overlay State**: Configuration tracking visibility toggle, active hover state, and user preferences for overlay display

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can identify contraction lines within 2 seconds of viewing any stock chart with valid VCP data
- **SC-002**: Overlay rendering completes within 500ms of chart load for stocks with up to 10 contractions and 10 pullbacks
- **SC-003**: All VCP line endpoints align precisely with their corresponding dates and prices on the chart axes (no misalignment > 1 pixel)
- **SC-004**: Users can access complete contraction/pullback details via tooltip hover without scrolling or switching views
- **SC-005**: Overlay visibility toggle responds within 100ms with smooth transition animation
- **SC-006**: Chart remains performant with VCP overlays enabled (pan/zoom interactions maintain 60 FPS, no lag on hover)
- **SC-007**: 90% of users can distinguish between contraction and pullback lines without reading labels (via line style/color differentiation)
- **SC-008**: VCP dashed line overlays do not obscure critical price action (candle wicks, gaps, breakouts) - users can still read underlying chart clearly

## Assumptions

- VCP analysis data is already available through existing API endpoints (as evidenced by `useVcpDetail` hook)
- K-line chart component supports custom overlay layers or plugins for adding line elements
- Chart library provides coordinate mapping functions to convert dates/prices to pixel positions and supports dashed line rendering with custom colors
- Contraction and pullback date ranges do not require validation beyond what VCP analysis already provides
- Cyan-blue and amber-orange color scheme provides sufficient contrast for contraction/pullback differentiation on typical chart backgrounds (no special accessibility color adjustments required initially)
- Users are viewing charts on desktop browsers with standard screen sizes (mobile optimization is out of scope)
- VCP data refresh frequency matches existing implementation (no new real-time update requirements)

## Dependencies

- Existing VCP analysis API and data structures (`VcpAnalysis`, `Contraction`, `Pullback` types)
- Current K-line chart implementation (`KLineChart` component and its charting library)
- Chart store and hooks (`useChartStore`, `useVcpDetail`)
- Frontend styling system (CSS modules or styled components)

## Out of Scope

- Modifying VCP analysis algorithm or calculation logic
- Adding new VCP metrics or data points beyond what currently exists
- Real-time VCP pattern updates during trading hours
- Backtesting or historical VCP pattern scanning across multiple stocks
- Mobile-specific touch interactions for overlay elements
- Exporting chart images with VCP overlays (may be added in future iteration)
- Customizing overlay colors or styles beyond predefined themes
- Machine learning-based pattern prediction or VCP scoring improvements

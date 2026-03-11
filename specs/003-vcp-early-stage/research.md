# Phase 0: 研究与技术决策

**日期**: 2026-03-11  
**目的**: 解决技术实现中的关键未知问题，为Phase 1设计提供依据

## 研究主题

### 1. localStorage存储结构设计

**问题**: 筛选条件需要持久化到localStorage，如何设计数据结构以支持未来扩展？

**研究结果**:

**决策**: 使用命名空间+版本化的JSON结构

```typescript
// LocalStorage Key: 'money-free:vcp-early-filter:v1'
interface StoredFilterConditions {
  version: string;  // '1.0.0'
  timestamp: number; // 最后更新时间
  conditions: {
    distFrom52WeekLow: number;     // 默认40
    distFrom52WeekHigh: number;    // 默认30
    contractionCountMin: number;   // 默认3
    contractionCountMax: number;   // 默认4
  };
}
```

**理由**:
- **命名空间**: `money-free:vcp-early-filter:v1` 避免与其他功能冲突
- **版本化**: 支持未来数据结构升级（如添加新筛选条件）
- **时间戳**: 可用于缓存失效策略（如7天后提示用户）
- **扁平结构**: 避免深层嵌套，便于读写

**考虑的替代方案**:
- ❌ 使用IndexedDB：过于复杂，本功能不需要复杂查询
- ❌ 存储到后端数据库：需要用户登录，增加复杂度
- ✅ localStorage：简单直接，满足需求

---

### 2. 双端滑块组件选择

**问题**: 收缩次数需要设置最小值和最大值（如3-5次），需要双端滑块（Range Slider）。Ant Design是否原生支持？

**研究结果**:

**决策**: 使用Ant Design的Slider组件（range模式）

```typescript
import { Slider } from 'antd';

<Slider
  range
  min={2}
  max={8}
  defaultValue={[3, 4]}
  marks={{ 2: '2次', 4: '4次', 6: '6次', 8: '8次' }}
  onChange={(value: [number, number]) => {
    setContractionRange(value);
  }}
/>
```

**理由**:
- Ant Design Slider组件原生支持 `range` 模式
- 无需引入第三方组件库
- 与现有UI风格一致
- 支持marks标记，用户体验好

**API文档**: https://ant.design/components/slider#api

---

### 3. 智能提示UI模式

**问题**: 当筛选结果<5只或>30只时，需要显示智能提示。应该用什么UI组件？

**研究结果**:

**决策**: 使用Ant Design的Alert组件 + 内嵌Button

```typescript
import { Alert, Button, Space } from 'antd';

{resultCount < 5 && (
  <Alert
    message="筛选结果较少"
    description={
      <Space>
        <span>当前条件筛选出{resultCount}只股票，建议放宽筛选条件</span>
        <Button size="small" onClick={() => adjustThreshold(5)}>
          放宽5%
        </Button>
        <Button size="small" onClick={() => adjustThreshold(10)}>
          放宽10%
        </Button>
      </Space>
    }
    type="warning"
    showIcon
    closable
  />
)}
```

**理由**:
- Alert组件语义明确（warning/info类型）
- 支持内嵌交互元素（Button）
- showIcon增强视觉识别度
- closable允许用户关闭提示

**颜色方案**:
- 结果<5只：`type="warning"` (橙色)
- 结果>30只：`type="info"` (蓝色)
- 结果0只：`type="error"` (红色)

---

### 4. 分页策略

**问题**: 如果筛选结果>100只，如何展示？客户端分页还是服务端分页？

**研究结果**:

**决策**: 混合策略 - 初期使用客户端分页，后续优化为服务端分页

**阶段1（MVP）**: 客户端分页
```typescript
import { Table } from 'antd';

<Table
  dataSource={filteredStocks}
  columns={columns}
  pagination={{
    pageSize: 20,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '30', '50'],
    showTotal: (total) => `共 ${total} 只股票`,
  }}
/>
```

**阶段2（优化）**: 服务端分页（如果结果>1000只）
```typescript
// API: GET /api/vcp/early-stage?page=1&pageSize=20&distFrom52WeekLow=40...
interface PaginatedResponse {
  data: EarlyStageStock[];
  total: number;
  page: number;
  pageSize: number;
}
```

**理由**:
- **MVP阶段**: 预计筛选结果5-30只，最多几百只，客户端分页足够
- **性能**: 客户端分页无需额外网络请求，响应更快
- **简单性**: 减少API复杂度
- **可扩展**: 后续可平滑升级到服务端分页

**触发服务端分页的条件**: 当平均筛选结果>500只时重构

---

### 5. 筛选逻辑执行位置

**问题**: 筛选逻辑应该在前端执行还是后端执行？

**研究结果**:

**决策**: 后端执行筛选，前端负责展示和交互

**架构**:
```
前端(React) 
  ↓ [筛选条件]
后端API (NestJS)
  ↓ [查询vcpScanResult表 + VcpAnalyzerService实时分析]
SQLite数据库
  ↓ [筛选结果]
前端(React)
  ↓ [展示、排序、高亮]
```

**理由**:
1. **数据量**: vcpScanResult表有5000+条记录，不适合全量传输到前端
2. **实时分析**: 需要调用VcpAnalyzerService分析最新K线判断VCP阶段，必须在后端
3. **性能**: 数据库查询+过滤比前端JS循环快
4. **安全**: 筛选逻辑在后端，前端无法绕过
5. **一致性**: 命令行工具和Web界面共享同一套筛选逻辑

**前端只负责**:
- 筛选条件UI
- 调用API
- 本地排序/高亮（不改变数据，只改变展示）
- localStorage持久化

---

### 6. 命令行参数设计

**问题**: Shell脚本如何接受可配置的筛选条件？

**研究结果**:

**决策**: 使用命名参数（GNU风格长选项）

```bash
#!/bin/bash
# show-vcp-early.sh

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20

# 默认值
LOW_THRESHOLD=40
HIGH_THRESHOLD=30
MIN_CONTRACTION=3
MAX_CONTRACTION=4

# 解析参数
while [[ $# -gt 0 ]]; do
  case $1 in
    --low-threshold)
      LOW_THRESHOLD="$2"
      shift 2
      ;;
    --high-threshold)
      HIGH_THRESHOLD="$2"
      shift 2
      ;;
    --min-contraction)
      MIN_CONTRACTION="$2"
      shift 2
      ;;
    --max-contraction)
      MAX_CONTRACTION="$2"
      shift 2
      ;;
    --help)
      echo "用法: ./show-vcp-early.sh [选项]"
      echo "选项:"
      echo "  --low-threshold N      距52周低点阈值（默认40）"
      echo "  --high-threshold N     距52周高点阈值（默认30）"
      echo "  --min-contraction N    最小收缩次数（默认3）"
      echo "  --max-contraction N    最大收缩次数（默认4）"
      exit 0
      ;;
    *)
      echo "未知参数: $1"
      exit 1
      ;;
  esac
done

npm run show-vcp-early -- \
  --low-threshold=$LOW_THRESHOLD \
  --high-threshold=$HIGH_THRESHOLD \
  --min-contraction=$MIN_CONTRACTION \
  --max-contraction=$MAX_CONTRACTION
```

**TypeScript脚本接收参数**:
```typescript
// show-vcp-early-stage.ts
import { Command } from 'commander';

const program = new Command();

program
  .option('--low-threshold <number>', '距52周低点阈值', '40')
  .option('--high-threshold <number>', '距52周高点阈值', '30')
  .option('--min-contraction <number>', '最小收缩次数', '3')
  .option('--max-contraction <number>', '最大收缩次数', '4')
  .parse(process.argv);

const options = program.opts();
```

**理由**:
- 清晰的参数名称，自文档化
- 支持默认值
- 支持--help查看用法
- 与现有项目风格一致

---

### 7. 前端筛选器组件设计模式

**问题**: 筛选器组件应该采用什么设计模式？受控组件还是非受控？

**研究结果**:

**决策**: 受控组件 + 自定义Hook管理状态

```typescript
// useVcpEarlyFilter.ts
interface FilterConditions {
  distFrom52WeekLow: number;
  distFrom52WeekHigh: number;
  contractionCountMin: number;
  contractionCountMax: number;
}

export function useVcpEarlyFilter() {
  const [conditions, setConditions] = useState<FilterConditions>(getDefaultConditions());
  const [results, setResults] = useState<EarlyStageStock[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载localStorage
  useEffect(() => {
    const stored = localStorage.getItem('money-free:vcp-early-filter:v1');
    if (stored) {
      const data = JSON.parse(stored);
      setConditions(data.conditions);
    }
  }, []);

  // 保存到localStorage
  const updateConditions = (newConditions: Partial<FilterConditions>) => {
    const updated = { ...conditions, ...newConditions };
    setConditions(updated);
    localStorage.setItem('money-free:vcp-early-filter:v1', JSON.stringify({
      version: '1.0.0',
      timestamp: Date.now(),
      conditions: updated,
    }));
  };

  // 执行筛选
  const filter = async () => {
    setLoading(true);
    try {
      const data = await vcpService.filterEarlyStage(conditions);
      setResults(data);
    } catch (error) {
      message.error('筛选失败');
    } finally {
      setLoading(false);
    }
  };

  // 快捷调整
  const adjustLowThreshold = (delta: number) => {
    updateConditions({
      distFrom52WeekLow: Math.min(60, Math.max(20, conditions.distFrom52WeekLow + delta))
    });
  };

  return {
    conditions,
    updateConditions,
    results,
    loading,
    filter,
    adjustLowThreshold,
  };
}
```

**理由**:
- **受控组件**: React推荐模式，状态单一来源
- **自定义Hook**: 封装筛选逻辑，组件保持简洁
- **localStorage集成**: 在Hook内部处理，组件无需关心
- **可测试**: Hook可以独立测试

---

## 总结

| 主题 | 决策 | 关键技术 |
|------|------|----------|
| localStorage | 命名空间+版本化JSON | `money-free:vcp-early-filter:v1` |
| 双端滑块 | Ant Design Slider (range) | `<Slider range />` |
| 智能提示 | Ant Design Alert + Button | `<Alert type="warning" />` |
| 分页 | 客户端分页（MVP） | `<Table pagination />` |
| 筛选执行 | 后端执行 | NestJS API + Prisma |
| 命令行参数 | GNU长选项 | `--low-threshold=40` |
| 组件模式 | 受控组件+自定义Hook | `useVcpEarlyFilter()` |

**下一步**: 进入Phase 1 - 设计数据模型和API契约

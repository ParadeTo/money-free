import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

/**
 * 配置 Swagger API 文档
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Stock Analysis API')
    .setDescription(
      `
# 股票分析工具 REST API

## 功能模块

### 认证 (Authentication)
- JWT token 认证
- 用户登录/登出

### 股票数据 (Stocks)
- 获取股票列表（带筛选条件）
- 获取股票详情
- 获取 K 线数据（日线/周线）
- 获取技术指标数据

### 收藏 (Favorites)
- 添加/删除股票收藏
- 获取收藏列表
- 收藏分组管理

### 选股策略 (Screener)
- 创建/编辑/删除选股策略
- 执行选股策略筛选
- 获取策略结果

### 绘图 (Drawings)
- 保存/加载图表绘图
- 支持趋势线、水平线、矩形等

### 数据更新 (Data Updates)
- 手动触发数据更新
- 查询更新状态和进度
- 查看更新日志

## 数据源

- **主数据源**: Tushare Pro (HTTP API)
- **备用数据源**: AkShare (Python Bridge)
- **自动降级**: Tushare 失败时自动切换到 AkShare

## 技术指标

支持的技术指标：
- **MA**: 均线 (日线: 50/150/200, 周线: 10/30/40)
- **KDJ**: 随机指标 (9,3,3)
- **RSI**: 相对强弱指标 (14)
- **Volume**: 成交量 + 52周均量
- **Amount**: 成交额 + 52周均额
- **52周标注**: 52周最高/最低价标注

## 认证说明

大部分 API 需要 JWT token 认证。获取 token 的步骤：

1. POST /auth/login - 使用用户名和密码登录
2. 在响应中获取 access_token
3. 在后续请求的 Header 中添加: \`Authorization: Bearer <token>\`

## 错误响应格式

\`\`\`json
{
  "statusCode": 400,
  "timestamp": "2026-02-28T08:00:00.000Z",
  "path": "/api/v1/stocks",
  "method": "GET",
  "message": "Validation failed",
  "errors": [
    {
      "field": "page",
      "constraints": {
        "isInt": "page must be an integer"
      }
    }
  ]
}
\`\`\`
`,
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', '认证相关接口')
    .addTag('stocks', '股票数据接口')
    .addTag('kline', 'K线数据接口')
    .addTag('indicators', '技术指标接口')
    .addTag('favorites', '收藏管理接口')
    .addTag('screener', '选股策略接口')
    .addTag('drawings', '绘图管理接口')
    .addTag('data-update', '数据更新接口')
    .addTag('Health', '健康检查')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });
}

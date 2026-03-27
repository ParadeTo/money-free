# 前端面试题 - 实现并发控制的任务调度器

## 题目描述

实现一个任务调度器 `TaskScheduler`，用于控制异步任务的并发执行数量。

### 核心要求

1. **并发控制**：最多同时执行 N 个任务
2. **任务队列**：超出并发数的任务自动排队等待
3. **自动执行**：添加任务时自动开始执行（有空闲槽位时）
4. **Promise 支持**：`addTask()` 返回该任务的结果 Promise
5. **错误处理**：单个任务失败不影响其他任务（类似 `Promise.allSettled`）

## API 设计

```javascript
class TaskScheduler {
  constructor(concurrency = 2) {}
  addTask(task) {
    // 返回 Promise<{status: 'fulfilled'|'rejected', value?, reason?}>
  }
}
```

## 使用示例

```javascript
const scheduler = new TaskScheduler(2); // 并发数为 2

// 批量添加任务
const promises = [
  scheduler.addTask(() => fetch('/api/1')),
  scheduler.addTask(() => fetch('/api/2')),
  scheduler.addTask(() => fetch('/api/3')),
  scheduler.addTask(() => fetch('/api/4'))
];

Promise.all(promises).then(results => {
  // results: [{ status: 'fulfilled', value: ... }, ...]
});

// 单独处理任务
scheduler.addTask(() => uploadFile(file)).then(result => {
  if (result.status === 'fulfilled') console.log('上传成功');
});
```

## 实现参考

```javascript
class TaskScheduler {
  constructor(concurrency = 2) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  addTask(task) {
    return new Promise((resolve) => {
      this.queue.push({ task, resolve });
      this._tryRunNext();
    });
  }

  _tryRunNext() {
    if (this.running < this.concurrency && this.queue.length > 0) {
      this._runNext();
    }
  }

  async _runNext() {
    if (this.queue.length === 0) return;
    const { task, resolve } = this.queue.shift();
    this.running++;
    try {
      const value = await task();
      resolve({ status: 'fulfilled', value });
    } catch (error) {
      resolve({ status: 'rejected', reason: error });
    } finally {
      this.running--;
      this._tryRunNext();
    }
  }
}
```

## 关键提示

- 维护 `running` 计数器控制并发数
- 使用队列存储待执行任务
- 任务完成后自动触发下一个任务（`finally` 中调用 `_tryRunNext()`）
- 失败的任务也用 `resolve` 返回（保证 Promise.all 能收集所有结果）

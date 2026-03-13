# 前端面试题 - 实现并发控制的任务调度器

## 难度：中等偏上

## 题目描述

实现一个任务调度器 `TaskScheduler`，用于控制异步任务的并发执行数量。这在前端开发中非常实用，比如：
- 批量上传文件时控制同时上传数量
- 批量请求 API 时避免浏览器并发限制
- 爬虫程序控制请求频率

### 核心要求

1. **并发控制**：最多同时执行 N 个任务
2. **任务队列**：超出并发数的任务自动排队等待
3. **Promise 支持**：每个任务返回 Promise，调度器也返回 Promise
4. **结果收集**：按添加顺序返回所有任务的结果（类似 `Promise.allSettled`）
5. **错误处理**：单个任务失败不影响其他任务，最终返回成功和失败的结果

## API 设计

```javascript
class TaskScheduler {
  constructor(concurrency = 2) {
    // concurrency: 最大并发数
  }

  // 添加任务（task 是一个返回 Promise 的函数）
  addTask(task) {
    // 返回 Promise，resolve 时返回任务结果
  }

  // 执行所有任务，返回所有结果
  run() {
    // 返回 Promise<Array<{status: 'fulfilled'|'rejected', value, reason}>>
  }
}
```

## 使用示例

```javascript
// 模拟异步任务
function mockTask(id, delay, shouldFail = false) {
  return () => new Promise((resolve, reject) => {
    console.log(`Task ${id} started`);
    setTimeout(() => {
      if (shouldFail) {
        console.log(`Task ${id} failed`);
        reject(new Error(`Task ${id} failed`));
      } else {
        console.log(`Task ${id} completed`);
        resolve(`Result ${id}`);
      }
    }, delay);
  });
}

// 使用调度器
const scheduler = new TaskScheduler(2); // 最多同时执行 2 个任务

// 添加 6 个任务
scheduler.addTask(mockTask(1, 1000));
scheduler.addTask(mockTask(2, 500));
scheduler.addTask(mockTask(3, 300));
scheduler.addTask(mockTask(4, 400));
scheduler.addTask(mockTask(5, 200));
scheduler.addTask(mockTask(6, 100, true)); // 这个任务会失败

// 执行
scheduler.run().then(results => {
  console.log('All tasks completed:', results);
});

/* 预期输出时间线：
0ms:   Task 1 started, Task 2 started
500ms: Task 2 completed, Task 3 started
800ms: Task 3 completed, Task 4 started
1000ms: Task 1 completed, Task 5 started
1200ms: Task 4 completed, Task 6 started
1400ms: Task 5 completed
1300ms: Task 6 failed

结果：
[
  { status: 'fulfilled', value: 'Result 1' },
  { status: 'fulfilled', value: 'Result 2' },
  { status: 'fulfilled', value: 'Result 3' },
  { status: 'fulfilled', value: 'Result 4' },
  { status: 'fulfilled', value: 'Result 5' },
  { status: 'rejected', reason: Error('Task 6 failed') }
]
*/
```

## 评分标准

- **功能完整性**（40分）：实现所有核心要求（并发控制、队列、结果收集、错误处理）
- **代码质量**（30分）：代码结构清晰，面向对象设计合理，注释恰当
- **异步处理**（20分）：正确处理 Promise 和异步逻辑，结果顺序正确
- **边界情况**（10分）：空任务列表、并发数为 1、任务立即完成等

## 提示

1. 使用队列（Queue）数据结构管理待执行任务
2. 维护一个计数器跟踪当前运行的任务数
3. 每个任务完成时，从队列中取出下一个任务执行
4. 使用 `Promise.allSettled()` 的思想处理结果
5. 注意处理异步的竞态条件

## 进阶挑战（可选）

如果你觉得基础版本太简单，可以尝试添加以下功能（需要扩展 API）：

1. **任务优先级**：高优先级任务可以插队执行
2. **重试机制**：失败的任务自动重试 N 次
3. **超时控制**：任务超时自动标记为失败
4. **动态调整并发数**：运行时修改最大并发数
5. **任务取消**：取消还未开始执行的任务
6. **进度回调**：实时通知任务执行进度

---

**预计完成时间**：45-60 分钟（基础版本）

**考察点**：Promise、async/await、并发控制、队列数据结构、异步编程、面向对象设计、错误处理

---

## 实现参考

### 基础版本（满足所有核心要求）

```javascript
class TaskScheduler {
  constructor(concurrency = 2) {
    this.concurrency = concurrency; // 最大并发数
    this.running = 0; // 当前运行的任务数
    this.queue = []; // 待执行任务队列
    this.results = []; // 结果数组
  }

  /**
   * 添加任务到队列
   * @param {Function} task - 返回 Promise 的函数
   * @returns {Promise} 该任务的执行结果
   */
  addTask(task) {
    return new Promise((resolve, reject) => {
      const taskIndex = this.results.length;
      
      // 预先在结果数组中占位，保证顺序
      this.results.push(null);
      
      // 将任务和它的 resolve/reject 函数包装在一起
      this.queue.push({
        task,
        resolve,
        reject,
        index: taskIndex
      });
    });
  }

  /**
   * 运行所有任务
   * @returns {Promise<Array>} 所有任务的结果
   */
  async run() {
    // 启动初始的并发任务
    const promises = [];
    while (this.running < this.concurrency && this.queue.length > 0) {
      promises.push(this._runNext());
    }

    // 等待所有任务完成
    if (promises.length > 0) {
      await Promise.all(promises);
    }

    return this.results;
  }

  /**
   * 执行下一个任务
   * @private
   */
  async _runNext() {
    // 从队列中取出任务
    while (this.queue.length > 0) {
      const { task, resolve, reject, index } = this.queue.shift();
      this.running++;

      try {
        // 执行任务
        const value = await task();
        
        // 记录成功结果
        this.results[index] = {
          status: 'fulfilled',
          value
        };
        resolve({ status: 'fulfilled', value });
      } catch (error) {
        // 记录失败结果
        this.results[index] = {
          status: 'rejected',
          reason: error
        };
        resolve({ status: 'rejected', reason: error }); // 注意：这里用 resolve 而不是 reject
      } finally {
        this.running--;
      }
    }
  }
}
```

---

### 测试代码

```javascript
// 模拟异步任务
function mockTask(id, delay, shouldFail = false) {
  return () => new Promise((resolve, reject) => {
    console.log(`[${new Date().toISOString().slice(11, 23)}] Task ${id} started`);
    setTimeout(() => {
      if (shouldFail) {
        console.log(`[${new Date().toISOString().slice(11, 23)}] Task ${id} failed ❌`);
        reject(new Error(`Task ${id} failed`));
      } else {
        console.log(`[${new Date().toISOString().slice(11, 23)}] Task ${id} completed ✅`);
        resolve(`Result ${id}`);
      }
    }, delay);
  });
}

// ========== 基础并发控制测试 ==========
async function testBasic() {
  console.log('========== 并发控制测试 ==========\n');
  
  const scheduler = new TaskScheduler(2); // 最多 2 个并发
  
  // 添加 6 个任务
  scheduler.addTask(mockTask(1, 1000));
  scheduler.addTask(mockTask(2, 500));
  scheduler.addTask(mockTask(3, 300));
  scheduler.addTask(mockTask(4, 400));
  scheduler.addTask(mockTask(5, 200));
  scheduler.addTask(mockTask(6, 100, true)); // 会失败
  
  const results = await scheduler.run();
  
  console.log('\n最终结果:');
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`  ✅ Task ${index + 1}: ${result.value}`);
    } else {
      console.log(`  ❌ Task ${index + 1}: ${result.reason.message}`);
    }
  });
}

// 运行测试
testBasic();

/* 预期输出：
========== 并发控制测试 ==========

[xx:xx:xx.xxx] Task 1 started
[xx:xx:xx.xxx] Task 2 started
[xx:xx:xx.xxx] Task 2 completed ✅
[xx:xx:xx.xxx] Task 3 started
[xx:xx:xx.xxx] Task 3 completed ✅
[xx:xx:xx.xxx] Task 4 started
[xx:xx:xx.xxx] Task 1 completed ✅
[xx:xx:xx.xxx] Task 5 started
[xx:xx:xx.xxx] Task 5 completed ✅
[xx:xx:xx.xxx] Task 6 started
[xx:xx:xx.xxx] Task 6 failed ❌
[xx:xx:xx.xxx] Task 4 completed ✅

最终结果:
  ✅ Task 1: Result 1
  ✅ Task 2: Result 2
  ✅ Task 3: Result 3
  ✅ Task 4: Result 4
  ✅ Task 5: Result 5
  ❌ Task 6: Task 6 failed
*/
```

---

### 关键知识点总结

1. **并发控制核心思想**
   - 维护 `running` 计数器，限制同时执行的任务数
   - 使用队列（Queue）存储待执行任务
   - 任务完成时自动触发下一个任务的执行

2. **Promise 链式管理**
   - 每个任务都包装成 Promise
   - 使用 `resolve` 而不是 `reject` 来处理单个任务失败（关键！）
   - 保证 `run()` 返回所有结果，类似 `Promise.allSettled()`

3. **结果顺序保证**
   - 预先在结果数组中占位（使用 index）
   - 任务异步完成后，填充到对应位置
   - 避免异步执行顺序与添加顺序不一致的问题

4. **关键技巧**
   - `addTask()` 返回 Promise，但实际执行在 `run()` 中
   - 队列使用 `shift()` 从头部取任务（FIFO）
   - `while` 循环持续处理队列中的任务
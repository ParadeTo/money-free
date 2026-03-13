class TaskScheduler {
  constructor(concurrency = 2) {
    // concurrency: 最大并发数
    this.concurrency = concurrency
    this.taskQueue = []
    this.runningTasks = 0
    this.taskResults = []
    this.isRunning = false
    this.runResolveCallback = null
  }

  executeNextTask() {
      if(this.taskQueue.length === 0 || this.runningTasks >= this.concurrency) {
          if(this.taskQueue.length === 0 && this.runningTasks === 0) {
              this.runResolveCallback([...this.taskResults])

              this.isRunning = false
          }
          return
      }

      const { task, resolve, reject } = this.taskQueue.shift()
      this.runningTasks++

      Promise.resolve(task()).then((value) => {
          this.taskResults.push({
              status: 'fulfilled',
              value
          })
          resolve(value)
        }).catch((error) => {
            this.taskResults.push({
                status: 'rejected',
                error
            })
            reject(error)
        }).finally(() => {
            this.runningTasks--
            this.executeNextTask()
        })
  }

  // 添加任务（task 是一个返回 Promise 的函数）
  addTask(task) {
    // 返回 Promise，resolve 时返回任务结果
    if(typeof task !== 'function') {
        return Promise.reject(new Error('不是promise函数'))
    }

    return new Promise((resolve, reject) => {
        this.taskQueue.push({
            task,
            resolve,
            reject
        })

        if(this.isRunning) {
            this.executeNextTask()
        }
    })
  }

   // 执行所有任务，返回所有结果
   run() {
      // 返回 Promise<Array<{status: 'fulfilled'|'rejected', value, reason}>>
        if(this.isRunning) {
            return Promise.reject(new Error('调度器已启动，不能重复跑'))
        }

        this.isRunning = true

        return new Promise((resolve) => {
            this.runResolveCallback = resolve
            this.executeNextTask()
        })
    }
}

// 测试用例
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
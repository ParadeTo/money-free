class TaskScheduler {
    concurrency;
    executing;
    alltask;
    constructor(concurrency = 2) {
       // concurrency: 最大并发数
        this.concurrency = concurrency;
        this.executing = new Array();
        this.alltask = new Array();
    }
 

    // 添加任务（task 是一个返回 Promise 的函数）
    addTask(task) {
        this.alltask.push(task);
    }
 

    // 执行所有任务，返回所有结果
    run() {
        // 返回 Promise<Array<{status: 'fulfilled'|'rejected', value, reason}>>
        for(let task of this.alltask){
            let taskPromise = new Promise((resolve, reject)=>{
                let res = task();
                resolve(res);
            })

            this.executing.push(taskPromise);

            if(this.executing.length > this.concurrency){
                Promise.race(this.executing);
            }
        }

        return Promise.all(this.executing);
    }
}

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
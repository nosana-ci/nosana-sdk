import { Worker } from 'worker_threads';
import { Collection, Db, ObjectId } from 'mongodb';

import { Config } from '../../../../../config';
import { spawnListTask } from './task/list/spawner';
import { getOutstandingTasks } from './getOutstandingTasks';

import { TaskDocument } from '../../types';

export class TaskListener {
  private db: Db;
  private collection: Collection<TaskDocument>;
  private batchSize: number;
  private tasks: Map<ObjectId, Worker>;
  private fetchTasksInterval: NodeJS.Timer | undefined;

  constructor(db: Db) {
    this.db = db;
    this.collection = db.collection('tasks');
    this.batchSize = new Config().deploymentsConfig.tasks_batch_size;
    this.tasks = new Map();
  }

  async completeTask(id: ObjectId) {
    const { acknowledged } = await this.collection.deleteOne({
      _id: { $eq: id },
    });
    if (acknowledged) {
      this.tasks.delete(id);
    }
  }

  async fetchNewTasks() {
    if (this.tasks.size >= this.batchSize) {
      return;
    }

    const tasks = await getOutstandingTasks(
      this.collection,
      [...this.tasks.keys()],
      this.batchSize,
    );

    tasks.forEach((task) => {
      this.tasks.set(
        task._id,
        spawnListTask(this.db, task, async () => this.completeTask(task._id)),
      );
    });
  }

  start() {
    if (this.fetchTasksInterval) return;

    this.fetchNewTasks().then(() => {
      this.fetchTasksInterval = setInterval(
        async () => await this.fetchNewTasks(),
        5000,
      );
    });
  }

  stop() {
    clearInterval(this.fetchTasksInterval);
  }
}

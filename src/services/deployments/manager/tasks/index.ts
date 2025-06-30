import { Db, ObjectId } from 'mongodb';
import { Worker } from 'worker_threads';

import { Config } from '../../../../config';
import { spawnListTask } from './task/list/spawner';
import { spawnExtendTask } from './task/extend/spawner';
import { getOutstandingTasks } from './getOutstandingTasks';

import { TaskDocument, TaskType } from '../types';

export function startTaskListener(db: Db) {
  const tasks = new Map<ObjectId, Worker>();
  const collection = db.collection<TaskDocument>('tasks');
  const batchSize = new Config().deploymentsConfig.tasks_batch_size;
  let fetchTasksInterval: NodeJS.Timer | undefined = undefined;

  const completeTask = async (id: ObjectId) => {
    const { acknowledged } = await collection.deleteOne({
      _id: { $eq: id },
    });

    if (acknowledged) {
      tasks.delete(id);
    }
  };

  const fetchNewTasks = async () => {
    if (tasks.size >= batchSize) {
      return;
    }

    const newTasks = await getOutstandingTasks(
      collection,
      [...tasks.keys()],
      batchSize,
    );

    newTasks.forEach((task) => {
      switch (task.task) {
        case TaskType.LIST:
          tasks.set(
            task._id,
            spawnListTask(db, task, () => completeTask(task._id)),
          );
          break;
        case TaskType.EXTEND:
          tasks.set(
            task._id,
            spawnExtendTask(db, task, () => completeTask(task._id)),
          );
          break;
      }
    });
  };

  fetchNewTasks().then(() => {
    fetchTasksInterval = setInterval(async () => await fetchNewTasks(), 5000);
  });

  return {
    stop: () => clearInterval(fetchTasksInterval),
  };
}

import { Collection, Db } from 'mongodb';

import type { TaskDocument, TasksCollection, TaskType } from '../types';

export async function scheduleTask(
  db: Db,
  task: TaskType,
  deploymentId: string,
  due_at = new Date(),
) {
  const tasks: TasksCollection = db.collection<TaskDocument>('tasks');

  const { acknowledged } = await tasks.insertOne({
    task,
    due_at,
    deploymentId,
    tx: undefined,
    created_at: new Date(),
  });

  if (!acknowledged) {
    console.error(
      `Failed to schedule ${task} task for deployment ${deploymentId}.`,
    );
  }
}

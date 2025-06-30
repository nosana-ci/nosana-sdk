import { Collection, Db } from 'mongodb';

import type { TaskDocument, TaskType } from '../types';

export async function scheduleTask(
  db: Db,
  task: TaskType,
  deploymentId: string,
  due_at = new Date(),
) {
  const { acknowledged } = await (
    db.collection('tasks') as Collection<TaskDocument>
  ).insertOne({
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

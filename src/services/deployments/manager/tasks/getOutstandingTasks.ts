import { Collection, ObjectId } from 'mongodb';

import { OutstandingTasksDocument, TaskDocument } from '../types';

export async function getOutstandingTasks(
  collection: Collection<TaskDocument>,
  keys: ObjectId[],
  batchSize: number,
): Promise<OutstandingTasksDocument[]> {
  return collection
    .aggregate()
    .match({
      due_at: {
        $lt: new Date(),
      },
      _id: {
        $nin: keys,
      },
    })
    .limit(batchSize - keys.length)
    .lookup({
      from: 'deployments',
      localField: 'deploymentId',
      foreignField: 'id',
      as: 'deployment',
    })
    .lookup({
      from: 'jobs',
      localField: 'deploymentId',
      foreignField: 'deployment',
      as: 'jobs',
    })
    .unwind({
      path: '$deployment',
      preserveNullAndEmptyArrays: false,
    })
    .toArray() as Promise<OutstandingTasksDocument[]>;
}

import { Collection } from 'mongodb';

import { EventDocument, OutstandingTasksDocument } from '../../../../types';

export function onStopConfirmed(
  tx: string,
  events: Collection<EventDocument>,
  { deploymentId }: OutstandingTasksDocument,
) {
  events.insertOne({
    deploymentId,
    category: 'Deployment',
    type: 'JOB_STOPPED_CONFIRMED',
    message: `Successfully stopped all jobs. TX ${tx}`,
    created_at: new Date(),
  });
}

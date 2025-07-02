import { EventsCollection, OutstandingTasksDocument } from '../../../../types';

export function onExtendConfirmed(
  tx: string,
  events: EventsCollection,
  task: OutstandingTasksDocument,
) {
  events.insertOne({
    deploymentId: task.deploymentId,
    category: 'Deployment',
    type: 'JOB_EXTEND_SUCCESSFUL',
    message: `Successfully extended job - TX ${tx}`,
    created_at: new Date(),
  });
}

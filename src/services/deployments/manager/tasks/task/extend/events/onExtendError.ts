import { Collection } from 'mongodb';

import {
  DeploymentStatus,
  EventDocument,
  OutstandingTasksDocument,
} from '../../../../types';

export function onExtendError(
  error: object | Error | string | null,
  setError: (status: DeploymentStatus) => void,
  events: Collection<EventDocument>,
  { deploymentId }: OutstandingTasksDocument,
) {
  events.insertOne({
    deploymentId,
    category: 'Deployment',
    type: 'JOB_EXTEND_FAILED',
    message:
      error instanceof Error
        ? error.message
        : typeof error === 'object'
        ? JSON.stringify(error)
        : error,
    created_at: new Date(),
  });

  if (typeof error === 'string' && error.includes('InsufficientFundsForRent')) {
    setError(DeploymentStatus.INSUFFICIENT_FUNDS);
  }
  setError(DeploymentStatus.ERROR);
}

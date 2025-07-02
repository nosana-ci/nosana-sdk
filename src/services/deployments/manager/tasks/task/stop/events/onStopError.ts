import { Collection } from 'mongodb';

import {
  DeploymentStatus,
  EventDocument,
  OutstandingTasksDocument,
} from '../../../../types';

export function onStopError(
  tx: string | undefined,
  error: object | Error | string | null,
  collection: Collection<EventDocument>,
  { deploymentId }: OutstandingTasksDocument,
  setErrorType: (status: DeploymentStatus) => void,
) {
  if (!error || error === null) return;

  collection.insertOne({
    deploymentId,
    category: 'Deployment',
    type: 'JOB_STOP_ERROR',
    tx,
    message:
      error instanceof Error
        ? error.message
        : typeof error === 'object'
        ? JSON.stringify(error)
        : error,
    created_at: new Date(),
  });

  if (typeof error === 'string' && error.includes('InsufficientFundsForRent')) {
    setErrorType(DeploymentStatus.INSUFFICIENT_FUNDS);
  }
  setErrorType(DeploymentStatus.ERROR);
}

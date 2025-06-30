import { OnListEventParams } from '../spawner';

import { DeploymentStatus } from '../../../../types';

export function onListError(
  tx: string | undefined,
  error: object | Error | string | null,
  { collections: { events }, task, setErrorType }: OnListEventParams,
) {
  if (!error || error === null) return;

  events.insertOne({
    deploymentId: task.deploymentId,
    category: 'Deployment',
    type: 'JOB_LIST_ERROR',
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

import { Collection } from 'mongodb';

import {
  DeploymentDocument,
  DeploymentStatus,
  OutstandingTasksDocument,
} from '../../../../types';

export function onStopExit(
  errorStatus: DeploymentStatus | undefined,
  documents: Collection<DeploymentDocument>,
  { deploymentId }: OutstandingTasksDocument,
) {
  documents.updateOne(
    {
      id: { $eq: deploymentId },
    },
    {
      $set: {
        status: errorStatus ?? DeploymentStatus.STOPPED,
      },
    },
  );
}

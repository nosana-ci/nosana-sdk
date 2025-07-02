import { DeploymentAggregation, DeploymentCollection } from '../../types';

export async function fetchDeployments(
  {
    id,
    owner,
  }: {
    id?: string | undefined;
    owner: string;
  },
  deployments: DeploymentCollection,
): Promise<DeploymentAggregation[]> {
  const deployment = await deployments
    .aggregate()
    .match({
      ...(id
        ? {
            id: {
              $eq: id,
            },
          }
        : {}),
      owner: {
        $eq: owner,
      },
    })
    .lookup({
      from: 'events',
      localField: 'id',
      foreignField: 'deploymentId',
      as: 'events',
    })
    .lookup({
      from: 'jobs',
      localField: 'id',
      foreignField: 'deployment',
      as: 'jobs',
    })
    .project({
      _id: false,
      'events._id': false,
      'jobs._id': false,
      'jobs.run': false,
    })
    .toArray();

  return deployment as DeploymentAggregation[];
}

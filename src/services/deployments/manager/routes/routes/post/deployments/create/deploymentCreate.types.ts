import { DeploymentDocument, DeploymentStrategy } from '../../../../../types';

type DeploymentCreateBase = {
  name: string;
  market: string;
  replicas: number;
  timeout: number;
  ipfs_definition_hash: string;
};

interface ScheduledDeploymentCreate extends DeploymentCreateBase {
  strategy: 'SCHEDULED';
  schedule: string;
}

interface OtherDeploymentCreate extends DeploymentCreateBase {
  strategy: Exclude<DeploymentStrategy, 'SCHEDULED'>;
  schedule?: never;
}

export type DeploymentCreateRequest =
  | ScheduledDeploymentCreate
  | OtherDeploymentCreate;

export type DeploymentCreateSuccessResponse = DeploymentDocument;

export type DeploymentCreateErrorResponse = {
  error: string;
};

export type DeploymentCreateResponse =
  | DeploymentCreateSuccessResponse
  | DeploymentCreateErrorResponse;

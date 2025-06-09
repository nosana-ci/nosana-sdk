import { DeploymentDocument, DeploymentStrategy } from '../../../../types';

export type DeploymentCreateRequest = {
  name: string;
  market: string;
  replicas: number;
  timeout: number;
  strategy: DeploymentStrategy;
  ipfs_definition_hash: string;
};

export type DeploymentCreateSuccessResponse = DeploymentDocument;

export type DeploymentCreateErrorResponse = {
  error: string;
};

export type DeploymentCreateResponse =
  | DeploymentCreateSuccessResponse
  | DeploymentCreateErrorResponse;

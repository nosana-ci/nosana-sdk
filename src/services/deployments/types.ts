import { PublicKey } from '@solana/web3.js';
import type createClient from 'openapi-fetch';

import { paths, components } from './client/index.js';

export type DeploymentState = {
  id: string;
  name: string;
  market: PublicKey;
  owner: PublicKey;
  timeout: number;
  replicas: number;
  strategy: DeploymentStrategy;
  status: DeploymentStatus;
  ipfs_definition_hash: string;
  events: components['schemas']['Events'][];
  jobs: components['schemas']['Jobs'][];
  updated_at: Date;
  created_at: Date;
};

export const DeploymentStatus: {
  [key in components['schemas']['DeploymentStatus']]: components['schemas']['DeploymentStatus'];
} = {
  DRAFT: 'DRAFT',
  ERROR: 'ERROR',
  STARTING: 'STARTING',
  RUNNING: 'RUNNING',
  STOPPING: 'STOPPING',
  STOPPED: 'STOPPED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  ARCHIVED: 'ARCHIVED',
} as const;

export const DeploymentStrategy: {
  [key in components['schemas']['DeploymentStrategy']]: components['schemas']['DeploymentStrategy'];
} = {
  SIMPLE: 'SIMPLE',
  'SIMPLE-EXTEND': 'SIMPLE-EXTEND',
  SCHEDULED: 'SCHEDULED',
  INFINITE: 'INFINITE',
} as const;

export type DeploymentStatus = components['schemas']['DeploymentStatus'];
export type DeploymentStrategy = components['schemas']['DeploymentStrategy'];

/**
 * Utility type to remove header requirements from OpenAPI parameters
 * This preserves the original structure but removes headers and makes undefined params optional
 * We only modify the parameters, leaving responses and requestBody untouched
 */
type OmitHeaders<T> = T extends {
  parameters: {
    header?: any;
    path?: infer Path;
    query?: infer Query;
    cookie?: infer Cookie;
  };
  responses?: infer Responses;
  requestBody?: infer RequestBody;
}
  ? {
      parameters: {
        header?: never;
      } & (Path extends undefined ? {} : { path: Path }) &
        (Query extends undefined ? {} : { query: Query }) &
        (Cookie extends undefined ? {} : { cookie: Cookie });
    } & (Responses extends undefined ? {} : { responses: Responses }) &
      (RequestBody extends undefined ? {} : { requestBody: RequestBody })
  : T;

/**
 * Type that removes header requirements from all endpoints in the paths
 * This should preserve response types and other properties
 */
export type AuthenticatedPaths = {
  [P in keyof paths]: {
    [M in keyof paths[P]]: OmitHeaders<paths[P][M]>;
  };
};

/**
 * Explicit client type that should preserve all response typing
 */
export type AuthenticatedClient = ReturnType<
  typeof createClient<AuthenticatedPaths>
>;

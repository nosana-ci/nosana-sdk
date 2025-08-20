import { PublicKey } from '@solana/web3.js';
import { type IValidation } from 'typia';
import typia, { tags } from 'typia';
import { Resource } from './resources.js';

export { IValidation };

/************************
 * Job Definition Types *
 ************************/
export type Ops = Array<Operation<OperationType>>;

// Define service types as individual types
export type WebService = 'web';
export type ApiService = 'api';
export type WebApiService = 'webapi';
export type WebSocketService = 'websocket';
export type NoneService = 'none';

// Union type for all service types
export type ServiceType =
  | WebService
  | ApiService
  | WebSocketService
  | WebApiService
  | NoneService;

// Define health check types as individual types
export type HttpHealthCheckType = 'http';
export type WebSocketHealthCheckType = 'websocket';

// Union type for all health check types
export type HealthCheckType = HttpHealthCheckType | WebSocketHealthCheckType;

// Define HealthCheck structure based on HealthCheckType
export type HttpHealthCheck = {
  type: HttpHealthCheckType;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  expected_status: number;
  headers?: Record<string, string>;
  body?: any;
  continuous: boolean;
};

export type WebSocketHealthCheck = {
  type: WebSocketHealthCheckType;
  expected_response: string;
  continuous: boolean;
};

// Union type for health checks
export type HealthCheck = HttpHealthCheck | WebSocketHealthCheck;

type PortRangeString = string &
  tags.TagBase<{
    kind: 'portRange';
    target: 'string';
    value: 'portRange';
    validate: `
    typeof $input === "string" &&
    (() => {
      const match = /^([0-9]+)-([0-9]+)$/.exec($input);
      if (!match) return false;
      const a = Number(match[1]), b = Number(match[2]);
      return a < b;
    })()
  `;
    message: "Port range must be in the format 'start:end' with start < end";
  }>;

// Define the structure for exposed ports
export type ExposedPort = {
  port: number | PortRangeString;
  type?: ServiceType;
  health_checks?: HealthCheck[];
};

// Custom tag for unique exposed ports validation
export type UniqueExposedPorts = Array<number | PortRangeString | ExposedPort> &
  tags.TagBase<{
    kind: 'uniqueExposedPorts';
    target: 'array';
    value: 'uniqueExposedPorts';
    validate: `
      (() => {
       if (!Array.isArray($input)) return true;
        const numbers = new Set();
        const ranges = [];
        for (const portObj of $input) {
          let port = typeof portObj === "object" ? portObj.port : portObj;
          if (typeof port === "number") {
            if (numbers.has(port)) return false;
            numbers.add(port);
          } else if (typeof port === "string") {
            const match = /^([0-9]+)-([0-9]+)$/.exec(port);
            if (!match) return false;
            const start = Number(match[1]), end = Number(match[2]);
            for (const [rStart, rEnd] of ranges) {
              if (start <= rEnd && end >= rStart) return false;
            }
            ranges.push([start, end]);
          }
        }
        for (const port of numbers) {
          for (const [start, end] of ranges) {
            if (port >= start && port <= end) return false;
          }
        }
        return true;
      })()
    `;
    message: 'Exposed ports must be unique, number ports must not fall within any defined port range, and port ranges must not overlap or be adjacent.';
  }>;

export interface JobLogistics {
  send?: SendJobDefinationLogicstics;
  receive?: ReceiveJobResultLogicstics;
}

/**
 * api-listen - we have an api listenening for the job poster to send the job description
 * api        - we recieve an api endpoint to query and it will return the job description
 */
export type SendJobDefinationLogicsticsTypes = 'api' | 'api-listen';

export interface SendJobDefinationLogicstics {
  type: SendJobDefinationLogicsticsTypes;
  args: {
    endpoint?: string;
  };
}

/**
 * api-listen - we have an api that listen for request from the job poster, so we can return the result to them
 * api        - we get an api to post the result to
 */
export type ReceiveJobResultLogicsticsTypes = 'api' | 'api-listen';

export interface ReceiveJobResultLogicstics {
  type: ReceiveJobResultLogicsticsTypes;
  args: {
    endpoint?: string;
  };
}

export type DockerAuth = {
  username?: string;
  password?: string;
  email?: string;
  server?: string;
};

export type JobDefinition = {
  version: string;
  type: JobType;
  logistics?: JobLogistics;
  deployment_id?: string;
  meta?: {
    trigger?: string;
    system_resources?: {
      [key: string]: string | number;
    };
    [key: string]: unknown;
  };
  global?: {
    image?: string;
    gpu?: boolean;
    entrypoint?: string | string[];
    env?: {
      [key: string]: string;
    };
    work_dir?: string;
  };
  ops: Ops;
};
export type JobType = 'container';

export type Operation<T extends OperationType> = {
  type: OperationType;
  id: string;
  args: OperationArgsMap[T];
  results?: OperationResults;
  execution?: Execution;
};

export type Execution = {
  group?: string;
  depends_on?: string[];
};

export interface OperationArgsMap {
  'container/run': {
    image: string;
    cmd?: string[] | string;
    volumes?: [
      {
        name: string;
        dest: string;
      },
    ];
    expose?: number | PortRangeString | UniqueExposedPorts;
    private?: boolean;
    gpu?: boolean;
    work_dir?: string;
    output?: string;
    entrypoint?: string | string[];
    env?: {
      [key: string]: string;
    };
    required_vram?: number;
    resources?: Resource[];
    authentication?: {
      docker?: DockerAuth;
    };
  };
  'container/create-volume': {
    name: string;
  };
}

export type OperationType = keyof OperationArgsMap;

export type StdOptions = 'stdin' | 'stdout' | 'stderr' | 'nodeerr';

export type OperationResults = {
  [key: string]: string | OperationResult;
};

export type OperationResult = {
  regex: string;
  logType: [StdOptions, StdOptions?, StdOptions?, StdOptions?];
};

/************************
 *   Job Result Types   *
 ************************/
export type FlowState = {
  status: string;
  startTime: number;
  endTime: number | null;
  errors?: Array<any>;
  opStates: Array<OpState>;
  secrets?: {
    [key: string]: string;
  };
};
export type Flow = {
  id: string;
  jobDefinition: JobDefinition;
  state: FlowState;
};

export type Log = {
  type: StdOptions;
  log: string | undefined;
};

export type OpState = {
  providerId: string | null;
  operationId: string | null;
  status: string | null;
  startTime: number | null;
  endTime: number | null;
  exitCode: number | null;
  logs: Array<Log>;
  results?: {
    [key: string]: string | string[];
  };
};

type UniqueById = tags.TagBase<{
  kind: 'uniqueBy';
  target: 'array';
  value: 'id';
  validate: `
    Array.isArray($input) && (()=>{
      const seen = new Set();
      for (const it of $input) {
        if (typeof it?.id !== "string") return false;
        if (seen.has(it.id)) return false;
        seen.add(it.id);
      }
      return true;
    })()
  `;
  message: 'ops[*].id must be unique';
}>;

type JobDefinitionWithRule = Omit<JobDefinition, 'ops'> & {
  ops: JobDefinition['ops'] & UniqueById;
};

export const validateJobDefinition =
  typia.createValidateEquals<JobDefinitionWithRule>();

export type Job = {
  ipfsJob: string;
  ipfsResult: string;
  market: PublicKey;
  node: string;
  payer: PublicKey;
  price: number;
  project: PublicKey;
  state: string | number;
  timeEnd: number;
  timeStart: number;
  timeout: number;
};

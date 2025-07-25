import { JobDefinition } from '../../../src';

export const NGINX_JOB: JobDefinition = {
  version: '0.1',
  type: 'container',
  meta: {
    trigger: 'deployment-manager',
  },
  ops: [
    {
      type: 'container/run',
      id: 'nginx',
      args: {
        cmd: [],
        image: 'nginx',
        expose: 80,
      },
    },
  ],
};

export const HELLO_JOB: JobDefinition = {
  version: '0.1',
  type: 'container',
  meta: {
    trigger: 'deployment-manager',
  },
  ops: [
    {
      type: 'container/run',
      id: 'hello-world',
      args: {
        cmd: 'echo hello world',
        image: 'ubuntu',
      },
    },
  ],
};

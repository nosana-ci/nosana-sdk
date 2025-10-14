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


export const OLLAMA_JOB: JobDefinition = {
  "ops": [
    {
      "id": "gpt-oss:20b",
      "args": {
        "gpu": true,
        "image": "docker.io/ollama/ollama:0.12.0",
        "expose": [
          {
            "port": 11434,
            "health_checks": [
              {
                "path": "/api/tags",
                "type": "http",
                "method": "GET",
                "continuous": false,
                "expected_status": 200
              }
            ]
          }
        ],
        "resources": [
          {
            "type": "Ollama",
            "model": "%%global.variables.MODEL%%"
          }
        ]
      },
      "type": "container/run"
    }
  ],
  "meta": {
    "trigger": "dashboard",
    "system_requirements": {
      "required_vram": 16
    }
  },
  "type": "container",
  "global": {
    "variables": {
      "MODEL": "gpt-oss:20b"
    }
  },
  "version": "0.1"
}
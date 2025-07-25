import { JobDefinition } from '../../../src';

export const bench: JobDefinition = {
  ops: [
    {
      id: 'generic_benchmark',
      args: {
        cmd: [
          '/bin/bash',
          '-c',
          'echo "Running bench..."; bench --benchmark generic --check-specs --check-gpu --version v1.0.3',
        ],
        env: {
          CUDA_VISIBLE_DEVICES: '0',
          CUBLAS_WORKSPACE_CONFIG: ':4096:8',
        },
        gpu: true,
        image: 'docker.io/nosana/nn:1.1.2',
        resources: [
          {
            url: 'https://models.nosana.io/hugging-face/llama3.1/8b/models--unsloth--Meta-Llama-3.1-8B',
            type: 'S3',
            target:
              '/root/.cache/huggingface/llama3.1/8b/models--unsloth--Meta-Llama-3.1-8B',
          },
        ],
      },
      type: 'container/run',
      results: {
        results_system_specs: '(?<=System specs: ).*',
        results_generic_benchmark: '(?<=Generic benchmark results: ).*',
      },
    },
    {
      id: 'nn_benchmark',
      args: {
        cmd: [
          '/bin/bash',
          '-c',
          'echo "Running gpu check"; if bench --check-gpu; then echo "Starting NN server..."; nn_server > /dev/null 2>&1 & sleep 30; echo "Running bench..."; bench --benchmark nn --url http://localhost:8000 --job-length 230 --check-gpu --version v1.0.1; else echo "GPU check failed. Printing nvidia-smi output:"; nvidia-smi; fi',
        ],
        env: {
          CUDA_VISIBLE_DEVICES: '0',
          CUBLAS_WORKSPACE_CONFIG: ':4096:8',
        },
        gpu: true,
        image: 'docker.io/nosana/nn:1.1.2',
      },
      type: 'container/run',
      results: {
        results_nn_benchmark: '(?<=NN benchmark results: ).*',
      },
    },
    {
      id: 'lmdepoy_llama_8b',
      args: {
        cmd: [
          '/bin/bash',
          '-c',
          'echo "Running gpu check"; if bench --check-gpu; then echo "Starting lmdeploy service..."; lmdeploy serve api_server ../../root/snapshots/069adfb3ab0ceba60b9af8f11fa51558b9f9d396 --model-name llama3.1_8B --chat-template /chat_template.json > /dev/null 2>&1 & sleep 30 & echo "Running lm-benchmark..." & bench --benchmark llm --url http://localhost:23333 --ping_correction --job-length 65 --model llama3.1_8B --timeout 10  --llm-framework lmdeploy --version v1.0.1; else echo "GPU check failed. Printing nvidia-smi output:"; nvidia-smi; fi',
        ],
        env: {
          CUDA_VISIBLE_DEVICES: '0',
          CUBLAS_WORKSPACE_CONFIG: ':4096:8',
        },
        gpu: true,
        image: 'docker.io/nosana/llm_benchmark-lmdeploy:1.0.7',
        resources: [
          {
            url: 'https://models.nosana.io/hugging-face/llama3.1/8b/models--unsloth--Meta-Llama-3.1-8B',
            type: 'S3',
            target: '/root/',
          },
        ],
      },
      type: 'container/run',
      results: {
        results_llm_benchmark: '(?<=LLM benchmark results: ).*',
      },
    },
  ],
  meta: {
    trigger: 'deployment-manager',
  },
  type: 'container',
  version: '0.1',
};

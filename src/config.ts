import type { SolanaConfig, IPFSConfig, SecretsConfig } from './types/index.js';

export const solanaConfigPreset: { [key: string]: SolanaConfig } = {
  mainnet: {
    network:
      'https://rpc.ironforge.network/mainnet?apiKey=01J4RYMAWZC65B6CND9DTZZ5BK',
    jobs_address: 'nosJhNRqr2bc9g1nfGDcXXTXvYUmxD4cVwy2pMWhrYM',
    nos_address: 'nosXBVoaCTtYdLvKY6Csb4AC8JCdQKKAaWYtx2ZMoo7',
    market_address: '7nxXoihx65yRGZiGzWZsFMz8D7qwxFePNKvDBWZnxc41',
    rewards_address: 'nosRB8DUV67oLNrL45bo2pFLrmsWPiewe2Lk2DRNYCp',
    nodes_address: 'nosNeZR64wiEhQc5j251bsP4WqDabT6hmz4PHyoHLGD',
    stake_address: 'nosScmHY2uR24Zh751PmGj9ww9QRNHewh9H59AfrTJE',
    pools_address: 'nosPdZrfDzND1LAR28FLMDEATUPK53K8xbRBXAirevD',
    pool_address: '6CJ9UPNnXzcwuLSE9ebTz4FPbBw1VXJkPxDgTi9ybHBj',
    priority_fee: 10000,
  },
  devnet: {
    network: 'devnet',
    jobs_address: 'nosJTmGQxvwXy23vng5UjkTbfv91Bzf9jEuro78dAGR',
    nos_address: 'devr1BGQndEW5k5zfvG5FsLyZv1Ap73vNgAHcQ9sUVP',
    market_address: '7nxXoihx65yRGZiGzWZsFMz8D7qwxFePNKvDBWZnxc41',
    rewards_address: 'nosRB8DUV67oLNrL45bo2pFLrmsWPiewe2Lk2DRNYCp',
    nodes_address: 'nosNeZR64wiEhQc5j251bsP4WqDabT6hmz4PHyoHLGD',
    stake_address: 'nosScmHY2uR24Zh751PmGj9ww9QRNHewh9H59AfrTJE',
    pools_address: 'nosPdZrfDzND1LAR28FLMDEATUPK53K8xbRBXAirevD',
    pool_address: '6CJ9UPNnXzcwuLSE9ebTz4FPbBw1VXJkPxDgTi9ybHBj',
  },
};

export const secretsConfigPreset: { [key: string]: SecretsConfig } = {
  mainnet: {
    manager: 'https://secrets.k8s.prd.nos.ci/',
  },
  devnet: {
    manager: 'https://secrets.k8s.dev.nos.ci/',
  },
};

export const IPFSConfigPreset: { [key: string]: IPFSConfig } = {
  mainnet: {
    api: 'https://api.pinata.cloud',
    jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJmZDUwODE1NS1jZDJhLTRlMzYtYWI4MC0wNmMxNjRmZWY1MTkiLCJlbWFpbCI6Implc3NlQG5vc2FuYS5pbyIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImlkIjoiRlJBMSIsImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxfV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiI1YzVhNWM2N2RlYWU2YzNhNzEwOCIsInNjb3BlZEtleVNlY3JldCI6ImYxOWFjZDUyZDk4ZTczNjU5MmEyY2IzZjQwYWUxNGE2ZmYyYTkxNDJjZTRiN2EzZGQ5OTYyOTliMmJkN2IzYzEiLCJpYXQiOjE2ODY3NzE5Nzl9.r4_pWCCT79Jis6L3eegjdBdAt5MpVd1ymDkBuNE25g8',
    gateway: 'https://nosana.mypinata.cloud/ipfs/',
  },
  devnet: {
    api: 'https://api.pinata.cloud',
    jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJmZDUwODE1NS1jZDJhLTRlMzYtYWI4MC0wNmMxNjRmZWY1MTkiLCJlbWFpbCI6Implc3NlQG5vc2FuYS5pbyIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImlkIjoiRlJBMSIsImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxfV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiI1YzVhNWM2N2RlYWU2YzNhNzEwOCIsInNjb3BlZEtleVNlY3JldCI6ImYxOWFjZDUyZDk4ZTczNjU5MmEyY2IzZjQwYWUxNGE2ZmYyYTkxNDJjZTRiN2EzZGQ5OTYyOTliMmJkN2IzYzEiLCJpYXQiOjE2ODY3NzE5Nzl9.r4_pWCCT79Jis6L3eegjdBdAt5MpVd1ymDkBuNE25g8',
    gateway: 'https://nosana.mypinata.cloud/ipfs/',
  },
};

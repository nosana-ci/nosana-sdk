import type { SolanaConfig, IPFSConfig, ApiConfig } from './types/index.js';

// Mainnet pool rotation schedule. Each entry becomes active at its start timestamp (unix seconds).
const MAINNET_POOL_SCHEDULE: Array<{ address: string; start: number }> = [
  { address: 'HES33F37n7sUkweDubLzs9NaSxKpRVPnuELGB4WQdmmx', start: 1764331620 },
  { address: '2w8zWwG2XKD9P645iFbFAgAsXSgvvoRPpMGUpi1qG8hr', start: 1766959620 },
  { address: '9BRAdxFX67FLbZ1wYoLyckvAJwEV24SmDVp6FehorPm2', start: 1769587620 },
  { address: '4s8abV6djWVvncmRVL9DHQ6e4nm1aXrxQ6ZZ1ZeVgZ5B', start: 1772215620 },
  { address: 'Dq17LmmA1bxmSEfGpJpGu9sPiQQpm7zgk2M7GGMw2pdw', start: 1774843620 },
  { address: '5SdnB8ZMqqfVKPUHFqx3KVfx4Aj4y352uCe8C71GHUqU', start: 1777471620 },
];

// Select the current pool based on the time. Before the first start, keep the existing default.
const resolveMainnetPoolAddress = (nowSec: number = Math.floor(Date.now() / 1000)): string => {
  let selected: string | undefined;
  for (const entry of MAINNET_POOL_SCHEDULE) {
    if (nowSec >= entry.start) {
      selected = entry.address;
    } else {
      break;
    }
  }
  // Fallback to the previous default pool before any scheduled start kicks in
  return selected ?? 'Djy1xNoPnuUdHUTCkzEDQkxo3EpPJxXU7GbXEHXJfcEB';
};

export const apiConfigPreset: { [key: string]: Omit<ApiConfig, "authorization"> } = {
  mainnet: {
    backend_url: 'https://dashboard.k8s.prd.nos.ci',
  },
  devnet: {
    backend_url: 'https://dashboard.k8s.dev.nos.ci',
  },
};

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
    pool_address: resolveMainnetPoolAddress(),
    priority_fee: 10000,
    dynamicPriorityFee: true,
    priorityFeeStrategy: 'medium',
    maximumPriorityFee: 15000000,
  } as SolanaConfig,
  devnet: {
    network: 'devnet',
    jobs_address: 'nosJTmGQxvwXy23vng5UjkTbfv91Bzf9jEuro78dAGR',
    nos_address: 'devr1BGQndEW5k5zfvG5FsLyZv1Ap73vNgAHcQ9sUVP',
    market_address: '7nxXoihx65yRGZiGzWZsFMz8D7qwxFePNKvDBWZnxc41',
    rewards_address: 'nosRB8DUV67oLNrL45bo2pFLrmsWPiewe2Lk2DRNYCp',
    nodes_address: 'nosNeZR64wiEhQc5j251bsP4WqDabT6hmz4PHyoHLGD',
    stake_address: 'nosScmHY2uR24Zh751PmGj9ww9QRNHewh9H59AfrTJE',
    pools_address: 'nosPdZrfDzND1LAR28FLMDEATUPK53K8xbRBXAirevD',
    pool_address: 'miF9saGY5WS747oia48WR3CMFZMAGG8xt6ajB7rdV3e',
    dynamicPriorityFee: false,
    priorityFeeStrategy: 'medium',
    maximumPriorityFee: 50000000,
  } as SolanaConfig,
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

export const sourceMintPreset: { [key: string]: { SOL: string; USDC?: string; USDT?: string } } = {
  mainnet: {
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  },
  devnet: {
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  },
};

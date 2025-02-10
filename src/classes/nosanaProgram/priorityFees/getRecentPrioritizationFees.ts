import { PublicKey } from '@solana/web3.js';

import { SOURCE_MINTS } from '../../../config';

const SOL_MINT = new PublicKey(SOURCE_MINTS.SOL);
const USDC_MINT = new PublicKey(SOURCE_MINTS.USDC);

export const getRecentPrioritizationFees = async (
  network: string,
): Promise<
  {
    prioritizationFee: number;
  }[]
> => {
  const resp = await fetch(network, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getRecentPrioritizationFees',
      params: [[SOL_MINT.toBase58(), USDC_MINT.toBase58()]],
    }),
  });
  const json = await resp.json();

  return json?.result || [];
};

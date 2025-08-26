import { PublicKey } from '@solana/web3.js';

import { sourceMintPreset } from '../../../config.js';

const SOL_MINT = new PublicKey(sourceMintPreset.mainnet.SOL);
const USDC_MINT = new PublicKey(sourceMintPreset.mainnet.USDC!);

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

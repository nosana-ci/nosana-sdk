import { PublicKey } from '@solana/web3.js';

const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

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
      params: [SOL_MINT.toBase58(), USDC_MINT.toBase58()],
    }),
  });
  const json = await resp.json();

  return json?.result || [];
};

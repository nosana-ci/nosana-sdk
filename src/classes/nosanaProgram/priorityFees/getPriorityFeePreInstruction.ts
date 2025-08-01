import { ComputeBudgetProgram, TransactionInstruction } from '@solana/web3.js';

import { getPriorityFee } from './getPriorityFee.js';
import { SolanaConfig } from '../../../client.js';

export async function getPriorityFeePreInstruction(
  config: SolanaConfig,
  useFancyFees = false,
): Promise<TransactionInstruction[]> {
  const { priority_fee: MINIMUM_PRIORITY_FEE = 0 } = config;

  const preInstructions: TransactionInstruction[] = [];

  const priorityFee = useFancyFees
    ? MINIMUM_PRIORITY_FEE
    : await getPriorityFee(config);

  if (priorityFee && priorityFee > 0) {
    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFee,
    });
    preInstructions.push(addPriorityFee);
  }

  return preInstructions;
}

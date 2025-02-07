import { ComputeBudgetProgram, TransactionInstruction } from '@solana/web3.js';
import { getPriorityFee } from './getPriorityFee';
import { configSelector } from '../../../client';

export async function getPriorityFeePreInstruction(
  useFancyFees = false,
): Promise<TransactionInstruction[]> {
  const { priority_fee: MINIMUM_PRIORITY_FEE = 0 } =
    configSelector().solanaConfig;

  const preInstructions: TransactionInstruction[] = [];

  const priorityFee = useFancyFees
    ? MINIMUM_PRIORITY_FEE
    : await getPriorityFee();

  if (priorityFee && priorityFee < 0) {
    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFee,
    });
    preInstructions.push(addPriorityFee);
  }

  return preInstructions;
}

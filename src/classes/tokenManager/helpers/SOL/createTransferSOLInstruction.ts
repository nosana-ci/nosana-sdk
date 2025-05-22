import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';

import { ConnectionSelector } from '../../../connection/selector';

export async function createTransferSOLInstruction(
  amount: number,
  source: PublicKey,
  destination: PublicKey,
  transaction: Transaction,
) {
  const connection = ConnectionSelector();

  const balance = await connection.getBalance(source);

  if (balance < amount) {
    throw new Error('Insufficient SOL balance.');
  }

  transaction.add(
    SystemProgram.transfer({
      fromPubkey: source,
      toPubkey: destination,
      lamports: amount === 0 ? balance : amount,
    }),
  );
}

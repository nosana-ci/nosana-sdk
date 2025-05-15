import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';

import { ConnectionSelector } from '../../../../classes/connection/selector';

export async function topupSol(
  amount: number,
  destination: PublicKey,
  wallet: Wallet,
  transaction: Transaction,
) {
  const connection = ConnectionSelector();

  const balance = await connection.getBalance(wallet.publicKey);

  if (balance < amount) {
    throw new Error('Insufficient SOL balance.');
  }

  transaction.add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: destination,
      lamports: amount,
    }),
  );
}

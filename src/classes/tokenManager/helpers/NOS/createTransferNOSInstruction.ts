import { PublicKey, Transaction } from '@solana/web3.js';

import { ConnectionSelector } from '../../../connection/selector';
import { getNosTokenAddressForAccount } from './getNosTokenAddressForAccount';
import { addNosToTransaction } from './addNosTransaction';

export async function createTransferNOSInstruction(
  amount: number,
  source: PublicKey,
  destination: PublicKey,
  payer: PublicKey,
  transaction: Transaction,
) {
  const connection = ConnectionSelector();

  const { account: sourceTokenAccount, balance } =
    await getNosTokenAddressForAccount(source, connection);

  if (balance === null) {
    throw new Error('NOS token account does not exist on source');
  }

  if (balance < amount) {
    throw new Error('Insufficient NOS balance.');
  }

  const { account: destinationTokenAccount, balance: destinationBalance } =
    await getNosTokenAddressForAccount(destination, connection);

  await addNosToTransaction(
    amount === 0 ? balance : amount,
    {
      account: source,
      tokenAccount: sourceTokenAccount,
    },
    {
      account: destination,
      tokenAccount: destinationTokenAccount,
    },
    payer,
    destinationBalance === null,
    transaction,
  );
}

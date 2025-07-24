import { Connection, PublicKey, Transaction } from '@solana/web3.js';

import { getNosTokenAddressForAccount } from './getNosTokenAddressForAccount.js';
import { addNosToTransaction } from './addNosTransaction.js';

export async function createTransferNOSInstruction(
  amount: number,
  source: PublicKey,
  destination: PublicKey,
  payer: PublicKey,
  transaction: Transaction,
  nos_address: string,
  connection: Connection,
) {
  const { account: sourceTokenAccount, balance } =
    await getNosTokenAddressForAccount(source, nos_address, connection);

  if (balance === null) {
    throw new Error('NOS token account does not exist on source');
  }

  if (balance < amount) {
    throw new Error('Insufficient NOS balance.');
  }

  const { account: destinationTokenAccount, balance: destinationBalance } =
    await getNosTokenAddressForAccount(destination, nos_address, connection);

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
    nos_address,
  );
}

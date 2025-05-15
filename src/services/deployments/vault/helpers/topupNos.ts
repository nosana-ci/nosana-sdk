import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
} from '@solana/spl-token';
import { Wallet } from '@coral-xyz/anchor';

import { Config } from '../../../../config';
import { ConnectionSelector } from '../../../../classes/connection/selector';

export async function getNosTokenAddressForAccount(
  account: PublicKey,
  connection: Connection,
): Promise<{ account: PublicKey; balance: number | null }> {
  const tokenAccount = getAssociatedTokenAddressSync(
    new PublicKey(new Config().solanaConfig.nos_address),
    account,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  try {
    const tokenBalance = await connection!.getTokenAccountBalance(tokenAccount);

    return {
      account: tokenAccount,
      balance: parseInt(tokenBalance.value.amount),
    };
  } catch {
    return {
      account: tokenAccount,
      balance: null,
    };
  }
}

export async function sendNosTokens(
  amount: number,
  sourceTokenAccount: PublicKey,
  destinationAccount: PublicKey,
  destinationTokenAccount: PublicKey,
  payer: Wallet,
  createDesinationNosATA: boolean,
  transaction: Transaction,
) {
  if (createDesinationNosATA) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        destinationTokenAccount,
        destinationAccount,
        new PublicKey(new Config().solanaConfig.nos_address),
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
    );
  }

  transaction.add(
    createTransferInstruction(
      sourceTokenAccount,
      destinationTokenAccount,
      payer.publicKey,
      amount,
    ),
  );
}

export async function topupNos(
  amount: number,
  destination: PublicKey,
  payer: Wallet,
  transaction: Transaction,
) {
  const connection = ConnectionSelector();

  const { account: sourceTokenAccount, balance } =
    await getNosTokenAddressForAccount(payer.publicKey, connection);

  if (balance === null) {
    throw new Error('NOS token account does not exist on source');
  }

  if (balance < amount) {
    throw new Error('Insufficient NOS balance.');
  }

  const { account: destinationTokenAccount, balance: destinationBalance } =
    await getNosTokenAddressForAccount(destination, connection);

  await sendNosTokens(
    amount,
    sourceTokenAccount,
    destination,
    destinationTokenAccount,
    payer,
    destinationBalance === null,
    transaction,
  );
}

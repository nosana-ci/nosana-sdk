import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { PublicKey, Transaction } from '@solana/web3.js';

import { Config } from '../../../../../config';

export async function addNosToTransaction(
  amount: number,
  source: {
    account: PublicKey;
    tokenAccount: PublicKey;
  },
  destination: {
    account: PublicKey;
    tokenAccount: PublicKey;
  },
  payer: PublicKey,
  createDesinationNosATA: boolean,
  transaction: Transaction,
) {
  if (createDesinationNosATA) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        payer,
        destination.tokenAccount,
        destination.account,
        new PublicKey(new Config().solanaConfig.nos_address),
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
    );
  }

  transaction.add(
    createTransferInstruction(
      source.tokenAccount,
      destination.tokenAccount,
      payer,
      amount,
    ),
  );
}

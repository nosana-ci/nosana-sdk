import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { PublicKey, Transaction } from '@solana/web3.js';

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
  createDestinationNosATA: boolean,
  transaction: Transaction,
  nos_address: string,
) {
  if (createDestinationNosATA) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        payer,
        destination.tokenAccount,
        destination.account,
        new PublicKey(nos_address),
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
    );
  }

  transaction.add(
    createTransferInstruction(
      source.tokenAccount,
      destination.tokenAccount,
      source.account,
      amount,
    ),
  );
}

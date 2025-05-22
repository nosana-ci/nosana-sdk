import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';

import { Config } from '../../../../../config';

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

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';

export async function getNosTokenAddressForAccount(
  account: PublicKey,
  nos_address: string,
  connection: Connection,
): Promise<{ account: PublicKey; balance: number | null }> {
  const tokenAccount = getAssociatedTokenAddressSync(
    new PublicKey(nos_address),
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

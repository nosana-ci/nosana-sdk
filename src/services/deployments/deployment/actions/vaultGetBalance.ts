import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

import { getNosTokenAddressForAccount } from '../../../../classes/tokenManager/helpers/NOS/getNosTokenAddressForAccount.js';

interface VaultGetBalanceOptions {
  connection: Connection;
  nos_address: string;
}

/**
 * @throws Error if the vault is not initialized
 * @throws Error if there is an error fetching the balance
 * @returns Promise<{ SOL: number; NOS: number }>
 * @description Fetches the balance of the vault in SOL and NOS.
 * It updates the balance in the backend and returns the current balance.
 */
export async function vaultGetBalance(
  publicKey: PublicKey,
  { connection, nos_address }: VaultGetBalanceOptions,
): Promise<{ SOL: number; NOS: number }> {
  const solBalance = await connection.getBalance(publicKey);
  const { balance } = await getNosTokenAddressForAccount(
    publicKey,
    nos_address,
    connection,
  );

  return {
    SOL: solBalance / LAMPORTS_PER_SOL,
    NOS: balance ? balance / 1e6 : 0,
  };
}

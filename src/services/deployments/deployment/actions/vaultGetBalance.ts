import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

import { QueryClient } from '../../client/index.js';
import { errorFormatter } from '../../../../utils/errorFormatter.js';
import { getNosTokenAddressForAccount } from '../../../../classes/tokenManager/helpers/NOS/getNosTokenAddressForAccount.js';

interface VaultGetBalanceOptions {
  client: QueryClient;
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
  { client, connection, nos_address }: VaultGetBalanceOptions,
): Promise<{ SOL: number; NOS: number }> {
  const solBalance = await connection.getBalance(publicKey);
  const { balance } = await getNosTokenAddressForAccount(
    publicKey,
    nos_address,
    connection,
  );

  try {
    await client.PATCH('/api/vault/{vault}/update-balance', {
      params: { path: { vault: publicKey.toBase58() } },
      json: {
        sol_balance: solBalance / LAMPORTS_PER_SOL,
        nos_balance: balance ? balance / 1e6 : 0,
      },
    });
  } catch (error) {
    console.error(errorFormatter('Failed to update balance.', error));
  }

  return {
    SOL: solBalance / LAMPORTS_PER_SOL,
    NOS: balance ? balance / 1e6 : 0,
  };
}

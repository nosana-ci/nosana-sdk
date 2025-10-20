import { Wallet } from '@coral-xyz/anchor';
import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';

import { QueryClient } from '../../client/index.js';
import { errorFormatter } from '../../../../utils/errorFormatter.js';

interface VaultWithdrawOptions {
  client: QueryClient;
  connection: Connection;
}

/**
 * @throws Error if there is an error withdrawing from the vault
 * @returns Promise<void>
 * @description Withdraws all tokens from the vault.
 * It sends a transaction to withdraw the SOL and NOS from the vault.
 */
export async function vaultWithdraw(
  publicKey: PublicKey,
  wallet: Wallet,
  { client, connection }: VaultWithdrawOptions,
) {
  const { data, error } = await client.POST('/api/deployments/vaults/{vault}/withdraw', {
    params: {
      path: { vault: publicKey.toString() },
    },
    body: {
      SOL: undefined,
      NOS: undefined,
    },
  });
  if (error || !data) {
    throw errorFormatter('Failed to withdraw from vault');
  }
  const transaction = VersionedTransaction.deserialize(
    new Uint8Array(Buffer.from(data.transaction, 'base64')),
  );
  transaction.sign([wallet.payer]);
  try {
    const signature = await connection.sendTransaction(transaction);
    const latestBlockHash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature,
    });
  } catch (error) {
    errorFormatter('Vault withdrawal transaction failed.', error);
  }
}

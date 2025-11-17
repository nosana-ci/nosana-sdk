import { AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';

import type { QueryClient } from '../../../../client/index.js';
import { errorFormatter } from '../../../../utils/errorFormatter.js';

interface VaultWithdrawOptions {
  client: QueryClient;
  connection: Connection;
  provider: AnchorProvider
}

/**
 * @throws Error if there is an error withdrawing from the vault
 * @returns Promise<void>
 * @description Withdraws all tokens from the vault.
 * It sends a transaction to withdraw the SOL and NOS from the vault.
 */
export async function vaultWithdraw(
  publicKey: PublicKey,
  { client, connection, provider }: VaultWithdrawOptions,
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

  try {
    const signedTransaction = await provider.wallet.signTransaction(transaction);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize(),
      {
        skipPreflight: false,
        maxRetries: 5,
      },
    );

    await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature,
    }, 'processed');
  } catch (error) {
    errorFormatter('Vault withdrawal transaction failed.', error);
  }
}

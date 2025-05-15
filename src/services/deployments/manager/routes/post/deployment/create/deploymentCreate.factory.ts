import fs from 'fs';
import solana from '@solana/web3.js';

import {
  DeploymentDocument,
  DeploymentStatus,
  VaultDocument,
} from '../../../../types.js';
import { DeploymentCreateRequest } from './deploymentCreate.types.js';
import { getNosTokenAddressForAccount } from '../../../../../vault/helpers/topupNos.js';
import { ConnectionSelector } from '../../../../../../../classes/connection/selector.js';

export async function createAndStoreVault(
  owner: string,
  created_at: Date,
): Promise<VaultDocument> {
  const connection = ConnectionSelector();
  const vault = solana.Keypair.generate();

  fs.writeFileSync(
    `/.nosana/vault/${vault.publicKey.toString()}.json`,
    JSON.stringify(Buffer.from(vault.secretKey).toJSON().data),
  );

  const { account } = await getNosTokenAddressForAccount(
    vault.publicKey,
    connection,
  );

  return {
    vault: vault.publicKey.toString(),
    owner,
    sol: 0,
    nos: 0,
    nos_ata: account.toString(),
    created_at,
    updated_at: created_at,
  };
}

export function createDeplyoment(
  { name, market, ipfs_definition_hash, replicas }: DeploymentCreateRequest,
  vault: string,
  owner: string,
  created_at: Date,
): DeploymentDocument {
  return {
    id: solana.Keypair.generate().publicKey.toString(),
    vault,
    name,
    market,
    ipfs_definition_hash,
    replicas,
    owner,
    status: DeploymentStatus.DRAFT,
    active_jobs: [],
    past_jobs: [],
    created_at,
    updated_at: created_at,
  };
}

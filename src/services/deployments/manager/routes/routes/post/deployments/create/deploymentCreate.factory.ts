import fs from 'fs';
import solana from '@solana/web3.js';

import { VAULT_PATH } from '../../../../../definitions/vault.js';
import { DeploymentCreateRequest } from './deploymentCreate.types.js';
import { ConnectionSelector } from '../../../../../../../../classes/connection/selector.js';
import { getNosTokenAddressForAccount } from '../../../../../../../../classes/tokenManager/helpers/NOS/getNosTokenAddressForAccount.js';

import {
  DeploymentDocument,
  DeploymentStatus,
  DeploymentStrategy,
  VaultDocument,
  VaultStatus,
} from '../../../../../types.js';

export async function createAndStoreVault(
  owner: string,
  created_at: Date,
): Promise<VaultDocument> {
  const connection = ConnectionSelector();
  const vault = solana.Keypair.generate();

  fs.writeFileSync(
    `${VAULT_PATH}${vault.publicKey.toString()}.json`,
    JSON.stringify(Buffer.from(vault.secretKey).toJSON().data),
  );

  const { account } = await getNosTokenAddressForAccount(
    vault.publicKey,
    connection,
  );

  return {
    vault: vault.publicKey.toString(),
    status: VaultStatus.OPEN,
    owner,
    sol: 0,
    nos: 0,
    nos_ata: account.toString(),
    created_at,
    updated_at: created_at,
  };
}

export function createDeployment(
  {
    name,
    market,
    ipfs_definition_hash,
    replicas,
    strategy,
    schedule,
    timeout,
  }: DeploymentCreateRequest,
  vault: string,
  owner: string,
  created_at: Date,
): DeploymentDocument {
  const baseFields = {
    id: solana.Keypair.generate().publicKey.toString(),
    vault,
    name,
    market,
    owner,
    status: DeploymentStatus.DRAFT,
    ipfs_definition_hash,
    replicas,
    timeout,
    created_at,
    updated_at: created_at,
  };

  if (strategy === DeploymentStrategy.SCHEDULED) {
    return {
      ...baseFields,
      strategy,
      schedule,
    };
  }

  return {
    ...baseFields,
    strategy,
    schedule: undefined,
  };
}

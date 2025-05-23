export const ErrorsMessages = {
  generic: {
    SOMETHING_WENT_WRONG: 'Ops something went wrong, please again.',
  },
  deployments: {
    NOT_FOUND: 'Deployment not found.',
    ARCHIVED: 'Cannot modify an archived deployment.',
    FAILED_STARTING: 'Failed to start deployment.',
    FAILED_TO_ARCHIVE: 'Failed to archive deployment.',
    FAILED_TIMOUT_UPDATE: 'Failed to update deployment timoeut.',
    INCORRECT_STATE: 'Deployment is in the incorrect state.',
  },
  vaults: {
    NOT_FOUND: 'Vault not found.',
    NOT_EMPTY: 'Vault must be empty. Please withdraw all funds.',
    FAILED_TO_ARCHIVE: 'Failed to archive vault.',
    FAILED_TO_FIND_KEY: 'Could not find vault.',
    FAILED_TO_UPDATE_BALANCE: 'Could not update vaults balance.',
  },
};

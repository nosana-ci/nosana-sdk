import fs from 'fs';
import os from 'os';

import { Client } from '../../../src';

export const createTestClient = () => {
  return new Client(
    'mainnet',
    fs.readFileSync(os.homedir() + '/.nosana/nosana_key.json', 'utf8'),
    {
      deplyoments: {
        backend_url: 'https://deployment-manager.k8s.dev.nos.ci',
      },
    },
  );
};

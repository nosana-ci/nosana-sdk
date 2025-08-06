import fs from 'fs';
import os from 'os';

import { Client } from '../../../src/index.js';

export const createTestClient = () => {
  return new Client(
    'mainnet',
    fs.readFileSync(os.homedir() + '/.nosana/nosana_key.json', 'utf8'),
  );
};

import path from 'path';
import { fileURLToPath } from 'url';
import { Worker as NodeWorker, WorkerOptions } from 'worker_threads';

export class Worker extends NodeWorker {
  constructor(fileName: string | URL, options: WorkerOptions) {
    if (typeof fileName === 'string') {
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      fileName = path.resolve(__dirname, fileName);
    }

    super(fileName, options);
  }
}

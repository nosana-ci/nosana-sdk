import { Db, MongoClient } from 'mongodb';

const DB_NAME = 'nosana_deployments';

export async function DeploymentsConnection(): Promise<Db> {
  let client: MongoClient | undefined = undefined;

  if (!client) {
    const mongo = new MongoClient(
      process.env.MONGODB_URI || 'mongodb://127.0.0.2:27017',
    );
    // TODO: Handle connection errors and retries
    client = await mongo.connect();
  }

  return client.db(DB_NAME);
}

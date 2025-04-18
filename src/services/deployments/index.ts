import { Collection, MongoClient } from 'mongodb';

type Deployment = {
  id: string;
  name: string;
  status: string;
};

export async function Deployments() {
  let client: MongoClient | undefined = undefined;
  let deployments: Collection<Deployment> | undefined = undefined;

  if (!client || !deployments) {
    const mongo = new MongoClient(
      process.env.MONGODB_URI || 'mongodb://localhost:27017',
    );
    client = await mongo.connect();
    deployments = client.db('deployments_db').collection('deployments');
  }

  const deploymentsStream = deployments.watch();

  for await (const change of deploymentsStream) {
    console.log('Change detected in deployments collection:', change);
    // Handle the change event here
    // For example, you can send a notification or update a cache
  }
}

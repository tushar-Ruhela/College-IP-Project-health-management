import { MongoClient, Db, MongoClientOptions } from 'mongodb';

// Use provided connection string or environment variable
// Note: If password contains special characters like @, they should be URL encoded (%40)
const defaultUri = 'mongodb+srv://admin:qwertyuiopP%402@cluster0.f4kkx0u.mongodb.net/health-Management-system?appName=Cluster0';
const uri: string = process.env.MONGODB_URI || defaultUri;

// MongoDB connection options with proper SSL/TLS configuration
const options: MongoClientOptions = {
  // SSL/TLS options for MongoDB Atlas
  tls: true,
  tlsAllowInvalidCertificates: false,
  // Connection pool options
  maxPoolSize: 10,
  minPoolSize: 1,
  // Retry options
  retryWrites: true,
  retryReads: true,
  // Server selection timeout
  serverSelectionTimeoutMS: 5000,
  // Socket timeout
  socketTimeoutMS: 45000,
  // Connection timeout
  connectTimeoutMS: 10000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

/**
 * Get the database instance
 */
export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db('health-Management-system');
}

/**
 * Get reminders collection
 */
export async function getRemindersCollection() {
  const db = await getDatabase();
  return db.collection('reminders');
}


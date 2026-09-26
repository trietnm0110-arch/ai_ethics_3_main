import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not configured');

const pool = new Pool({ connectionString: databaseUrl, max: 1 });

export const db = drizzle({ client: pool, schema });

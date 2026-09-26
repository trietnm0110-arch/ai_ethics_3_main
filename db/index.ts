import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

const databaseUrl = process.env.DATABASE_URL?.trim();

export const db = databaseUrl
	? drizzle({ client: new Pool({ connectionString: databaseUrl, max: 1 }), schema })
	: null;

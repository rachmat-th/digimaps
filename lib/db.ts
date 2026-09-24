import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface Business {
  id: number;
  nama: string;
  lokasi: string | null;
  maps_url: string | null;
  email: string | null;
  kontak: string | null;
  website: string | null;
  search_query: string | null;
  scraped_at: Date;
  created_at: Date;
  updated_at: Date;
}

export async function getAllBusinesses(): Promise<Business[]> {
  const result = await pool.query(
    'SELECT * FROM businesses ORDER BY created_at DESC'
  );
  return result.rows;
}

export async function insertBusiness(business: Omit<Business, 'id' | 'created_at' | 'updated_at'>): Promise<Business> {
  const result = await pool.query(
    `INSERT INTO businesses (nama, lokasi, maps_url, email, kontak, website, search_query, scraped_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      business.nama, 
      business.lokasi,
      business.maps_url,
      business.email, 
      business.kontak, 
      business.website, 
      business.search_query,
      business.scraped_at || new Date()
    ]
  );
  return result.rows[0];
}

export async function clearAllBusinesses(): Promise<void> {
  await pool.query('DELETE FROM businesses');
}

export default pool;

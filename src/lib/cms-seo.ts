import { sql, type Kysely } from 'kysely';

interface CmsSeo {
  title: string | null;
  description: string | null;
  image: string | null;
  canonical: string | null;
  noIndex: boolean;
}

interface CmsSeoRow {
  seo_title: string | null;
  seo_description: string | null;
  seo_image: string | null;
  seo_canonical: string | null;
  seo_no_index: number | boolean | null;
}

interface CmsSeoEntryData {
  id: string;
  seo?: CmsSeo | null;
}

interface CmsSeoEntry {
  data: CmsSeoEntryData;
  seo?: CmsSeo | null;
}

function getLocalEmDashDb(locals: unknown) {
  return (locals as { emdash?: { db?: Kysely<any> } } | undefined)?.emdash?.db;
}

async function getAmbientEmDashDb() {
  const { getDb } = await import('emdash/runtime');
  return getDb();
}

function noIndexFromRow(value: CmsSeoRow['seo_no_index']) {
  return value === true || value === 1;
}

export async function hydrateCmsSeo<TEntry extends CmsSeoEntry>(
  locals: unknown,
  collection: string,
  entry: TEntry,
) {
  try {
    const db = getLocalEmDashDb(locals) ?? await getAmbientEmDashDb();
    const result = await sql<CmsSeoRow>`
      SELECT seo_title, seo_description, seo_image, seo_canonical, seo_no_index
      FROM _emdash_seo
      WHERE collection = ${collection}
      AND content_id = ${entry.data.id}
      LIMIT 1
    `.execute(db);
    const row = result.rows[0];
    if (!row) return entry;

    const seo: CmsSeo = {
      title: row.seo_title,
      description: row.seo_description,
      image: row.seo_image,
      canonical: row.seo_canonical,
      noIndex: noIndexFromRow(row.seo_no_index),
    };

    return {
      ...entry,
      seo,
      data: {
        ...entry.data,
        seo,
      },
    };
  } catch (error) {
    console.warn(`[cms-seo] Could not hydrate SEO for ${collection}/${entry.data.id}`, error);
    return entry;
  }
}

import 'dotenv/config';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import postgres from 'postgres';

const MIGRATIONS_DIR = resolve('drizzle/migrations');
const journal = JSON.parse(
  readFileSync(resolve(MIGRATIONS_DIR, 'meta/_journal.json'), 'utf8'),
);

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

try {
  const [last] =
    await sql`select created_at from drizzle.__drizzle_migrations order by created_at desc limit 1`;
  const lastMillis = last ? Number(last.created_at) : 0;

  for (const entry of journal.entries) {
    if (entry.when <= lastMillis) continue;

    const file = resolve(MIGRATIONS_DIR, `${entry.tag}.sql`);
    const content = readFileSync(file, 'utf8');
    const hash = createHash('sha256').update(content).digest('hex');

    const statements = content
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`Applying ${entry.tag} (${statements.length} statements)...`);
    // Run each statement in its own implicit transaction so that newly added
    // enum values are committed before any later statement uses them.
    for (const stmt of statements) {
      await sql.unsafe(stmt);
    }

    await sql`insert into drizzle.__drizzle_migrations (hash, created_at) values (${hash}, ${entry.when})`;
    console.log(`  done: ${entry.tag}`);
  }

  console.log('All pending migrations applied.');
} catch (e) {
  console.error('MIGRATION ERROR:', e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}

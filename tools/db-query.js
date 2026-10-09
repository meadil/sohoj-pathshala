#!/usr/bin/env node
/**
 * Read-only-by-default query runner for the Supabase Postgres database.
 *
 *   node tools/db-query.js "SELECT * FROM courses LIMIT 5"
 *   node tools/db-query.js @path/to/file.sql
 *
 * Reads SUPABASE_DB_URL from the project .env. That URL MUST be the IPv4
 * pooler (session mode) string, e.g.
 *   postgresql://postgres.<REF>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres
 * The direct `db.<REF>.supabase.co` host is IPv6-only on newer projects and
 * will fail with ENOTFOUND on an IPv4-only machine.
 *
 * Notes:
 *  - pg_notice messages (RAISE NOTICE) are printed, so DO-block assertions work.
 *  - `$` and `$$` are safe here because SQL is read from a file when it
 *    contains them; inline SQL goes through argv, so prefer @file for anything
 *    with dollar-quoting.
 *  - `.env` and this runner are the only things that touch credentials; the
 *    connection string must never be committed.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');

// pg lives in the project's node_modules; resolve it from there explicitly so
// this script works regardless of the current working directory.
let Client;
try {
  ({ Client } = require(path.join(ROOT, 'node_modules', 'pg')));
} catch {
  console.error('pg is not installed. Run:  npm install --save-dev pg');
  process.exit(1);
}

function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && !(key in out)) out[key] = value;
  }
  return out;
}

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node tools/db-query.js "<sql>" | @file.sql');
  process.exit(1);
}

const env = loadEnv(ENV_PATH);
if (!env.SUPABASE_DB_URL) {
  console.error('SUPABASE_DB_URL is missing or empty in .env');
  process.exit(1);
}

let sql;
if (arg.startsWith('@')) {
  const file = path.resolve(ROOT, arg.slice(1).trim().replace(/^"|"$/g, ''));
  if (!fs.existsSync(file)) {
    console.error(`No such file: ${file}`);
    process.exit(1);
  }
  sql = fs.readFileSync(file, 'utf8');
} else {
  sql = arg;
}

(async () => {
  const client = new Client({
    connectionString: env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  client.on('notice', (n) => console.log(`NOTICE: ${n.message}`));

  try {
    await client.connect();
    const res = await client.query(sql);
    if (Array.isArray(res.rows)) {
      console.log(`rows: ${res.rowCount}`);
      console.log(JSON.stringify(res.rows, null, 2));
    } else {
      console.log(res.command ? `${res.command} OK` : 'OK');
    }
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();

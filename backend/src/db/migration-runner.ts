import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationDir = path.resolve(__dirname, "migrations");

const ensureMigrationsTable = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

export const runMigrations = async (): Promise<void> => {
  await ensureMigrationsTable();

  const files = (await fs.readdir(migrationDir))
    .filter((name) => name.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const exists = await pool.query<{ exists: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE filename = $1) AS exists",
      [file],
    );
    if (exists.rows[0]?.exists) {
      continue;
    }

    const sqlPath = path.join(migrationDir, file);
    const sql = await fs.readFile(sqlPath, "utf-8");
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await pool.query("COMMIT");
      console.info(`Applied migration: ${file}`);
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }
};

export const runSeed = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_seeds (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const seedDir = path.resolve(__dirname, "seeds");
  const files = (await fs.readdir(seedDir))
    .filter((name) => name.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const exists = await pool.query<{ exists: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM schema_seeds WHERE filename = $1) AS exists",
      [file],
    );
    if (exists.rows[0]?.exists) {
      continue;
    }

    const sqlPath = path.join(seedDir, file);
    const sql = await fs.readFile(sqlPath, "utf-8");
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO schema_seeds (filename) VALUES ($1)", [file]);
      await pool.query("COMMIT");
      console.info(`Applied seed: ${file}`);
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }
};

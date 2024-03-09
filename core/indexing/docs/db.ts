import { Database, open } from "sqlite";
import sqlite3 from "sqlite3";
import { Chunk } from "../..";
import { getDocsSqlitePath, getLanceDbPath } from "../../util/paths";
import { SqliteDb } from "../refreshIndex";

import { downloadPreIndexedDocs } from "./preIndexed";
import {
  default as configs,
  default as preIndexedDocs,
} from "./preIndexedDocs";

const DOCS_TABLE_NAME = "docs";

interface LanceDbDocsRow {
  title: string;
  baseUrl: string;
  // Chunk
  content: string;
  path: string;
  startLine: number;
  endLine: number;
  vector: number[];
  [key: string]: any;
}

async function createDocsTable(db: Database<sqlite3.Database>) {
  db.exec(`CREATE TABLE IF NOT EXISTS docs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title STRING NOT NULL,
        baseUrl STRING NOT NULL UNIQUE
    )`);
}

export async function retrieveDocs(
  baseUrl: string,
  vector: number[],
  nRetrieve: number,
  embeddingsProviderId: string,
  nested: boolean = false,
): Promise<Chunk[]> {
  const lancedb = await import("vectordb");
  const db = await SqliteDb.get();
  await createDocsTable(db);
  const lance = await lancedb.connect(getLanceDbPath());

  const downloadDocs = async () => {
    const config = configs.find((config) => config.startUrl === baseUrl);
    if (config) {
      await downloadPreIndexedDocs(embeddingsProviderId, config.title);
      return await retrieveDocs(
        baseUrl,
        vector,
        nRetrieve,
        embeddingsProviderId,
        true,
      );
    }
    return undefined;
  };

  const tableNames = await lance.tableNames();
  if (
    !tableNames.includes(DOCS_TABLE_NAME) &&
    preIndexedDocs.includes(baseUrl)
  ) {
    const downloaded = await downloadDocs();
    if (downloaded) return downloaded;
  }

  const table = await lance.openTable(DOCS_TABLE_NAME);
  let docs: LanceDbDocsRow[] = await table
    .search(vector)
    .limit(nRetrieve)
    .where(`baseUrl = '${baseUrl}'`)
    .execute();

  docs = docs.filter((doc) => doc.baseUrl === baseUrl);

  if (
    (!docs || docs.length === 0) &&
    !nested &&
    preIndexedDocs.includes(baseUrl)
  ) {
    const downloaded = await downloadDocs();
    if (downloaded) return downloaded;
  }

  return docs.map((doc) => ({
    digest: doc.path,
    filepath: doc.path,
    startLine: doc.startLine,
    endLine: doc.endLine,
    index: 0,
    content: doc.content,
    otherMetadata: {
      title: doc.title,
    },
  }));
}

export async function addDocs(
  title: string,
  baseUrl: URL,
  chunks: Chunk[],
  embeddings: number[][],
) {
  const data: LanceDbDocsRow[] = chunks.map((chunk, i) => ({
    title: chunk.otherMetadata?.title || title,
    baseUrl: baseUrl.toString(),
    content: chunk.content,
    path: chunk.filepath,
    startLine: chunk.startLine,
    endLine: chunk.endLine,
    vector: embeddings[i],
  }));

  const lancedb = await import("vectordb");
  const lance = await lancedb.connect(getLanceDbPath());
  const tableNames = await lance.tableNames();
  if (!tableNames.includes(DOCS_TABLE_NAME)) {
    await lance.createTable(DOCS_TABLE_NAME, data);
  } else {
    const table = await lance.openTable(DOCS_TABLE_NAME);
    await table.add(data);
  }

  // Only after add it to SQLite
  const db = await open({
    filename: getDocsSqlitePath(),
    driver: sqlite3.Database,
  });
  await createDocsTable(db);
  await db.run(
    `INSERT INTO docs (title, baseUrl) VALUES (?, ?)`,
    title,
    baseUrl.toString(),
  );
}

export async function listDocs(): Promise<
  { title: string; baseUrl: string }[]
> {
  const db = await open({
    filename: getDocsSqlitePath(),
    driver: sqlite3.Database,
  });
  await createDocsTable(db);
  const docs = await db.all(`SELECT title, baseUrl FROM docs`);
  return docs;
}

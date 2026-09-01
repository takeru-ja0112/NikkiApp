import { openDB, type IDBPDatabase } from "idb";
import type { NikkiDB } from "./schema";

const DB_NAME = "nikkiapp-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<NikkiDB>> | undefined;

export function getDB(): Promise<IDBPDatabase<NikkiDB>> {
  if (typeof window === "undefined") {
    throw new Error("getDB() はブラウザ環境でのみ呼び出せます");
  }

  if (!dbPromise) {
    dbPromise = openDB<NikkiDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("entries", { keyPath: "id" });
        store.createIndex("by-createdAt", "createdAt");
      },
    });
  }

  return dbPromise;
}

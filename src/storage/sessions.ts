/**
 * UX Doctor - IndexedDB Oturum Depolama Modülü (idb)
 *
 * Kullanıcı oturumlarını, rrweb DOM mutasyonlarını, tıklama izlerini
 * ve sürtünme analizlerini yerel olarak IndexedDB'de saklar.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { RecordedEvent } from '../recorder/event-recorder';
import { FrustrationEvent } from '../recorder/frustration-detector';

export interface Session {
  id: string;
  url: string;
  title: string;
  startTime: number;
  duration: number;
  taskName: string;
  events: RecordedEvent[];
  rrwebEvents: any[];
  frustrationCount: number;
  frustrations: FrustrationEvent[];
}

interface UXDoctorDB extends DBSchema {
  sessions: {
    key: string;
    value: Session;
    indexes: { 'by-startTime': number };
  };
}

const DB_NAME = 'ux-doctor-storage';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<UXDoctorDB>> | null = null;

function getDB(): Promise<IDBPDatabase<UXDoctorDB>> {
  if (!dbPromise) {
    dbPromise = openDB<UXDoctorDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('sessions')) {
          const store = db.createObjectStore('sessions', { keyPath: 'id' });
          store.createIndex('by-startTime', 'startTime');
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Yeni bir oturumu IndexedDB'ye kaydeder.
 */
export async function saveSession(session: Session): Promise<string> {
  const db = await getDB();
  await db.put('sessions', session);
  return session.id;
}

/**
 * Kayıtlı tüm oturumları en yeniden eskiye doğru listeler.
 */
export async function getSessions(): Promise<Session[]> {
  try {
    const db = await getDB();
    const sessions = await db.getAllFromIndex('sessions', 'by-startTime');
    return sessions.reverse();
  } catch (error) {
    console.error('[UX Doctor] Oturumlar yüklenirken hata:', error);
    return [];
  }
}

/**
 * ID'ye göre tek bir oturum getirir.
 */
export async function getSessionById(id: string): Promise<Session | undefined> {
  const db = await getDB();
  return db.get('sessions', id);
}

/**
 * Belirtilen ID'deki oturumu siler.
 */
export async function deleteSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('sessions', id);
}

/**
 * Tüm oturumları temizler.
 */
export async function clearAllSessions(): Promise<void> {
  const db = await getDB();
  await db.clear('sessions');
}

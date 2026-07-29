const STATE_KEY = "alejandro:state:v2";
const DB_NAME = "sistema-alejandro";
const PHOTO_STORE = "progress-photos";

export function readStoredState<T>(fallback: T): T {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<T>;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export function writeStoredState<T>(state: T) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type StoredPhoto = {
  id: string;
  date: string;
  view: string;
  name: string;
  type: string;
  blob: Blob;
};

export type LoadedPhoto = {
  id: string;
  date: string;
  view: string;
  url: string;
};

function openPhotoDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PHOTO_STORE)) {
        database.createObjectStore(PHOTO_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function savePhotoFile(input: {
  id: string;
  date: string;
  view: string;
  file: File;
}) {
  const database = await openPhotoDatabase();
  const transaction = database.transaction(PHOTO_STORE, "readwrite");
  transaction.objectStore(PHOTO_STORE).put({
    id: input.id,
    date: input.date,
    view: input.view,
    name: input.file.name,
    type: input.file.type,
    blob: input.file,
  } satisfies StoredPhoto);
  await transactionDone(transaction);
  database.close();
}

export async function loadPhotoFiles(): Promise<LoadedPhoto[]> {
  const database = await openPhotoDatabase();
  const records = await new Promise<StoredPhoto[]>((resolve, reject) => {
    const request = database.transaction(PHOTO_STORE, "readonly").objectStore(PHOTO_STORE).getAll();
    request.onsuccess = () => resolve(request.result as StoredPhoto[]);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return records
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((record) => ({
      id: record.id,
      date: record.date,
      view: record.view,
      url: URL.createObjectURL(record.blob),
    }));
}

export async function loadPhotoUploadPayload(id: string) {
  const database = await openPhotoDatabase();
  const record = await new Promise<StoredPhoto | undefined>((resolve, reject) => {
    const request = database.transaction(PHOTO_STORE, "readonly").objectStore(PHOTO_STORE).get(id);
    request.onsuccess = () => resolve(request.result as StoredPhoto | undefined);
    request.onerror = () => reject(request.error);
  });
  database.close();
  if (!record) throw new Error("No se encontró la foto local pendiente.");
  return {
    id: record.id,
    date: record.date,
    view: record.view,
    name: record.name,
    type: record.type,
    dataUrl: await blobToDataUrl(record.blob),
  };
}

export async function deletePhotoFile(id: string) {
  const database = await openPhotoDatabase();
  const transaction = database.transaction(PHOTO_STORE, "readwrite");
  transaction.objectStore(PHOTO_STORE).delete(id);
  await transactionDone(transaction);
  database.close();
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(",");
  const mime = header.match(/data:([^;]+)/)?.[1] || "application/octet-stream";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

export async function createBackup<T>(state: T) {
  const database = await openPhotoDatabase();
  const records = await new Promise<StoredPhoto[]>((resolve, reject) => {
    const request = database.transaction(PHOTO_STORE, "readonly").objectStore(PHOTO_STORE).getAll();
    request.onsuccess = () => resolve(request.result as StoredPhoto[]);
    request.onerror = () => reject(request.error);
  });
  database.close();
  const photos = await Promise.all(records.map(async (record) => ({
    id: record.id,
    date: record.date,
    view: record.view,
    name: record.name,
    type: record.type,
    dataUrl: await blobToDataUrl(record.blob),
  })));
  return {
    format: "sistema-alejandro-backup",
    version: 2,
    exportedAt: new Date().toISOString(),
    state,
    photos,
  };
}

export async function restoreBackup<T>(file: File): Promise<T> {
  const parsed = JSON.parse(await file.text()) as {
    format: string;
    version: number;
    state: T;
    photos?: Array<{ id: string; date: string; view: string; name: string; type: string; dataUrl: string }>;
  };
  if (parsed.format !== "sistema-alejandro-backup" || parsed.version !== 2 || !parsed.state) {
    throw new Error("El archivo no es un respaldo compatible.");
  }
  const database = await openPhotoDatabase();
  const transaction = database.transaction(PHOTO_STORE, "readwrite");
  const store = transaction.objectStore(PHOTO_STORE);
  store.clear();
  for (const photo of parsed.photos || []) {
    store.put({
      id: photo.id,
      date: photo.date,
      view: photo.view,
      name: photo.name,
      type: photo.type,
      blob: dataUrlToBlob(photo.dataUrl),
    } satisfies StoredPhoto);
  }
  await transactionDone(transaction);
  database.close();
  writeStoredState(parsed.state);
  return parsed.state;
}

import { firebaseConfig } from './firebase-config.js';

const SDK_VERSION = '12.19.0';
const SDK_BASE = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;

let servicesPromise = null;
let currentUser = null;
let serverOffsetMs = 0;
let clockUnsubscribe = null;

async function loadServices() {
  if (servicesPromise) return servicesPromise;

  servicesPromise = Promise.all([
    import(`${SDK_BASE}/firebase-app.js`),
    import(`${SDK_BASE}/firebase-auth.js`),
    import(`${SDK_BASE}/firebase-database.js`),
  ]).then(([appSdk, authSdk, databaseSdk]) => {
    const app = appSdk.getApps().length
      ? appSdk.getApp()
      : appSdk.initializeApp(firebaseConfig);
    const auth = authSdk.getAuth(app);
    const database = databaseSdk.getDatabase(app);
    return { app, auth, database, authSdk, databaseSdk };
  }).catch((error) => {
    servicesPromise = null;
    throw new Error('Firebase에 연결할 수 없습니다. 네트워크를 확인해주세요.', { cause: error });
  });

  return servicesPromise;
}

function startServerClock(services) {
  if (clockUnsubscribe) return;
  const offsetRef = services.databaseSdk.ref(services.database, '.info/serverTimeOffset');
  clockUnsubscribe = services.databaseSdk.onValue(offsetRef, (snapshot) => {
    serverOffsetMs = Number(snapshot.val()) || 0;
  });
}

export async function ensureAnonymousUser() {
  const services = await loadServices();
  await services.authSdk.setPersistence(
    services.auth,
    services.authSdk.browserLocalPersistence,
  );

  if (!services.auth.currentUser) {
    await services.authSdk.signInAnonymously(services.auth);
  }

  currentUser = services.auth.currentUser;
  startServerClock(services);
  return currentUser;
}

export function getClientUid() {
  return currentUser?.uid || null;
}

export function getServerNow() {
  return Date.now() + serverOffsetMs;
}

export async function getFirebaseServices() {
  await ensureAnonymousUser();
  return loadServices();
}

export function getRealtimeDatabase() {
  if (!servicesPromise) {
    throw new Error('Firebase가 아직 초기화되지 않았습니다.');
  }
  return servicesPromise.then(({ database }) => database);
}

export async function subscribeConnection(callback) {
  const services = await getFirebaseServices();
  const connectedRef = services.databaseSdk.ref(services.database, '.info/connected');
  return services.databaseSdk.onValue(connectedRef, (snapshot) => {
    callback(snapshot.val() === true);
  });
}

import { createSession } from "protobase"

const initialContext = { state: "pending", group: { workspaces: [] } }

async function logoutCinnyClean() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("cinny_")) {
      localStorage.removeItem(key);
    }
  }

  if (indexedDB.databases) {
    const dbs = await indexedDB.databases();
    dbs.forEach((db) => {
      if (db.name && db.name.startsWith("matrix-js-sdk::")) {
        indexedDB.deleteDatabase(db.name);
      }
    });
  } else {
    indexedDB.deleteDatabase("matrix-js-sdk::matrix-sdk-crypto");
    indexedDB.deleteDatabase("matrix-js-sdk::web-sync-store");
    indexedDB.deleteDatabase("matrix-js-sdk::account-data");
  }
}

export const clearSession = (setSession, setSessionContext) => {
    setSession(createSession())
    setSessionContext(initialContext)
    logoutCinnyClean()
}

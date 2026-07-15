// Native KVStorage adapter for @joy-curry/core.
//
// Core's KVStorage contract is SYNCHRONOUS (window.localStorage on web), but
// both native stores are async. Bridge: hydrate an in-memory cache once at
// startup (createNativeStorage), then serve sync reads from the cache and
// write through to the native store in the background.
//
// Key routing (Agent 04/08 rule — tokens never live in AsyncStorage):
//   jc_auth (JWT session)        → expo-secure-store (iOS Keychain / Android Keystore)
//   everything else (cart, prefs) → @react-native-async-storage/async-storage
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { KVStorage } from '@joy-curry/core';

// Keys that must live in secure storage. SecureStore can't enumerate keys, so
// any NEW secure key added to core must be listed here to be hydrated.
// (AsyncStorage keys need no registration — getAllKeys() hydrates them all.)
const SECURE_KEYS = ['jc_auth'] as const;

function isSecureKey(key: string): boolean {
  return (SECURE_KEYS as readonly string[]).includes(key);
}

function logWriteError(op: string, key: string) {
  return (err: unknown) => {
    if (__DEV__) console.warn(`[storage] ${op}(${key}) failed:`, err);
  };
}

/** Hydrates the cache from SecureStore + AsyncStorage, then returns a
 *  synchronous KVStorage. Call once, BEFORE initCore() — core's stores read
 *  their persisted state during initCore's hydration hooks. Never throws:
 *  unreadable values degrade to "not persisted" rather than blocking launch. */
export async function createNativeStorage(): Promise<KVStorage> {
  const cache = new Map<string, string>();

  await Promise.all([
    ...SECURE_KEYS.map(async (key) => {
      try {
        const value = await SecureStore.getItemAsync(key);
        if (value !== null) cache.set(key, value);
      } catch (err) {
        logWriteError('hydrate', key)(err);
      }
    }),
    (async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const pairs = await AsyncStorage.multiGet(keys);
        for (const [key, value] of pairs) {
          if (value !== null && !isSecureKey(key)) cache.set(key, value);
        }
      } catch (err) {
        logWriteError('hydrate', 'AsyncStorage')(err);
      }
    })(),
  ]);

  return {
    getItem: (key) => cache.get(key) ?? null,
    setItem: (key, value) => {
      cache.set(key, value);
      if (isSecureKey(key)) {
        SecureStore.setItemAsync(key, value).catch(logWriteError('setItem', key));
      } else {
        AsyncStorage.setItem(key, value).catch(logWriteError('setItem', key));
      }
    },
    removeItem: (key) => {
      cache.delete(key);
      if (isSecureKey(key)) {
        SecureStore.deleteItemAsync(key).catch(logWriteError('removeItem', key));
      } else {
        AsyncStorage.removeItem(key).catch(logWriteError('removeItem', key));
      }
    },
  };
}

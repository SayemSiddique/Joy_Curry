import { useEffect, useState } from 'react';
import type { ReadableAtom } from 'nanostores';

// Same plain-subscribe hook the web islands use (they avoid @nanostores/react
// for React 19 compatibility; we keep the pattern identical so behavior and
// re-render timing match across platforms).
export function useNano<T>(store: ReadableAtom<T>): T {
  const [val, setVal] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setVal), [store]);
  return val;
}

// Deep-link alias: joycurry://menu[?category=<id>] → the menu (index) screen.
//
// The menu lives at the app root (/); this alias gives external/marketing links
// a stable `menu` path and forwards an optional category so the menu opens
// scrolled to that section (index.tsx reads the `category` param).
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function MenuDeepLink() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  return <Redirect href={category ? { pathname: '/', params: { category } } : '/'} />;
}

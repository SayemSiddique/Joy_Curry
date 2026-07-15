// Deep-link entry: joycurry://order/<id> → the order tracker.
//
// Push notifications and shared/external links use the natural `order/<id>`
// shape; the tracker screen lives at /track?id=<id>, so this route just
// redirects. Keeping a dedicated route (rather than pointing the link straight
// at /track) means the public deep-link contract is stable even if the tracker
// screen is renamed.
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function OrderDeepLink() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  if (!id) return <Redirect href="/orders" />;
  return <Redirect href={{ pathname: '/track', params: { id } }} />;
}

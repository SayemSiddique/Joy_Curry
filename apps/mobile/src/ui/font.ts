// Rubik is loaded in app/_layout.tsx via @expo-google-fonts/rubik. RN custom
// fonts are addressed by the loaded face name (fontWeight does not select
// faces of a loaded family on Android), so styles use these instead of
// fontWeight — the numeric weights in @joy-curry/tokens map 1:1 to faces.
export const font = {
  regular: 'Rubik_400Regular',
  medium: 'Rubik_500Medium',
  bold: 'Rubik_700Bold',
  black: 'Rubik_900Black',
} as const;

// No loaders yet. `{}` (not Record<string, never>) so that AuthContext & LoaderContext
// stays exactly AuthContext; replace it with real loader types as you add them.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type LoaderContext = {};

export function loaderContext(): LoaderContext {
  return {};
}

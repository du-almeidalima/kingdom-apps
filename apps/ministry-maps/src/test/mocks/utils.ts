
/** Builds a given object with a base object and overrides some of its properties */
export const mockBuilderFn = <T>(base: T, override: Partial<T>): T => {
  return {
    ...base,
    ...override
  }
}

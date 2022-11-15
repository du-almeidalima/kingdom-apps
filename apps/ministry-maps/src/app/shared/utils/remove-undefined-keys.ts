/**
 * This function removes undefined keys. Useful for avoid Firebase Undefined errors.
 *
 * Warning: This function mutates the object
 * @param obj
 */
export const removeUndefinedKeys = (obj: any) => {
  Object.keys(obj).forEach(key => (obj[key] === undefined ? delete obj[key] : {}));
};

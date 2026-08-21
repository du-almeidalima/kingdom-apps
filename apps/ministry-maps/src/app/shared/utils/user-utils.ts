export const getUserInitials = (name: string | undefined) => {
  if (!name) return 'XX';

  const splitWords = name.trim().split(/\s+/).filter(Boolean);
  if (splitWords.length === 0) return 'XX';

  return splitWords.length > 1 ? splitWords[0][0] + splitWords[1][0] : splitWords[0].substring(0, 2);
};

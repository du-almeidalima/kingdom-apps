export const getUserInitials = (name: string | undefined) => {
  if (!name) return 'XX';

  const splitWords = name.split(' ');
  return splitWords.length > 1 ? splitWords[0][0] + splitWords[1][0] : splitWords[0].substring(0, 2);
};

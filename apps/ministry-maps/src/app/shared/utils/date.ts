export const differenceInMonths = (firstDate: Date, secondDate: Date): number => {
  let months;
  months = (secondDate.getFullYear() - firstDate.getFullYear()) * 12;
  months -= firstDate.getMonth();
  months += secondDate.getMonth();

  return months <= 0 ? 0 : months;
}

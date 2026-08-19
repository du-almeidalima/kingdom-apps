export type GroupKind = 'pair' | 'trio';

export interface WorkGroup {
  kind: GroupKind;
  men: number;
  women: number;
  size: number; // 2 or 3
  label: string; // 'MM' | 'WW' | 'WWW' | 'MMM' | 'WWM'
}

export interface GroupPlan {
  groups: WorkGroup[];
  pairs: number;
  trios: number;
  people: number; // people actually placed into groups
  unplacedMen: number; // a lone man with no valid partner
  unplacedWomen: number; // a lone woman with no valid partner
}

/**
 * Forms preaching work groups from a headcount of men and women. Every group is
 * SAME-SEX, because the working unit is a pair and a woman can never pair with a man:
 *  - pairs are MM or WW,
 *  - an odd count is absorbed into a same-sex trio (WWW or MMM),
 *  - a lone person with no same-sex partner (a single man, or a single woman) is
 *    reported as unplaced rather than forced into a mixed pair.
 */
export function formGroups(men: number, women: number): GroupPlan {
  const menCount = Math.max(0, Math.floor(men) || 0);
  const womenCount = Math.max(0, Math.floor(women) || 0);

  const mk = (w: number, m: number): WorkGroup => {
    const size = w + m;
    return { kind: size === 3 ? 'trio' : 'pair', men: m, women: w, size, label: 'W'.repeat(w) + 'M'.repeat(m) };
  };

  let wwCount = Math.floor(womenCount / 2);
  let mmCount = Math.floor(menCount / 2);
  const wLeft = womenCount % 2;
  const mLeft = menCount % 2;

  let unplacedMen = 0;
  let unplacedWomen = 0;
  let makeWWW = 0;
  let makeMMM = 0;

  // A leftover woman joins an existing women-pair -> WWW (same-sex trio).
  if (wLeft) {
    if (wwCount > 0) {
      makeWWW = 1;
      wwCount -= 1;
    } else {
      unplacedWomen = 1; // only one woman, no women-pair to join
    }
  }

  // A leftover man joins a men-pair -> MMM (same-sex trio); a lone man with no other men
  // cannot be placed (he can't pair with a woman).
  if (mLeft) {
    if (mmCount > 0) {
      makeMMM = 1;
      mmCount -= 1;
    } else {
      unplacedMen = 1;
    }
  }

  const groups: WorkGroup[] = [];
  for (let i = 0; i < wwCount; i++) groups.push(mk(2, 0));
  for (let i = 0; i < mmCount; i++) groups.push(mk(0, 2));
  for (let i = 0; i < makeWWW; i++) groups.push(mk(3, 0));
  for (let i = 0; i < makeMMM; i++) groups.push(mk(0, 3));

  const pairs = groups.filter(g => g.kind === 'pair').length;
  const trios = groups.filter(g => g.kind === 'trio').length;
  const people = groups.reduce((sum, g) => sum + g.size, 0);

  return { groups, pairs, trios, people, unplacedMen, unplacedWomen };
}

/** Makeup of a single group by gender, e.g. "2H", "2M", "1H+2M" (H=homem, M=mulher). */
export function groupMakeup(group: { men: number; women: number }): string {
  const parts: string[] = [];
  if (group.men) parts.push(`${group.men}H`);
  if (group.women) parts.push(`${group.women}M`);
  return parts.join('+');
}

/** Short PT-BR summary like "6 duplas + 1 trio". */
export function describeGroups(plan: { pairs: number; trios: number }): string {
  const parts: string[] = [];
  if (plan.pairs) parts.push(`${plan.pairs} ${plan.pairs === 1 ? 'dupla' : 'duplas'}`);
  if (plan.trios) parts.push(`${plan.trios} ${plan.trios === 1 ? 'trio' : 'trios'}`);
  return parts.join(' + ') || 'nenhuma dupla';
}

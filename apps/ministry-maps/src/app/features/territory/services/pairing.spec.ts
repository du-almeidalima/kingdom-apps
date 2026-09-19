import { formGroups, describeGroups, groupMakeup } from './pairing';

describe('formGroups', () => {
  it('pairs everyone same-sex when counts are even', () => {
    const p = formGroups(12, 8); // 6 MM + 4 WW
    expect(p.pairs).toBe(10);
    expect(p.trios).toBe(0);
    expect(p.people).toBe(20);
    expect(p.groups.every(g => g.label === 'MM' || g.label === 'WW')).toBe(true);
  });

  it('absorbs an odd man into an all-men trio when men-pairs exist', () => {
    const p = formGroups(7, 8); // WW*4, MM*3 -> one MM becomes MMM
    expect(p.pairs).toBe(6);
    expect(p.trios).toBe(1);
    expect(p.groups.filter(g => g.label === 'MMM')).toHaveLength(1);
    expect(p.people).toBe(15);
    expect(p.unplacedMen).toBe(0);
  });

  it('makes both a women-trio and a men-trio when both counts are odd', () => {
    const p = formGroups(5, 5); // WW*2->1WW+1WWW ; MM*2->1MM+1MMM
    expect(p.pairs).toBe(2);
    expect(p.trios).toBe(2);
    expect(p.groups.filter(g => g.label === 'WWW')).toHaveLength(1);
    expect(p.groups.filter(g => g.label === 'MMM')).toHaveLength(1);
  });

  it('leaves a lone man unplaced when there is no other man (pairs are same-sex)', () => {
    const p = formGroups(1, 2); // 1 WW pair; the single man cannot pair with a woman
    expect(p.pairs).toBe(1);
    expect(p.trios).toBe(0);
    expect(p.groups.every(g => g.label === 'WW')).toBe(true);
    expect(p.unplacedMen).toBe(1);
  });

  it('never forms a mixed group', () => {
    for (let m = 0; m <= 12; m++) {
      for (let w = 0; w <= 12; w++) {
        const p = formGroups(m, w);
        expect(p.groups.every(g => g.men === 0 || g.women === 0)).toBe(true);
      }
    }
  });

  it('reports a genuinely unpairable lone person', () => {
    expect(formGroups(1, 0).unplacedMen).toBe(1);
    expect(formGroups(0, 1).unplacedWomen).toBe(1);
  });

  it('never makes a man+woman pair', () => {
    for (let m = 0; m <= 12; m++) {
      for (let w = 0; w <= 12; w++) {
        const p = formGroups(m, w);
        expect(p.groups.some(g => g.kind === 'pair' && g.men === 1 && g.women === 1)).toBe(false);
        // every person is either placed or explicitly unplaced (no one lost)
        expect(p.people + p.unplacedMen + p.unplacedWomen).toBe(m + w);
      }
    }
  });

  it('describes the composition in PT-BR', () => {
    expect(describeGroups({ pairs: 6, trios: 1 })).toBe('6 duplas + 1 trio');
    expect(describeGroups({ pairs: 1, trios: 0 })).toBe('1 dupla');
    expect(describeGroups({ pairs: 0, trios: 2 })).toBe('2 trios');
  });

  it('labels each group makeup by gender', () => {
    expect(groupMakeup({ men: 2, women: 0 })).toBe('2H');
    expect(groupMakeup({ men: 0, women: 2 })).toBe('2M');
    expect(groupMakeup({ men: 3, women: 0 })).toBe('3H');
    expect(groupMakeup({ men: 0, women: 3 })).toBe('3M');
  });
});

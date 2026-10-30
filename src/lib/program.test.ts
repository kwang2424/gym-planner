import { describe, expect, it } from 'vitest';
import { DAYS, EXERCISES } from './program';

describe('program definition', () => {
  const slots = DAYS.flatMap((d) => d.slots);

  it('every slot and swap points at a real exercise', () => {
    for (const slot of slots) {
      const ex = EXERCISES[slot.exerciseId];
      expect(ex, slot.exerciseId).toBeDefined();
      for (const id of ex.swaps ?? []) expect(EXERCISES[id], `${ex.id} -> ${id}`).toBeDefined();
    }
  });

  it('slot keys are unique', () => {
    const keys = slots.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('has no landmine or overhead pressing', () => {
    const used = new Set(slots.flatMap((s) => [s.exerciseId, ...(EXERCISES[s.exerciseId].swaps ?? [])]));
    expect(used.has('landmine_press')).toBe(false);
    expect([...used].some((id) => /ohp|overhead/.test(id))).toBe(false);
  });

  it('Upper A has chest-supported lateral raises; Upper B has incline press and pushdowns', () => {
    expect(DAYS[1].slots.map((s) => s.exerciseId)).toContain('cs_lateral_raise');
    expect(DAYS[3].slots.map((s) => s.exerciseId)).toEqual(expect.arrayContaining(['incline_db', 'pushdown']));
  });

  it('Upper A puts pull-ups right after bench', () => {
    expect(DAYS[1].slots.slice(0, 2).map((s) => s.exerciseId)).toEqual(['bench', 'pullup']);
  });
});

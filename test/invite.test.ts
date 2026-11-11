import { describe, expect, test } from 'vitest';
import { formatInviteCode, generateInviteCode, normalizeInviteCode } from '../src/invite';

describe("codes d'invitation", () => {
  test('longueur 10 et alphabet sans caractères ambigus', () => {
    for (let i = 0; i < 200; i++) {
      const c = generateInviteCode();
      expect(c).toHaveLength(10);
      expect(c).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/);
    }
  });

  test('deux codes successifs sont différents', () => {
    expect(generateInviteCode()).not.toBe(generateInviteCode());
  });

  test('formatage et normalisation sont inverses', () => {
    const c = generateInviteCode();
    expect(formatInviteCode(c)).toMatch(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/);
    expect(normalizeInviteCode(formatInviteCode(c))).toBe(c);
  });

  test('la saisie utilisateur est normalisée (minuscules, espaces, tirets)', () => {
    expect(normalizeInviteCode(' ab3de-fgh2k ')).toBe('AB3DEFGH2K');
  });
});

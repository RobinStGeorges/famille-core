export type ThemeChoice = 'auto' | 'light' | 'dark';
const KEY = 'famille.theme';

export function getThemeChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* stockage indisponible : on garde « auto » */
  }
  return 'auto';
}

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
}

export function setThemeChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    /* ignoré */
  }
  applyTheme(choice);
}

/** À appeler au démarrage. Le choix est partagé par toutes les apps (même domaine). */
export function initTheme(): void {
  applyTheme(getThemeChoice());
}

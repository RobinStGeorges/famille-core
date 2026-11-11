export type ThemeChoice = 'auto' | 'light' | 'dark';
export declare function getThemeChoice(): ThemeChoice;
export declare function applyTheme(choice: ThemeChoice): void;
export declare function setThemeChoice(choice: ThemeChoice): void;
/** À appeler au démarrage. Le choix est partagé par toutes les apps (même domaine). */
export declare function initTheme(): void;

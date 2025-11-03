import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="px-2.5 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 border-2 border-transparent hover:border-gray-300 dark:hover:border-slate-600 transition-all duration-200 focus:outline-none focus:ring-0 active:scale-95 select-none flex items-center justify-center"
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      type="button"
    >
      {theme === 'light' ? (
        <span className="material-symbols-outlined text-xl select-none leading-none">dark_mode</span>
      ) : (
        <span className="material-symbols-outlined text-xl select-none leading-none">light_mode</span>
      )}
    </button>
  );
}


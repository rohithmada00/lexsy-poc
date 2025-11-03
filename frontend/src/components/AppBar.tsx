import ThemeToggle from './ThemeToggle';

export default function AppBar() {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-emerald-600 shadow-md">
            <span className="material-symbols-outlined text-white text-xl">
              gavel
            </span>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-emerald-600 dark:from-blue-400 dark:to-emerald-400 bg-clip-text text-transparent">
            Lexsy
          </h1>
        </div>
        <div className="flex items-center">
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}


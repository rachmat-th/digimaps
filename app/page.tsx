import SearchForm from "@/components/search-form";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[url('/bg.jpg')] bg-cover bg-center bg-no-repeat dark:bg-none dark:bg-zinc-950">
      {/* Ultra-minimal header - responsive */}
      <header className="relative z-10 flex items-center justify-end gap-2 px-3 py-3 sm:px-6 sm:py-4">
        <a 
          href="/database" 
          className="group flex items-center gap-1.5 sm:gap-2 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-zinc-900 transition-all bg-white/40 backdrop-blur-md hover:bg-white/60 dark:bg-zinc-800/40 dark:backdrop-blur-md dark:text-white dark:hover:bg-zinc-700/60"
        >
          <svg 
            className="h-3.5 w-3.5 sm:h-4 sm:w-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={2} 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
          </svg>
          <span className="hidden xs:inline">Database</span>
        </a>
        
        <ThemeToggle />
      </header>

      {/* Centered content - Google style - responsive */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 sm:px-6">
        <SearchForm />
      </main>

      {/* Minimal footer - responsive */}
      <footer className="relative z-10 py-3 sm:py-4 text-center text-[10px] sm:text-xs text-white dark:text-zinc-500">
        Digimaps versi 1.0
      </footer>
    </div>
  );
}

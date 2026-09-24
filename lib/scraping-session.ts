/**
 * Simple in-memory session lock for scraping
 * Prevents multiple concurrent scraping processes
 */

interface ScrapingSession {
  isRunning: boolean;
  startedAt: number | null;
  keyword: string | null;
  city: string | null;
}

let currentSession: ScrapingSession = {
  isRunning: false,
  startedAt: null,
  keyword: null,
  city: null,
};

export function startSession(keyword: string, city: string): boolean {
  if (currentSession.isRunning) {
    return false; // Already running
  }

  currentSession = {
    isRunning: true,
    startedAt: Date.now(),
    keyword,
    city,
  };

  return true;
}

export function endSession(): void {
  currentSession = {
    isRunning: false,
    startedAt: null,
    keyword: null,
    city: null,
  };
}

export function getSession(): ScrapingSession {
  return { ...currentSession };
}

export function isSessionRunning(): boolean {
  return currentSession.isRunning;
}

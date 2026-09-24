# Digimaps - Google Maps Business Scraper

Ultra-clean web application for scraping business data from Google Maps with beautiful UI/UX.

## Features

- 🎨 **Beautiful UI** - Google-like minimalist design with dark mode
- 🔍 **Smart Scraping** - Playwright-powered scraper with stealth mode
- 💾 **PostgreSQL Database** - Reliable data storage with full CRUD
- 📊 **Data Management** - Filter by search query & location, export to CSV
- 🌙 **Dark Mode** - Seamless light/dark theme switching
- 📱 **Responsive** - Works on all devices

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Next.js API Routes, PostgreSQL
- **Scraper**: Python 3, Playwright, BeautifulSoup4
- **Database**: PostgreSQL with `pg` driver

## Getting Started

### Prerequisites

- Node.js 18+ 
- Python 3.8+
- PostgreSQL 14+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd digimaps
   ```

2. **Install Node dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies**
   ```bash
   # Create virtual environment
   python3 -m venv venv
   
   # Install dependencies in venv
   ./venv/bin/pip install -r scripts/requirements.txt
   
   # Install Playwright browser
   ./venv/bin/playwright install chromium
   ```

4. **Setup PostgreSQL Database**
   ```bash
   # Create database
   psql -U postgres
   CREATE DATABASE digimaps;
   
   # Create table
   psql -U your_user -d digimaps
   ```
   ```sql
   CREATE TABLE businesses (
       id SERIAL PRIMARY KEY,
       nama VARCHAR(500) NOT NULL,
       lokasi VARCHAR(500),
       email VARCHAR(255),
       kontak VARCHAR(100),
       website VARCHAR(500),
       search_query VARCHAR(255),
       scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   
   CREATE INDEX idx_nama ON businesses(nama);
   CREATE INDEX idx_lokasi ON businesses(lokasi);
   CREATE INDEX idx_search_query ON businesses(search_query);
   CREATE INDEX idx_scraped_at ON businesses(scraped_at DESC);
   CREATE INDEX idx_created_at ON businesses(created_at DESC);
   ```

5. **Configure Environment Variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your database credentials:
   ```env
   DATABASE_URL=postgresql://your_user:your_password@localhost:5432/digimaps
   ```

6. **Run Development Server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Scraping Data

- Go to homepage
- Enter keyword (e.g., "SMP Islam", "Restoran", "Hotel")
- Select province and city
- Click "Search" button
- Wait for scraping progress
- New records store `search_query` from the main search input only
- Auto-redirected to database when complete

### 2. Managing Data

- Go to `/database` page
- **Filter**: By search query or location
- **Edit**: Click pencil icon to edit entry
- **Delete**: Click trash icon to delete entry
- **Export**: Click "Export CSV" to download data

## Project Structure

```
digimaps/
├── app/
│   ├── api/
│   │   ├── businesses/      # CRUD API routes
│   │   └── scrape/          # Scraping API
│   ├── database/            # Database page
│   └── page.tsx              # Homepage
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── search-form.tsx       # Search form
│   └── theme-toggle.tsx      # Dark mode toggle
├── lib/
│   ├── db.ts                 # Database connection
│   └── indonesia-cities.ts   # Location data
├── scripts/
│   └── scraper.py            # Python scraper
└── public/
    └── bg.jpg                # Light mode background
```

## Security Best Practices

✅ **Environment Variables** - Credentials stored in `.env.local` (not committed)  
✅ **SQL Injection Protected** - Parameterized queries with `pg`  
✅ **Input Validation** - Server-side validation on all API routes  
✅ **HTTPS Ready** - Production deployment recommended with SSL  

⚠️ **Important**: Never commit `.env.local` to version control!

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Database Hosting

- **Vercel Postgres** (recommended for Vercel deploy)
- **Supabase** (free tier available)
- **Railway** (PostgreSQL included)
- **Self-hosted** (VPS with PostgreSQL)

## License

Private Project - All Rights Reserved

## Author

Built with ❤️ for efficient business data collection

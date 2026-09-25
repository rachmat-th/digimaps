# Digimaps - Google Maps Business Scraper

A clean, professional web application for scraping business data from Google Maps with an intuitive UI/UX.

## Features

- **Modern UI** - Minimalist Google-inspired design with dark mode support
- **Smart Scraping** - Playwright-powered scraper with stealth mode anti-detection
- **PostgreSQL Database** - Reliable data storage with full CRUD operations
- **Data Management** - Filter by search query & location, export to CSV
- **Dark Mode** - Seamless light/dark theme switching
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **Real-time Progress** - Live scraping progress with streaming updates

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with `pg` driver
- **Scraper**: Python 3, Playwright, Playwright Stealth, BeautifulSoup4

## Prerequisites

- Node.js 18 or higher
- Python 3.8 or higher
- PostgreSQL 14 or higher

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/rachmat-th/digimaps.git
cd digimaps
```

### 2. Install Node Dependencies

```bash
npm install
```

### 3. Install Python Dependencies

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate     # On Windows

# Install dependencies
pip install -r scripts/requirements.txt

# Install Playwright browser
playwright install chromium
```

### 4. Setup PostgreSQL Database

```bash
# Create database
createdb digimaps

# Or using psql
psql -U postgres -c "CREATE DATABASE digimaps;"
```

Run the following SQL to create the table:

```sql
CREATE TABLE businesses (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(500) NOT NULL,
    lokasi VARCHAR(500),
    maps_url TEXT,
    email VARCHAR(255),
    kontak VARCHAR(100),
    website VARCHAR(500),
    search_query VARCHAR(255),
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_nama ON businesses(nama);
CREATE INDEX idx_lokasi ON businesses(lokasi);
CREATE INDEX idx_search_query ON businesses(search_query);
CREATE INDEX idx_scraped_at ON businesses(scraped_at DESC);
CREATE INDEX idx_created_at ON businesses(created_at DESC);
```

### 5. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database Configuration
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/digimaps

# Python Path (path to Python in your venv)
PYTHON_PATH=/path/to/your/project/venv/bin/python3
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Scraping Data

1. Go to the homepage
2. Enter a search keyword (e.g., "Restaurant", "Hospital", "Hotel")
3. Click the location pin icon and select province and city
4. Click the "Cari" (Search) button
5. Watch the real-time scraping progress
6. You'll be automatically redirected to the database page when complete

### Managing Data

Navigate to `/database` to manage your scraped data:

- **Filter**: Use dropdowns to filter by search query or location
- **Edit**: Click the pencil icon to edit an entry
- **Delete**: Click the trash icon to remove an entry
- **Export**: Click "Export CSV" to download all data
- **View Details**: Click on any business card/row to see full details

## Project Structure

```
digimaps/
├── app/
│   ├── api/
│   │   ├── businesses/          # Business CRUD API routes
│   │   │   ├── route.ts         # GET (list) & POST (create)
│   │   │   └── [id]/route.ts    # GET, PUT, DELETE by ID
│   │   └── scrape/              # Scraping API
│   │       ├── route.ts         # POST scrape endpoint
│   │       └── status/route.ts  # GET scraping status
│   ├── database/                # Database management page
│   │   └── page.tsx
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Homepage
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── search-form.tsx          # Main search form
│   ├── theme-toggle.tsx         # Dark mode toggle
│   └── global-loading-indicator.tsx
├── contexts/
│   └── scraping-context.tsx     # Global scraping state
├── lib/
│   ├── db.ts                    # Database utilities
│   ├── indonesia-cities.ts      # Location data (provinces & cities)
│   └── scraping-session.ts      # Scraping session management
├── scripts/
│   ├── scraper.py               # Main Python scraper
│   ├── scraper-streaming.py     # Streaming scraper variant
│   └── requirements.txt         # Python dependencies
├── public/
│   ├── bg.jpg                   # Light mode background
│   └── favicon files
└── migrations/
    └── add_maps_url.sql         # Database migration
```

## How It Works

### Scraping Flow

1. User submits search form (keyword + location)
2. Next.js API route spawns Python scraper process
3. Playwright opens Chromium in stealth mode
4. Scraper searches Google Maps and extracts business data
5. Data streams back as JSON lines
6. API route inserts each business into PostgreSQL
7. Real-time progress updates sent to frontend via Server-Sent Events
8. User redirected to database page when complete

### Data Extraction

The scraper extracts:
- Business name
- Location/address
- Google Maps URL
- Email address (from website if available)
- Contact number
- Website URL

## Security

- Environment variables for sensitive data
- SQL injection protection via parameterized queries
- Input validation on all API routes
- CORS protection
- No hardcoded credentials

**Important**: Never commit `.env.local` or any files containing credentials to version control.

## Performance Tips

- **Database**: Add more indexes if filtering by additional columns
- **Scraping**: Adjust `MAX_SCROLLS` in `scraper.py` for more/fewer results
- **Concurrency**: Only one scraping session can run at a time (prevents rate limiting)

## Troubleshooting

### Scraper not working

- Ensure Python virtual environment is activated
- Verify `PYTHON_PATH` in `.env.local` points to venv Python
- Check that Playwright Chromium is installed: `playwright install chromium`

### Database connection errors

- Verify PostgreSQL is running: `pg_isready`
- Check `DATABASE_URL` format in `.env.local`
- Ensure database `digimaps` exists

### Port already in use

- Change Next.js port: `npm run dev -- -p 3001`

## Contributing

This is a personal project, but suggestions and bug reports are welcome via GitHub Issues.

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Scraper inspired by [HasData/google-maps-scraper](https://github.com/gosom/google-maps-scraper)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Built with [Next.js](https://nextjs.org/) and [Playwright](https://playwright.dev/)

---

**Note**: This tool is for educational and research purposes. Always respect Google's Terms of Service and robots.txt. Use responsibly.

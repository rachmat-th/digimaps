import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { insertBusiness } from '@/lib/db';
import { startSession, endSession, isSessionRunning } from '@/lib/scraping-session';
import path from 'path';

const PYTHON_PATH = process.env.PYTHON_PATH || 'python3';
const SCRAPER_PATH = path.join(process.cwd(), 'scripts', 'scraper-streaming.py');

export async function POST(request: NextRequest) {
  try {
    if (isSessionRunning()) {
      return NextResponse.json(
        { error: 'Scraping is already in progress. Please wait until it completes.' },
        { status: 409 }
      );
    }

    const body = await request.json();
    const { keyword, city, province } = body;

    if (!keyword || !city) {
      return NextResponse.json(
        { error: 'Keyword and city are required' },
        { status: 400 }
      );
    }

    const sessionStarted = startSession(keyword, city);
    if (!sessionStarted) {
      return NextResponse.json(
        { error: 'Failed to start scraping session' },
        { status: 500 }
      );
    }

    const storedSearchQuery = keyword.trim();
    const scrapeQuery = [keyword, city, province]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.trim())
      .filter(Boolean)
      .join(' ');
    
    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ status: 'starting', message: 'Initializing browser...' })}\n\n`)
          );

          const python = spawn(PYTHON_PATH, [SCRAPER_PATH], {
            env: {
              ...process.env,
              SEARCH_QUERY: scrapeQuery,
            },
          });

          let stdoutBuffer = '';
          let stderrBuffer = '';
          let imported = 0;

          python.stdout.on('data', async (data) => {
            const text = data.toString();
            stdoutBuffer += text;
            
            const lines = stdoutBuffer.split('\n');
            stdoutBuffer = lines.pop() || '';
            
            for (const line of lines) {
              if (!line.trim()) continue;
              
              try {
                const business = JSON.parse(line);
                
                await insertBusiness({
                  nama: business.nama,
                  lokasi: business.lokasi || null,
                  maps_url: business.maps_url || null,
                  email: business.email || null,
                  kontak: business.kontak || null,
                  website: business.website || null,
                  search_query: storedSearchQuery,
                  scraped_at: new Date(),
                });
                
                imported++;
                
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ 
                    status: 'scraping', 
                    message: `Saved: ${business.nama.substring(0, 40)}... (${imported} total)`,
                    count: imported
                  })}\n\n`)
                );
              } catch (error) {
                console.error('Failed to parse/insert business:', error);
              }
            }
          });

          python.stderr.on('data', (data) => {
            const text = data.toString();
            stderrBuffer += text;
            
            const lines = stderrBuffer.split('\n');
            stderrBuffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.includes('[INFO]')) {
                const match = line.match(/\[INFO\] (.*)/);
                if (match) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ 
                      status: 'scraping', 
                      message: match[1] 
                    })}\n\n`)
                  );
                }
              }
            }
          });

          python.on('close', async (code) => {
            endSession();
            
            if (code === 0) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  status: 'complete', 
                  message: `Successfully imported ${imported} businesses to database`,
                  count: imported 
                })}\n\n`)
              );
            } else {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  status: 'error', 
                  message: `Scraper exited with error. ${imported} businesses were saved before error.`,
                  count: imported
                })}\n\n`)
              );
            }
            
            controller.close();
          });

          python.on('error', (error) => {
            console.error('Python process error:', error);
            endSession();
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ 
                status: 'error', 
                message: 'Failed to start scraper process',
                count: imported
              })}\n\n`)
            );
            controller.close();
          });
        },
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  } catch (error) {
    console.error('Scrape error:', error);
    return NextResponse.json(
      { error: 'Failed to start scraping' },
      { status: 500 }
    );
  }
}

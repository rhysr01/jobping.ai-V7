import { NextRequest, NextResponse } from 'next/server';
import RapidAPIInternshipsScraper from '@/scrapers/rapidapi-internships';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Starting RapidAPI Internships scraper...');
    
    // Check API key
    if (!process.env.RAPIDAPI_KEY) {
      return NextResponse.json({ 
        error: 'RAPIDAPI_KEY environment variable not set' 
      }, { status: 500 });
    }
    
    // Run the scraper
    const results = await RapidAPIInternshipsScraper.scrapeAllQueries();
    
    return NextResponse.json({
      success: true,
      source: 'rapidapi-internships',
      timestamp: new Date().toISOString(),
      results
    });
    
  } catch (error: any) {
    console.error('❌ RapidAPI Internships scraper error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      source: 'rapidapi-internships',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

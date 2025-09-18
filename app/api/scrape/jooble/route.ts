import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClient } from '@/Utils/databasePool';
import { HTTP_STATUS } from '@/Utils/constants';
import { errorResponse } from '@/Utils/errorResponse';

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Jooble scraper triggered');
    
    // Check if API key is configured
    if (!process.env.JOOBLE_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Jooble API key not configured',
        message: 'Please set JOOBLE_API_KEY environment variable'
      }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    // Dynamic imports to avoid build-time issues
    const { default: JoobleScraper } = await import('../../../../scrapers/jooble');
    const { convertToDatabaseFormat } = await import('../../../../scrapers/utils');

    const scraper = new JoobleScraper();
    const { jobs, metrics } = await scraper.scrapeAllLocations();
    
    console.log(`📊 Jooble scraping complete: ${jobs.length} jobs found`);
    
    if (jobs.length > 0) {
      const supabase = getDatabaseClient();
      
      // Convert to database format and save
      const dbJobs = jobs.map((job: any) => convertToDatabaseFormat(job));
      
      const { data, error } = await supabase
        .from('jobs')
        .upsert(dbJobs, { 
          onConflict: 'dedupe_key',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('❌ Error saving Jooble jobs:', error);
        return NextResponse.json({
          success: false,
          error: 'Database error',
          message: 'Failed to save jobs to database'
        }, { status: 500 });
      }

      console.log(`✅ Saved ${dbJobs.length} Jooble jobs to database`);
    }

    return NextResponse.json({
      success: true,
      jobsFound: jobs.length,
      metrics: metrics,
      message: `Successfully scraped ${jobs.length} jobs from Jooble`
    });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Jooble scraper failed:', message);
    return NextResponse.json({
      success: false,
      error: message,
      message: 'Jooble scraping failed'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Dynamic import to avoid build-time issues
    const { default: JoobleScraper } = await import('../../../../scrapers/jooble');
    const scraper = new JoobleScraper();
    const status = scraper.getStatus();
    
    return NextResponse.json({
      success: true,
      status: status,
      message: 'Jooble scraper status retrieved'
    });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error getting Jooble status:', message);
    return NextResponse.json({
      success: false,
      error: message,
      message: 'Failed to get Jooble scraper status'
    }, { status: 500 });
  }
}

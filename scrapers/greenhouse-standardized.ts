import axios from 'axios';
import { pathToFileURL } from 'url';
// Local helpers to avoid cross-module import issues
function localMakeJobHash(job: { title: string; company: string; location: string }): string {
  const normalizedTitle = (job.title || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const normalizedCompany = (job.company || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const normalizedLocation = (job.location || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const hashString = `${normalizedTitle}|${normalizedCompany}|${normalizedLocation}`;
  let hash = 0;
  for (let i = 0; i < hashString.length; i++) {
    const c = hashString.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function localParseLocation(location: string): { isRemote: boolean } {
  const loc = (location || '').toLowerCase();
  const isRemote = /\b(remote|work\s*from\s*home|wfh|anywhere|distributed|virtual)\b/i.test(loc);
  return { isRemote };
}

function isEarlyCareerText(title: string, description: string): boolean {
  const hay = `${title || ''} ${(description || '')}`.toLowerCase();
  const inc = /(graduate|new\s?grad|entry[-\s]?level|intern(ship)?|apprentice|early\s?career|junior|campus|working\sstudent|trainee|associate|analyst|coordinator|specialist|assistant|representative|consultant|researcher|developer|designer|marketing|sales|finance|operations|data|business|product)\b/i;
  const excl = /(\bsenior\b|\bstaff\b|\bprincipal\b|\blead\b|\bmanager\b|\bdirector\b|\bhead\b|\bvp\b|\bvice\s+president\b|\bchief\b|\bexecutive\b|\bc-level\b|\bcto\b|\bceo\b|\bcfo\b|\bcoo\b)/i;
  return inc.test(hay) && !excl.test(hay);
}

function convertIngestToDb(job: IngestJob): any {
  const loc = localParseLocation(job.location || '');
  const isEarly = isEarlyCareerText(job.title, job.description);
  const job_hash = localMakeJobHash({ title: job.title, company: job.company, location: job.location });
  const nowIso = new Date().toISOString();
  return {
    job_hash,
    title: (job.title || '').trim(),
    company: (job.company || '').trim(),
    location: (job.location || '').trim(),
    description: (job.description || '').trim(),
    job_url: (job.url || '').trim(),
    source: (job.source || 'greenhouse').trim(),
    posted_at: job.posted_at || nowIso,
    categories: [isEarly ? 'early-career' : 'experienced'],
    work_environment: loc.isRemote ? 'remote' : 'on-site',
    experience_required: isEarly ? 'entry-level' : 'experienced',
    original_posted_date: job.posted_at || nowIso,
    last_seen_at: nowIso,
    is_active: true,
    created_at: nowIso
  };
}
import supabasePkg from '@supabase/supabase-js';
const { createClient } = supabasePkg as any;

// Types
interface IngestJob {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  posted_at: string;
  source: string;
}

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at?: string;
  location?: { name?: string };
  departments?: { id: number; name: string }[];
  offices?: { id: number; name: string }[];
  content?: string;
  metadata?: Array<{ name: string; value: string }>;
  company_name?: string;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
  meta?: {
    total: number;
    page: number;
    per_page: number;
  };
}

// Greenhouse API Configuration - STANDARDIZED
const GREENHOUSE_CONFIG = {
  baseUrl: 'https://boards-api.greenhouse.io/v1/boards',
  
  // EU companies with proven job boards (expanded with Wave 2 EU employers)
  companies: [
    // Existing set
    'deloitte', 'pwc', 'ey', 'kpmg', 'accenture', 'capgemini',
    'bain', 'bcg', 'mckinsey', 'oliverwyman', 'rolandberger',
    'google', 'microsoft', 'amazon', 'meta', 'apple', 'netflix',
    'spotify', 'uber', 'airbnb', 'stripe', 'plaid', 'robinhood',
    'unilever', 'loreal', 'nestle', 'danone', 'heineken',
    'hsbc', 'barclays', 'deutschebank', 'bnpparibas', 'santander',

    // Wave 2 EU employers (slugs)
    'wise', 'checkoutcom', 'gocardless', 'onfido', 'cloudflare', 'thoughtmachine', 'snyk', 'palantir', 'improbable', 'globalwebindex',
    'workhuman', 'miro', 'udemy', 'zendesk',
    'hellofresh', 'deliveryhero', 'getyourguide', 'babbel', 'mambu', 'tiermobility', 'sennder', 'forto', 'solarisbank', 'raisin', 'coachhub', 'grover', 'getquin',
    'mollie', 'picnic', 'messagebird', 'backbase', 'bynder', 'bitvavo',
    'qonto', 'backmarket', 'contentsquare', 'payfit', 'alan', 'ledger', 'swile', 'vestiairecollective', 'mirakl', 'exotec', 'malt',
    'typeform', 'factorialhr', 'wallbox', 'redpoints', 'seedtag', 'carto', 'bankingcircle',
    'klarna', 'northvolt', 'epidemicsound', 'tink', 'voiscooters',
    'proton', 'scandit', 'nexthink', 'smallpdf',
    'personio', 'lilium', 'freeletics', 'demodesk',
    'bendingspoons', 'satispay',
    'toogoodtogo', 'pleo',
    'bitpanda', 'gostudent', 'adverity', 'collibra', 'showpad',
    'gitlab', 'remotecom', 'datadog', 'twilio', 'snowplow', 'thoughtworks', 'elastic', 'canonical',
    'n26', 'tradeledger', 'wefox', 'primer', 'saltpay', 'wayflyer', 'klaxoon', 'soldo', 'sumup',
    'deepl', 'graphcore', 'hazy', 'commercetools',
    // Wave 3 additions
    'oaknorth', 'ziglu', 'worldremit', 'mongodb', 'snowflakeinc', 'taxfix', 'adjust', 'contentful', 'solarwatt',
    'adyen', 'deptagency', 'wetransfer', 'tomtom', 'aircall', 'spendesk', 'sorare', 'doctolib', 'manomano', 'algolia', 'dataiku',
    'amenitiz', 'jobandtalent', 'paack', 'lodgify', 'glovo', 'travelperk', 'cabify',
    'einride', 'kry', 'mentimeter', 'onrunning', 'dfinity', 'frontify', 'sonarsource', 'avawomen',
    'idnow', 'navvis', 'tado', 'thefork', 'ylventures', 'templafy', 'deliverect', 'intersystems',
    'databricks', 'segment', 'confluent', 'hashicorp', 'vercel', 'teamviewer', 'nagarro'
  ],
  
  // Rate limiting (be respectful to Greenhouse)
  requestInterval: 2000, // 2 seconds between requests
  maxRequestsPerCompany: 3, // Max 3 requests per company
  seenJobTTL: 72 * 60 * 60 * 1000 // 72 hours
};

// Freshness policy
const FRESHNESS_DAYS = 28;

// Company-to-track mapping (A–E). This is a lightweight, curated start.
// A: Eng/Tech/Product, B: Consulting/Strategy/BD, C: Data/Analytics/Research
// D: Marketing/Sales/CS,  E: Operations/Finance/Legal
const COMPANY_TRACKS: Record<string, Track[]> = {
  // Big tech and platforms → A,C
  google: ['A','C'], microsoft: ['A','C'], amazon: ['A','C','E'], meta: ['A','C'], apple: ['A','C'],
  spotify: ['A','C','D'], uber: ['A','C','D'], airbnb: ['A','C','D'], stripe: ['A','C','E'], plaid: ['A','C'],
  databricks: ['A','C'], vercel: ['A','A','D'], hashicorp: ['A','C'], elastic: ['A','C'], canonical: ['A','C','E'],
  gitlab: ['A','C','D'], cloudflare: ['A','C','D'], snowflakeinc: ['A','C'], mongodb: ['A','C'],

  // Consulting → B,E
  deloitte: ['B','E'], pwc: ['B','E'], ey: ['B','E'], kpmg: ['B','E'],
  bain: ['B'], bcg: ['B'], mckinsey: ['B'], oliverwyman: ['B'], rolandberger: ['B'],

  // Fintech and scaleups → A,C,E,D depending
  wise: ['A','C','E'], checkoutcom: ['A','C','E','D'], gocardless: ['A','C','E'], onfido: ['A','C'],
  klarna: ['A','C','D'], n26: ['A','C','E'], adyen: ['A','C','D'], mollie: ['A','C','D'], sumup: ['A','D','E'],
  payfit: ['A','D','E'], qonto: ['E','B','A'], contentsquare: ['A','C','D'], dataiku: ['A','C'], algolia: ['A','C','D'],

  // Product SaaS → A,C,D
  zendesk: ['D','A'], miro: ['A','D'], udemy: ['D','A'], messagebird: ['D','A'], backbase: ['A','D'], bynder: ['D','A'],
  contentful: ['A','D'], commercetools: ['A','D'],

  // Ops/Industrial/Logistics → E,A
  hellofresh: ['E','A','D'], deliveryhero: ['E','D','A'], getyourguide: ['D','A'], wallbox: ['A','E'], northvolt: ['E','A'],
  onrunning: ['E','D','A'],

  // Security/Infra → A,C
  snyk: ['A','C'], thoughtworks: ['B','A'], palantir: ['A','C'],

  // EU scaleups (sales-heavy) → D,E
  toogoodtogo: ['D','E'], pleo: ['D','E'],
};

// Career path rotation strategy
type Track = 'A' | 'B' | 'C' | 'D' | 'E';

const TRACK_DEPARTMENTS: Record<Track, string[]> = {
  A: ['Engineering', 'Technology', 'Product'], // Tech focus
  B: ['Consulting', 'Strategy', 'Business Development'], // Consulting focus
  C: ['Data Science', 'Analytics', 'Research'], // Data focus
  D: ['Marketing', 'Sales', 'Customer Success'], // Growth focus
  E: ['Operations', 'Finance', 'Legal'] // Operations focus
};

class GreenhouseScraper {
  private requestCount = 0;
  private lastRequestTime = 0;
  private seenJobs: Map<number, number> = new Map(); // jobId -> timestamp
  private companyCache: Map<string, { lastCheck: number; jobCount: number }> = new Map();

  constructor() {
    this.cleanupSeenJobs();
    // Clean up seen jobs every 12 hours
    setInterval(() => this.cleanupSeenJobs(), 12 * 60 * 60 * 1000);
  }

  private cleanupSeenJobs(): void {
    const cutoff = Date.now() - GREENHOUSE_CONFIG.seenJobTTL;
    for (const [jobId, timestamp] of this.seenJobs.entries()) {
      if (timestamp < cutoff) {
        this.seenJobs.delete(jobId);
      }
    }
  }

  private getTrackForRun(): Track {
    // Rotate based on hour of day
    const hour = new Date().getHours();
    const tracks: Track[] = ['A', 'B', 'C', 'D', 'E'];
    return tracks[hour % 5];
  }

  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < GREENHOUSE_CONFIG.requestInterval) {
      const delay = GREENHOUSE_CONFIG.requestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async makeRequest(url: string): Promise<GreenhouseResponse> {
    await this.throttleRequest();
    
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'JobPing/1.0 (https://jobping.com)',
          'Accept': 'application/json'
        },
        validateStatus: (status) => status === 200 || status === 404
      });
      
      this.requestCount++;
      
      if (response.status === 404) {
        return { jobs: [] };
      }
      
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn('🚫 Rate limited by Greenhouse, backing off...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        return this.makeRequest(url);
      }
      throw error;
    }
  }

  private convertToIngestJob(ghJob: GreenhouseJob, company: string): IngestJob {
    // Build location string
    let location = 'Remote';
    if (ghJob.location?.name) {
      location = ghJob.location.name;
    } else if (ghJob.offices && ghJob.offices.length > 0) {
      location = ghJob.offices[0].name;
    }
    
    // Clean HTML content
    const description = ghJob.content ? this.stripHtmlTags(ghJob.content) : 'Early-career position';
    
    return {
      title: ghJob.title,
      company: company,
      location: location,
      description: description,
      url: ghJob.absolute_url,
      posted_at: ghJob.updated_at || new Date().toISOString(),
      source: 'greenhouse'
    };
  }

  private stripHtmlTags(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .trim();
  }

  private isEarlyCareer(job: GreenhouseJob): boolean {
    const hay = [
      job.title,
      ...(job.departments?.map(d => d.name) ?? []),
      job.content ?? ""
    ].join(" ").toLowerCase();

    // Inclusive early-career patterns (no "executive" to avoid senior roles)
    const inc = /(graduate|new\s?grad|entry[-\s]?level|intern(ship)?|apprentice|early\s?career|junior|campus|working\sstudent|trainee|associate|analyst|coordinator|specialist|assistant|representative|consultant|researcher|developer|designer|marketing|sales|finance|operations|data|business|product)\b/i;

    // Exclude all seniority indicators regardless of role
    const excl = /(\bsenior\b|\bstaff\b|\bprincipal\b|\blead\b|\bmanager\b|\bdirector\b|\bhead\b|\bvp\b|\bvice\s+president\b|\bchief\b|\bexecutive\b|\bc-level\b|\bcto\b|\bceo\b|\bcfo\b|\bcoo\b)/i;

    return inc.test(hay) && !excl.test(hay);
  }

  private isEU(job: GreenhouseJob): boolean {
    const txt = [
      job.location?.name ?? "",
      ...(job.offices?.map(o => o.name) ?? []),
      job.content ?? ""
    ].join(" ");
    
    // Exclude remote jobs
    if (/\b(remote|work\s+from\s+home|wfh|anywhere|distributed|virtual)\b/i.test(txt)) {
      return false;
    }
    
    const euHints = [
      // Countries
      'UK', 'United Kingdom', 'Ireland', 'Germany', 'France', 'Spain', 'Portugal', 'Italy',
      'Netherlands', 'Belgium', 'Luxembourg', 'Denmark', 'Sweden', 'Norway', 'Finland',
      'Iceland', 'Poland', 'Czech', 'Austria', 'Switzerland', 'Hungary', 'Greece',
      'Romania', 'Bulgaria', 'Croatia', 'Slovenia', 'Slovakia', 'Estonia', 'Latvia',
      'Lithuania',
      // Country codes
      'GB', 'IE', 'DE', 'FR', 'ES', 'PT', 'IT', 'NL', 'BE', 'LU', 'DK', 'SE', 'NO', 'FI',
      'IS', 'PL', 'CZ', 'AT', 'CH', 'HU', 'GR', 'RO', 'BG', 'HR', 'SI', 'SK', 'EE', 'LV', 'LT',
      // Major cities
      'Amsterdam', 'Rotterdam', 'Eindhoven', 'London', 'Dublin', 'Paris', 'Berlin', 'Munich', 
      'Frankfurt', 'Zurich', 'Stockholm', 'Copenhagen', 'Oslo', 'Helsinki', 'Madrid', 'Barcelona', 
      'Lisbon', 'Milan', 'Rome', 'Athens', 'Warsaw', 'Prague', 'Vienna', 'Budapest', 'Bucharest', 
      'Tallinn', 'Riga', 'Vilnius', 'Brussels', 'Luxembourg City'
    ];
    
    return euHints.some(hint => new RegExp(`\\b${hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(txt));
  }

  private async fetchCompanyJobs(company: string): Promise<IngestJob[]> {
    const jobs: IngestJob[] = [];
    
    try {
      // Check if we've hit the rate limit for this company
      const companyInfo = this.companyCache.get(company);
      if (companyInfo && companyInfo.lastCheck > Date.now() - (24 * 60 * 60 * 1000)) {
        console.log(`  ⏰ Skipping ${company} - checked recently`);
        return [];
      }
      
      console.log(`  🔍 Fetching jobs from ${company}...`);
      
      const url = `${GREENHOUSE_CONFIG.baseUrl}/${company}/jobs?content=true`;
      const response = await this.makeRequest(url);
      
      if (response.jobs && response.jobs.length > 0) {
        console.log(`    📊 Found ${response.jobs.length} jobs`);
        
        for (const job of response.jobs) {
          if (!this.seenJobs.has(job.id)) {
            this.seenJobs.set(job.id, Date.now());
            
            // Apply early-career and EU filtering
            if (this.isEarlyCareer(job) && this.isEU(job)) {
              const ingestJob = this.convertToIngestJob(job, company);
              jobs.push(ingestJob);
              console.log(`    ✅ Early-career EU: ${job.title}`);
            } else {
              console.log(`    🚫 Skipped: ${job.title} (not early-career or not EU)`);
            }
          }
        }
        
        // Update company cache
        this.companyCache.set(company, {
          lastCheck: Date.now(),
          jobCount: response.jobs.length
        });
      }
      
    } catch (error: any) {
      console.error(`  ❌ Error fetching ${company}:`, error.message);
    }
    
    return jobs;
  }

  public async scrapeAllCompanies(): Promise<{ jobs: IngestJob[]; metrics: any }> {
    const track = this.getTrackForRun();
    const departments = TRACK_DEPARTMENTS[track];
    
    const allJobs: IngestJob[] = [];
    const metrics = {
      track,
      departments: departments.join(', '),
      companiesProcessed: 0,
      totalJobsFound: 0,
      earlyCareerJobs: 0,
      requestsUsed: 0,
      errors: 0,
      startTime: new Date().toISOString()
    };

    console.log(`🔄 Greenhouse scraping with Track ${track}`);
    console.log(`📋 Departments: ${departments.join(', ')}`);
    console.log(`🏢 Companies: ${GREENHOUSE_CONFIG.companies.length} total`);

    // Filter companies by track if mapping exists; fallback to all
    const eligibleCompanies = GREENHOUSE_CONFIG.companies.filter(c => {
      const tracks = COMPANY_TRACKS[c];
      return !tracks || tracks.includes(track);
    });
    console.log(`🏢 Eligible companies for Track ${track}: ${eligibleCompanies.length}`);

    // Process companies in batches to manage rate limits
    const batchSize = 5;
    const companyBatches: string[][] = [];
    for (let i = 0; i < eligibleCompanies.length; i += batchSize) {
      companyBatches.push(eligibleCompanies.slice(i, i + batchSize));
    }

    for (const batch of companyBatches) {
      for (const company of batch) {
        try {
          const companyJobs = await this.fetchCompanyJobs(company);
          allJobs.push(...companyJobs);
          metrics.companiesProcessed++;
          metrics.earlyCareerJobs += companyJobs.length;
          
          console.log(`  ✅ ${company}: ${companyJobs.length} early-career EU jobs`);
          
        } catch (error: any) {
          console.error(`  ❌ Error processing ${company}:`, error.message);
          metrics.errors++;
        }
      }
      
      // Small delay between batches
      if (companyBatches.indexOf(batch) < companyBatches.length - 1) {
        console.log('  ⏸️ Brief pause between company batches...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    metrics.totalJobsFound = allJobs.length;
    metrics.requestsUsed = this.requestCount;

    console.log(`\n📊 Greenhouse scraping complete:`);
    console.log(`   🏢 Companies processed: ${metrics.companiesProcessed}/${eligibleCompanies.length}`);
    console.log(`   📋 Jobs found: ${metrics.totalJobsFound}`);
    console.log(`   📞 API calls used: ${metrics.requestsUsed}`);
    console.log(`   ❌ Errors: ${metrics.errors}`);

    return { jobs: allJobs, metrics };
  }

  public async scrapeSingleCompany(company: string): Promise<{ jobs: IngestJob[]; metrics: any }> {
    console.log(`🔍 Greenhouse scraping ${company}...`);
    
    const jobs = await this.fetchCompanyJobs(company);
    const metrics = {
      company,
      jobsFound: jobs.length,
      requestsUsed: this.requestCount
    };

    return { jobs, metrics };
  }

  public getStatus(): any {
    return {
      isRunning: false,
      companiesSupported: GREENHOUSE_CONFIG.companies.length,
      requestsUsed: this.requestCount,
      seenJobsCount: this.seenJobs.size,
      lastRequestTime: new Date(this.lastRequestTime).toISOString()
    };
  }

  public getSupportedCompanies(): string[] {
    return GREENHOUSE_CONFIG.companies;
  }

  public getDailyStats(): { requestsUsed: number; seenJobsCount: number } {
    return {
      requestsUsed: this.requestCount,
      seenJobsCount: this.seenJobs.size
    };
  }
}

export default GreenhouseScraper;

// -----------------------------
// Persistence helpers (Supabase)
// -----------------------------

function getSupabase(): any {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/ANON_KEY in env');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function upsertBatched(rows: any[], supabase: any, batchSize = 150): Promise<{ upserted: number; skipped: number }> {
  let upserted = 0;
  let skipped = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const slice = rows.slice(i, i + batchSize);
    const { error, count } = await supabase
      .from('jobs')
      .upsert(slice, { onConflict: 'job_hash', ignoreDuplicates: false, count: 'exact' });
    if (error) throw error;
    // Supabase count may include updated rows; conservatively treat all as upserted
    upserted += slice.length;
  }
  return { upserted, skipped };
}

export async function runGreenhouseAndSave(): Promise<void> {
  const start = Date.now();
  const supabase = getSupabase();
  const scraper = new GreenhouseScraper();
  const { jobs, metrics } = await scraper.scrapeAllCompanies();

  // Convert and filter to DB shape, strip non-existent columns
  const dbRows = jobs
    .map(convertIngestToDb)
    .filter(Boolean)
    .map((row: any) => {
      const { metadata, ...clean } = row || {};
      return clean;
    });

  // Deduplicate within this run by job_hash to avoid double-conflict in a single batch
  const uniqueRows: any[] = [];
  const seenHashes = new Set<string>();
  const freshnessCutoff = Date.now() - FRESHNESS_DAYS * 24 * 60 * 60 * 1000;
  for (const row of dbRows) {
    const hash = row?.job_hash;
    if (!hash) continue;
    // Freshness filter
    const postedMs = row.posted_at ? new Date(row.posted_at).getTime() : Date.now();
    if (isFinite(postedMs) && postedMs < freshnessCutoff) continue;
    if (!seenHashes.has(hash)) {
      seenHashes.add(hash);
      // Always refresh activity fields on upsert
      row.last_seen_at = new Date().toISOString();
      row.is_active = true;
      uniqueRows.push(row);
    }
  }

  let upserted = 0;
  let skipped = 0;
  try {
    const res = await upsertBatched(uniqueRows, supabase, 150);
    upserted = res.upserted;
    skipped = res.skipped;
  } catch (e: any) {
    console.error('❌ Upsert error:', e?.message || e);
    console.log(`[greenhouse] source=greenhouse found=${metrics.totalJobsFound} upserted=${upserted} skipped=${skipped} requests=${metrics.requestsUsed} duration_ms=${Date.now() - start}`);
    return; // fail gracefully without throwing to avoid unhandled rejection
  }

  console.log(`[greenhouse] source=greenhouse found=${metrics.totalJobsFound} upserted=${upserted} skipped=${skipped} requests=${metrics.requestsUsed} duration_ms=${Date.now() - start}`);
}

// Note: entrypoint removed; invoke runGreenhouseAndSave() via import in the runner or CLI.

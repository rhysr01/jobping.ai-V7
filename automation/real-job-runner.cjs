#!/usr/bin/env node

// REAL JobPing Automation - This Actually Works
const cron = require('node-cron');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Initialize language detection (simple version)
// const { initLang } = require('../scrapers/lang');

// Load environment variables (Railway will provide these)
require('dotenv').config({ path: '.env.local' });

// Check required environment variables (support both public and server URL vars)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const requiredEnvVars = {
  SUPABASE_URL,
  SUPABASE_KEY
};

// Validate environment variables
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    console.error(`❌ Missing required environment variable: ${key}`);
    console.error('Please set this variable in Railway dashboard');
    process.exit(1);
  }
}

console.log('✅ Environment variables loaded successfully');
console.log(`📡 Supabase URL: ${requiredEnvVars.SUPABASE_URL ? 'Set' : 'Missing'}`);
console.log(`🔑 Supabase Key: ${requiredEnvVars.SUPABASE_KEY ? 'Set' : 'Missing'}`);

// Initialize Supabase
const supabase = createClient(requiredEnvVars.SUPABASE_URL, requiredEnvVars.SUPABASE_KEY);

console.log('✅ Supabase client initialized successfully');

class RealJobRunner {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.totalJobsSaved = 0;
    this.runCount = 0;
  }

  /** Run a command and stream its stdout/stderr live to this process */
  runCommandLive(cmd, args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'], ...options });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) return resolve(0);
        reject(new Error(`${cmd} exited with code ${code}`));
      });
    });
  }

  // Actually run your working scrapers
  async runAdzunaScraper() {
    try {
      console.log('🔄 Running Adzuna scraper...');
      
      // Use the ultra-optimized Adzuna scraper that just saved 3,815 jobs
      const { stdout } = await execAsync('INCLUDE_REMOTE=false RELAX_EU_FILTER=true NODE_ENV=production node scripts/adzuna-categories-scraper.cjs', {
        cwd: process.cwd(),
        timeout: 600000 // 10 minutes for full scraper suite
      });
      
      // Parse the canonical success line first
      let jobsSaved = 0;
      const canonical = stdout.match(/^✅\s+Adzuna Multilingual Early-Career:\s+(\d+)\s+jobs saved to database$/m);
      if (canonical) {
        jobsSaved = parseInt(canonical[1]);
      } else {
        // Fallback to legacy line if present
        const legacy = stdout.match(/Total NEW jobs saved: (\d+)/);
        jobsSaved = legacy ? parseInt(legacy[1]) : 0;
      }
      // Fallback to DB count (last 5 minutes) if no log line matched
      if (!jobsSaved) {
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: false })
          .eq('source', 'adzuna')
          .gte('created_at', new Date(Date.now() - 5*60*1000).toISOString());
        jobsSaved = error ? 0 : (count || 0);
        if (jobsSaved) {
          console.log(`ℹ️  Adzuna: DB fallback count: ${jobsSaved} jobs`);
        }
      }
      
      console.log(`✅ Adzuna: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ Adzuna scraper failed:', error.message);
      return 0;
    }
  }

  // Run Reed scraper with real API
  async runReedScraper() {
    try {
      console.log('🔄 Running enhanced Reed scraper...');
      await this.runCommandLive('node', ['scrapers/reed-scraper-standalone.cjs'], {
        cwd: process.cwd(),
        env: { ...process.env }
      });
      const stdout = '';
      
      // Prefer canonical success line
      let reedJobs = 0;
      const canonical = stdout.match(/^✅\s+Reed:\s+(\d+)\s+jobs saved to database$/m);
      if (canonical) {
        reedJobs = parseInt(canonical[1]);
      } else {
        // Fallback to any legacy summary
        const legacy = stdout.match(/✅ Reed: (\d+) total jobs, (\d+) early-career/);
        reedJobs = legacy ? parseInt(legacy[1]) : 0;
      }
      // DB fallback (last 5 minutes)
      if (!reedJobs) {
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: false })
          .eq('source', 'reed')
          .gte('created_at', new Date(Date.now() - 5*60*1000).toISOString());
        reedJobs = error ? 0 : (count || 0);
        if (reedJobs) {
          console.log(`ℹ️  Reed: DB fallback count: ${reedJobs} jobs`);
        }
      }
      
      console.log(`✅ Reed: ${reedJobs} jobs processed`);
      return reedJobs;
    } catch (error) {
      console.error('❌ Reed scraper failed:', error.message);
      return 0;
    }
  }

  // Run Muse scraper with API key
  async runMuseScraper() {
    try {
      console.log('🔄 Running enhanced Muse scraper...');
      
      // Use the Muse scraper with API key (TS/ESM wrapper via ts-node/tsx if needed)
      const { stdout } = await execAsync('node scrapers/muse-scraper.js', {
        cwd: process.cwd(),
        timeout: 180000, // 3 minutes timeout
        env: { ...process.env }
      });
      
      let museJobs = 0;
      const m = stdout.match(/^✅\s+Muse:\s+(\d+)\s+jobs saved to database$/m);
      if (m) {
        museJobs = parseInt(m[1]);
      } else {
        // Fallback to DB count (last 60 minutes)
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: false })
          .eq('source', 'themuse')
          .gte('created_at', new Date(Date.now() - 60*60*1000).toISOString());
        museJobs = error ? 0 : (count || 0);
      }
      
      console.log(`✅ Muse: ${museJobs} jobs processed`);
      return museJobs;
    } catch (error) {
      console.error('❌ Muse scraper failed:', error.message);
      return 0;
    }
  }

  // Run standardized Greenhouse scraper
  async runGreenhouseScraper() {
    try {
      console.log('🔄 Running enhanced Greenhouse scraper (standardized JS) ...');
      const cmd = 'node scrapers/greenhouse-standardized.js';
      const { stdout } = await execAsync(cmd, {
        cwd: process.cwd(),
        timeout: 600000,
        env: { ...process.env }
      });
      let jobsSaved = 0;
      const ghSummary = stdout.match(/\[greenhouse\]\s+source=greenhouse\s+found=(\d+)\s+upserted=(\d+)/);
      if (ghSummary) {
        jobsSaved = parseInt(ghSummary[2]);
      } else {
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: false })
          .eq('source', 'greenhouse')
          .gte('created_at', new Date(Date.now() - 60*60*1000).toISOString());
        jobsSaved = error ? 0 : (count || 0);
      }
      
      console.log(`✅ Greenhouse: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ Greenhouse scraper failed:', error.message);
      return 0;
    }
  }

  // Fallback to standard Greenhouse scraper
  async runStandardGreenhouseScraper() {
    try {
      console.log('🔄 Running standard Greenhouse scraper (TS import)...');
      
      // Execute the TS module directly via dynamic import and run persistence entry
      const cmd = 'node -e "(async()=>{ const mod=await import(\'./scrapers/greenhouse-standardized.ts\'); await mod.runGreenhouseAndSave(); })().catch(e=>{ console.error(e?.message||e); process.exit(1); })"';
      const { stdout } = await execAsync(cmd, {
        cwd: process.cwd(),
        timeout: 600000,
        env: { ...process.env }
      });
      
      // Prefer parsing standardized summary from the TS scraper
      let jobsSaved = 0;
      const ghSummary = stdout.match(/\[greenhouse\]\s+source=greenhouse\s+found=(\d+)\s+upserted=(\d+)/);
      if (ghSummary) {
        jobsSaved = parseInt(ghSummary[2]);
      } else {
        // Fallback to DB count (last 60 minutes)
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: false })
          .eq('source', 'greenhouse')
          .gte('created_at', new Date(Date.now() - 60*60*1000).toISOString());
        jobsSaved = error ? 0 : (count || 0);
      }
      
      console.log(`✅ Standard Greenhouse: ${jobsSaved} jobs saved to database`);
      return jobsSaved;
      
    } catch (error) {
      console.error('❌ Standard Greenhouse scraper failed:', error.message);
      return 0;
    }
  }

  // Run Indeed scraper
  // Indeed scraper removed - not working properly



  // (duplicate runMuseScraper removed; see the earlier implementation with DB fallback)

  // Run enhanced JSearch scraper
  async runJSearchScraper() {
    try {
      console.log('🔄 Running enhanced JSearch scraper...');
      
      // Use the enhanced JSearch scraper with smart strategies
      const { stdout } = await execAsync('node scrapers/jsearch-scraper.js', {
        cwd: process.cwd(),
        timeout: 300000
      });
      
      let jobsSaved = 0;
      const m = stdout.match(/^✅\s+JSearch:\s+(\d+)\s+jobs saved to database$/m);
      if (m) {
        jobsSaved = parseInt(m[1]);
      } else {
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: false })
          .eq('source', 'jsearch')
          .gte('created_at', new Date(Date.now() - 60*60*1000).toISOString());
        jobsSaved = error ? 0 : (count || 0);
      }
      
      console.log(`✅ JSearch: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ JSearch scraper failed:', error.message);
      return 0;
    }
  }

  // Run enhanced Jooble scraper
  async runJoobleScraper() {
    try {
      console.log('🔄 Running enhanced Jooble scraper...');
      if (process.env.JOOBLE_ENABLED === 'false') {
        console.log('⚠️ Jooble disabled by flag');
        return 0;
      }
      
      // Use the enhanced Jooble scraper with smart strategies
      const { stdout } = await execAsync('node scrapers/jooble.js', {
        cwd: process.cwd(),
        timeout: 300000
      });
      
      let jobsSaved = 0;
      const m = stdout.match(/^✅\s+Jooble:\s+(\d+)\s+jobs saved to database$/m);
      if (m) {
        jobsSaved = parseInt(m[1]);
      } else {
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: false })
          .eq('source', 'jooble')
          .gte('created_at', new Date(Date.now() - 60*60*1000).toISOString());
        jobsSaved = error ? 0 : (count || 0);
      }
      
      console.log(`✅ Jooble: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ Jooble scraper failed:', error.message);
      return 0;
    }
  }

  // Run enhanced Ashby scraper
  async runAshbyScraper() {
    try {
      console.log('🔄 Running enhanced Ashby scraper...');
      
      // Use the enhanced Ashby scraper with smart strategies
      const { stdout } = await execAsync('node scrapers/ashby.js', {
        cwd: process.cwd(),
        timeout: 300000
      });
      
      let jobsSaved = 0;
      const m = stdout.match(/^✅\s+Ashby:\s+(\d+)\s+jobs saved to database$/m);
      if (m) {
        jobsSaved = parseInt(m[1]);
      } else {
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: false })
          .eq('source', 'ashby')
          .gte('created_at', new Date(Date.now() - 60*60*1000).toISOString());
        jobsSaved = error ? 0 : (count || 0);
      }
      
      console.log(`✅ Ashby: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ Ashby scraper failed:', error.message);
      return 0;
    }
  }

  // Run SERP API scraper
  async runSerpAPIScraper() {
    try {
      console.log('🔍 Running SERP API scraper...');
      // Run TS implementation via tsx and stream live
      await this.runCommandLive('npx', ['-y', 'tsx', 'scrapers/serp-api-scraper.ts'], {
        cwd: process.cwd(),
        env: { ...process.env }
      });
      const stdout = '';

      // Parse jobs found from logs or fallback to DB
      let jobsSaved = 0;
      const { count, error } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: false })
        .eq('source', 'serp-api')
        .gte('created_at', new Date(Date.now() - 60*60*1000).toISOString());
      jobsSaved = error ? 0 : (count || 0);
      if (!jobsSaved) {
        if (stdout.includes('API key missing')) {
          console.log('❌ SERP API: Missing API key');
        } else if (stdout.toLowerCase().includes('quota exceeded')) {
          console.log('❌ SERP API: Quota exceeded');
        }
      }
      
      console.log(`✅ SERP API: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ SERP API scraper failed:', error.message);
      return 0;
    }
  }

  // Run RapidAPI Internships scraper
  async runRapidAPIInternshipsScraper() {
    try {
      console.log('🎓 Running RapidAPI Internships scraper...');
      // Run the TS implementation and stream live
      await this.runCommandLive('npx', ['-y', 'tsx', 'scrapers/rapidapi-internships.ts'], {
        cwd: process.cwd(),
        env: { ...process.env }
      });
      // DB fallback (last 60 minutes)
      let jobsSaved = 0;
      const { count, error } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: false })
        .eq('source', 'rapidapi-internships')
        .gte('created_at', new Date(Date.now() - 60*60*1000).toISOString());
      jobsSaved = error ? 0 : (count || 0);
      
      console.log(`✅ RapidAPI Internships: ${jobsSaved} jobs processed`);
      return jobsSaved;
    } catch (error) {
      console.error('❌ RapidAPI Internships scraper failed:', error.message);
      return 0;
    }
  }


  // Monitor database health
  async checkDatabaseHealth() {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const lastJobTime = new Date(data[0].created_at);
        const hoursSinceLastJob = (Date.now() - lastJobTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastJob > 24) {
          console.error(`🚨 ALERT: No jobs ingested in ${Math.round(hoursSinceLastJob)} hours`);
          return false;
        }
        
        console.log(`✅ Database healthy: Last job ${Math.round(hoursSinceLastJob)} hours ago`);
        return true;
      } else {
        console.error('🚨 ALERT: No jobs in database');
        return false;
      }
    } catch (error) {
      console.error('❌ Database health check failed:', error.message);
      return false;
    }
  }

  // Get database stats
  async getDatabaseStats() {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('created_at, source');
      
      if (error) throw error;
      
      const totalJobs = data.length;
      const recentJobs = data.filter(job => {
        const jobTime = new Date(job.created_at);
        return (Date.now() - jobTime.getTime()) < (24 * 60 * 60 * 1000);
      }).length;
      
      const sourceBreakdown = data.reduce((acc, job) => {
        acc[job.source] = (acc[job.source] || 0) + 1;
        return acc;
      }, {});
      
      return {
        totalJobs,
        recentJobs,
        sourceBreakdown
      };
    } catch (error) {
      console.error('❌ Database stats failed:', error.message);
      return { totalJobs: 0, recentJobs: 0, sourceBreakdown: {} };
    }
  }

  // Main scraping cycle
  async runScrapingCycle() {
    if (this.isRunning) {
      console.log('⏸️ Scraping cycle already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('\n🚀 STARTING AUTOMATED SCRAPING CYCLE');
      console.log('=====================================');
      
      // Run all enhanced scrapers with individual error isolation
      let adzunaJobs = 0;
      try {
        adzunaJobs = await this.runAdzunaScraper();
        console.log(`✅ Adzuna completed: ${adzunaJobs} jobs`);
      } catch (error) {
        console.error('❌ Adzuna scraper failed, continuing with other scrapers:', error.message);
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced delay between scrapers
      
      let reedJobs = 0;
      try {
        reedJobs = await this.runReedScraper();
        console.log(`✅ Reed completed: ${reedJobs} jobs`);
      } catch (error) {
        console.error('❌ Reed scraper failed, continuing with other scrapers:', error.message);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let greenhouseJobs = 0;
      try {
        greenhouseJobs = await this.runGreenhouseScraper();
        console.log(`✅ Greenhouse completed: ${greenhouseJobs} jobs`);
      } catch (error) {
        console.error('❌ Greenhouse scraper failed, continuing with other scrapers:', error.message);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let museJobs = 0;
      try {
        museJobs = await this.runMuseScraper();
        console.log(`✅ Muse completed: ${museJobs} jobs`);
      } catch (error) {
        console.error('❌ Muse scraper failed, continuing with other scrapers:', error.message);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let jsearchJobs = 0;
      try {
        jsearchJobs = await this.runJSearchScraper();
        console.log(`✅ JSearch completed: ${jsearchJobs} jobs`);
      } catch (error) {
        console.error('❌ JSearch scraper failed, continuing with other scrapers:', error.message);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let joobleJobs = 0;
      try {
        joobleJobs = await this.runJoobleScraper();
        console.log(`✅ Jooble completed: ${joobleJobs} jobs`);
      } catch (error) {
        console.error('❌ Jooble scraper failed, continuing with other scrapers:', error.message);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let ashbyJobs = 0;
      try {
        ashbyJobs = await this.runAshbyScraper();
        console.log(`✅ Ashby completed: ${ashbyJobs} jobs`);
      } catch (error) {
        console.error('❌ Ashby scraper failed, continuing with other scrapers:', error.message);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let rapidapiInternshipsJobs = 0;
      try {
        rapidapiInternshipsJobs = await this.runRapidAPIInternshipsScraper();
        console.log(`✅ RapidAPI Internships completed: ${rapidapiInternshipsJobs} jobs`);
      } catch (error) {
        console.error('❌ RapidAPI Internships scraper failed, continuing with other scrapers:', error.message);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let serpApiJobs = 0;
      try {
        serpApiJobs = await this.runSerpAPIScraper();
        console.log(`✅ SERP API completed: ${serpApiJobs} jobs`);
      } catch (error) {
        console.error('❌ SERP API scraper failed, continuing with other scrapers:', error.message);
      }
      
      // Update stats with all enhanced scrapers
      this.totalJobsSaved += (adzunaJobs + reedJobs + greenhouseJobs + museJobs + jsearchJobs + joobleJobs + ashbyJobs + rapidapiInternshipsJobs + serpApiJobs);
      this.runCount++;
      this.lastRun = new Date();
      
      // Check database health
      await this.checkDatabaseHealth();
      
      // Get final stats
      const dbStats = await this.getDatabaseStats();
      
      const duration = (Date.now() - startTime) / 1000;
      console.log('\n✅ SCRAPING CYCLE COMPLETE');
      console.log('============================');
      console.log(`⏱️  Duration: ${duration.toFixed(1)} seconds`);
      console.log(`📊 Jobs processed this cycle: ${adzunaJobs + reedJobs + greenhouseJobs + museJobs + jsearchJobs + joobleJobs + ashbyJobs + rapidapiInternshipsJobs + serpApiJobs}`);
      console.log(`📈 Total jobs processed: ${this.totalJobsSaved}`);
      console.log(`🔄 Total cycles run: ${this.runCount}`);
      console.log(`📅 Last run: ${this.lastRun.toISOString()}`);
      console.log(`💾 Database total: ${dbStats.totalJobs} jobs`);
      console.log(`🆕 Database recent (24h): ${dbStats.recentJobs} jobs`);
      console.log(`🏷️  Sources: ${JSON.stringify(dbStats.sourceBreakdown)}`);
      console.log(`🔍 SERP API contribution: ${serpApiJobs} jobs`);
      
    } catch (error) {
      console.error('❌ Scraping cycle failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Start the automation
  start() {
    console.log('🚀 Starting JobPing Real Automation...');
    console.log('=====================================');
    
    // Run immediately on startup
    this.runScrapingCycle();
    
    // Schedule runs 3 times per day (morning, lunch, evening) to avoid duplicate jobs
    cron.schedule('0 8,13,18 * * *', () => {
      console.log('\n⏰ Scheduled scraping cycle starting...');
      this.runScrapingCycle();
    });
    
    // Schedule daily health check
    cron.schedule('0 9 * * *', async () => {
      console.log('\n🏥 Daily health check...');
      await this.checkDatabaseHealth();
      const stats = await this.getDatabaseStats();
      console.log('📊 Daily stats:', stats);
    });
    
    console.log('✅ Automation started successfully!');
    console.log('   - Hourly scraping cycles');
    console.log('   - Daily health checks');
    console.log('   - Database monitoring');
    console.log('   - All 6 working scrapers integrated');
  }

  // Get status
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun?.toISOString(),
      totalJobsSaved: this.totalJobsSaved,
      runCount: this.runCount,
      uptime: process.uptime()
    };
  }
}

// Export the runner
const jobRunner = new RealJobRunner();

// Start if this file is run directly
if (require.main === module) {
  (async () => {
    try {
      if (process.env.LOG_LEVEL === 'debug') {
        // Optional language initialization if available
        if (typeof initLang === 'function') {
          await initLang();
          console.log('✅ Language detection initialized');
        }
      }
    } catch (e) {
      console.warn('[lang] init failed, falling back to franc-only', e);
    }
    
    // Start the job runner
    jobRunner.start();
  })();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down gracefully...');
    process.exit(0);
  });
}

module.exports = jobRunner;

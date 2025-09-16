#!/usr/bin/env node

/**
 * Adzuna Job Scraping Functions
 * Modular, reusable functions for collecting early-career jobs
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const axios = require('axios');
const { getSmartDateStrategy, getSmartPaginationStrategy, withFallback } = require('../scrapers/smart-strategies.js');

// Enhanced target cities with expanded keywords
const TARGET_CITIES = [
  { 
    name: 'London', 
    country: 'gb', 
    keywords: [
      'graduate', 'intern', 'junior', 'entry-level', 'trainee', 'apprentice', 
      'new graduate', 'recent graduate', 'student', 'entry level', 'first job'
    ] 
  },
  { 
    name: 'Dublin', 
    country: 'ie', 
    keywords: [
      'graduate', 'intern', 'junior', 'entry-level', 'trainee', 'apprentice', 
      'new graduate', 'recent graduate', 'student', 'entry level', 'first job'
    ] 
  },
  { 
    name: 'Madrid', 
    country: 'es', 
    keywords: [
      'becario', 'prácticas', 'junior', 'trainee', 'nivel inicial', 'primer empleo',
      'estudiante', 'recién graduado', 'sin experiencia', 'formación', 'aprendiz'
    ] 
  },
  { 
    name: 'Berlin', 
    country: 'de', 
    keywords: [
      'praktikum', 'trainee', 'junior', 'einsteiger', 'berufseinsteiger', 'student',
      'absolvent', 'neueinsteiger', 'anfänger', 'ausbildung', 'werkstudent'
    ] 
  },
  { 
    name: 'Amsterdam', 
    country: 'nl', 
    keywords: [
      'stagiair', 'werkstudent', 'junior', 'trainee', 'starter', 'student',
      'afgestudeerde', 'eerste baan', 'entry level', 'beginnersfunctie', 'leerling'
    ] 
  },
  { 
    name: 'Paris', 
    country: 'fr', 
    keywords: [
      'stagiaire', 'alternance', 'junior', 'trainee', 'débutant', 'premier emploi',
      'étudiant', 'jeune diplômé', 'sans expérience', 'formation', 'apprenti'
    ] 
  },
  { 
    name: 'Zurich', 
    country: 'ch', 
    keywords: [
      'praktikum', 'trainee', 'junior', 'einsteiger', 'berufseinsteiger', 'student',
      'absolvent', 'neueinsteiger', 'anfänger', 'ausbildung', 'lehrling'
    ] 
  },
  { 
    name: 'Brussels', 
    country: 'be', 
    keywords: [
      'stagiaire', 'stage', 'junior', 'trainee', 'débutant', 'premier emploi',
      'étudiant', 'jeune diplômé', 'starter', 'student', 'apprenti'
    ] 
  },
  { 
    name: 'Milan', 
    country: 'it', 
    keywords: [
      'stage', 'tirocinio', 'junior', 'trainee', 'neolaureato', 'primo lavoro',
      'studente', 'laureato', 'principiante', 'formazione', 'apprendista'
    ] 
  },
  { 
    name: 'Rome', 
    country: 'it', 
    keywords: [
      'stage', 'tirocinio', 'junior', 'trainee', 'neolaureato', 'primo lavoro',
      'studente', 'laureato', 'principiante', 'formazione', 'apprendista'
    ] 
  }
];

/**
 * Scrape jobs from a single city with specified keywords
 * @param {string} cityName - Name of the city
 * @param {string} countryCode - Country code (gb, es, de, nl, fr)
 * @param {string[]} keywords - Array of keywords to search for
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} Array of job objects
 */
async function scrapeCityJobs(cityName, countryCode, keywords, options = {}) {
  const {
    appId = process.env.ADZUNA_APP_ID,
    appKey = process.env.ADZUNA_APP_KEY,
    resultsPerPage = 25,
    delay = 800,
    timeout = 15000,
    verbose = false
  } = options;

  // Use smart strategies for date filtering and pagination
  // Smart time strategy: 1-2 days for frequent runs, 7 days for initial/weekly runs
  const isInitialRun = process.env.ADZUNA_INITIAL_RUN === 'true';
  const smartMaxDays = isInitialRun ? '7' : withFallback(() => getSmartDateStrategy('adzuna'), '2');
  const pagination = withFallback(() => getSmartPaginationStrategy('adzuna'), { startPage: 1, endPage: 2 });

  if (!appId || !appKey) {
    throw new Error('Missing Adzuna credentials');
  }

  const jobs = [];
  
  for (const keyword of keywords) {
    try {
      if (verbose) console.log(`📍 Searching ${cityName} for: ${keyword} (max ${smartMaxDays} days, pages ${pagination.startPage}-${pagination.endPage})`);
      
      // Loop through pages using smart pagination
      for (let page = pagination.startPage; page <= pagination.endPage; page++) {
        const url = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/${page}?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(keyword)}&where=${encodeURIComponent(cityName)}&results_per_page=${resultsPerPage}&sort_by=date&max_days_old=${smartMaxDays}`;
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'JobPing/1.0 (https://jobping.com)',
            'Accept': 'application/json'
          },
          timeout
        });

        if (response.data.results && response.data.results.length > 0) {
          if (verbose) console.log(`   ✅ Found ${response.data.results.length} jobs for "${keyword}" (page ${page})`);
          
          // Process and format jobs
          response.data.results.forEach(job => {
          const formattedJob = {
            title: job.title,
            company: job.company?.display_name || 'Company not specified',
            location: job.location?.display_name || cityName,
            description: job.description?.substring(0, 200) + '...',
            url: job.redirect_url,
            posted: job.created,
            salary: job.salary_min && job.salary_max ? 
              `£${job.salary_min.toLocaleString()} - £${job.salary_max.toLocaleString()}` : 
              'Salary not specified',
            category: job.category?.label || 'General',
            keyword: keyword,
            contract: job.contract_time || 'Not specified',
            experience: job.experience_level || 'Not specified',
            city: cityName,
            country: countryCode,
            source: 'adzuna'
          };
          
            jobs.push(formattedJob);
          });
        } else {
          if (verbose) console.log(`   ⚠️  No jobs found for "${keyword}" (page ${page})`);
          break; // No more pages available
        }
        
        // Delay between pages
        if (delay > 0 && page < pagination.endPage) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } // End of pagination loop
      
      // Delay between keywords
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      if (error.response?.status === 429) {
        if (verbose) console.log(`   ⏳ Rate limited for "${keyword}", waiting 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        if (verbose) console.log(`   ❌ Error searching for "${keyword}": ${error.response?.status || error.message}`);
      }
    }
  }
  
  return jobs;
}

/**
 * Scrape jobs from all target cities
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Results object with jobs and statistics
 */
async function scrapeAllCities(options = {}) {
  const {
    cities = TARGET_CITIES,
    verbose = true,
    ...scrapingOptions
  } = options;

  if (verbose) console.log('🎯 Starting enhanced job search across all cities...\n');
  
  let allJobs = [];
  let totalJobs = 0;
  let keywordStats = {};
  let cityStats = {};
  
  for (const city of cities) {
    if (verbose) console.log(`\n🌍 Processing ${city.name}...`);
    
    const cityJobs = await scrapeCityJobs(
      city.name, 
      city.country, 
      city.keywords, 
      { ...scrapingOptions, verbose }
    );
    
    if (cityJobs.length > 0) {
      allJobs = allJobs.concat(cityJobs);
      totalJobs += cityJobs.length;
      cityStats[city.name] = cityJobs.length;
      
      // Track keyword performance
      cityJobs.forEach(job => {
        keywordStats[job.keyword] = (keywordStats[job.keyword] || 0) + 1;
      });
    }
    
    if (verbose) console.log(`   📊 ${city.name}: ${cityJobs.length} jobs found`);
  }
  
  // Calculate statistics
  const companies = [...new Set(allJobs.map(job => job.company))];
  const categories = [...new Set(allJobs.map(job => job.category))];
  const contracts = [...new Set(allJobs.map(job => job.contract))];
  
  const results = {
    jobs: allJobs,
    totalJobs,
    citiesProcessed: cities.length,
    totalKeywords: cities.reduce((sum, city) => sum + city.keywords.length, 0),
    statistics: {
      uniqueCompanies: companies.length,
      jobCategories: categories.length,
      contractTypes: contracts.filter(c => c !== 'Not specified'),
      cityBreakdown: cityStats,
      keywordPerformance: Object.entries(keywordStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([keyword, count]) => ({ keyword, count }))
    }
  };
  
  if (verbose) {
    displayResults(results);
  }
  
  return results;
}

/**
 * Display scraping results in a nice format
 * @param {Object} results - Results object from scrapeAllCities
 */
function displayResults(results) {
  console.log('\n🎉 ENHANCED SCRAPING COMPLETE!');
  console.log('='.repeat(70));
  console.log(`📊 Total Jobs Found: ${results.totalJobs}`);
  console.log(`🌍 Cities Processed: ${results.citiesProcessed}`);
  console.log(`🔍 Total Keywords Searched: ${results.totalKeywords}`);
  
  // Show keyword performance
  console.log(`\n📈 Keyword Performance:`);
  results.statistics.keywordPerformance.forEach(({ keyword, count }) => {
    console.log(`   "${keyword}": ${count} jobs`);
  });
  
  // Show city breakdown
  console.log(`\n🌍 City Breakdown:`);
  Object.entries(results.statistics.cityBreakdown).forEach(([city, count]) => {
    console.log(`   ${city}: ${count} jobs`);
  });
  
  // Show some stats
  console.log(`\n📊 Job Statistics:`);
  console.log(`   Unique Companies: ${results.statistics.uniqueCompanies}`);
  console.log(`   Job Categories: ${results.statistics.jobCategories} different types`);
  console.log(`   Contract Types: ${results.statistics.contractTypes.join(', ')}`);
  
  if (results.jobs.length > 0) {
    console.log(`\n💡 Top Job Opportunities:`);
    results.jobs.slice(0, 8).forEach((job, index) => {
      console.log(`   ${index + 1}. ${job.title} at ${job.company} (${job.location})`);
    });
  }
  
  console.log('\n✅ Enhanced Adzuna job scraping completed successfully!');
  console.log('🚀 You now have maximum early-career job data for your pilot!');
  console.log(`💾 Total jobs collected: ${results.totalJobs} across ${results.citiesProcessed} cities`);
}

/**
 * Quick scrape function for single city
 * @param {string} cityName - Name of the city
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} Array of job objects
 */
async function quickScrape(cityName, options = {}) {
  const city = TARGET_CITIES.find(c => c.name.toLowerCase() === cityName.toLowerCase());
  if (!city) {
    throw new Error(`City "${cityName}" not found in target cities`);
  }
  
  return await scrapeCityJobs(city.name, city.country, city.keywords, options);
}

/**
 * Get available cities and keywords
 * @returns {Object} Available cities and their keywords
 */
function getAvailableCities() {
  return TARGET_CITIES.map(city => ({
    name: city.name,
    country: city.country,
    keywords: city.keywords
  }));
}

// Export functions for use in other files
module.exports = {
  scrapeCityJobs,
  scrapeAllCities,
  quickScrape,
  getAvailableCities,
  TARGET_CITIES,
  displayResults
};

// If run directly, execute the full scraper
if (require.main === module) {
  console.log('🚀 Starting Enhanced Adzuna Job Scraper...\n');
  scrapeAllCities({ verbose: true }).catch(error => {
    console.error('❌ Enhanced scraping failed:', error.message);
  });
}


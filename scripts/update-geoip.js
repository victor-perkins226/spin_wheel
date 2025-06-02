// scripts/update-geoip.js

const geoip = require('geoip-lite');
const fs = require('fs');
const path = require('path');

console.log("📦 Generating geoip-lite data...");

geoip.lookup('8.8.8.8'); // Triggers download of data if not already present

const dataDir = path.join(__dirname, '..', 'node_modules', 'geoip-lite', 'data');
const countryPath = path.join(dataDir, 'geoip-country.dat');

if (!fs.existsSync(countryPath)) {
  console.error(`❌ geoip-country.dat not found. geoip-lite failed to generate data.`);
  process.exit(1);
}

console.log('✅ geoip-lite data ready.');
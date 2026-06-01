const bcrypt = require('bcryptjs');

// Test the current hash in the DB
const currentHash = '$2b$10$hjluBYx1VMbROMFbT9W2q.KwRjzNuK7HQ2a4QkD/zIQfKU0t4.5L.';
console.log('Testing current hash from DB:');
console.log('  hash:', currentHash);
console.log('  compare Abdool786!:', bcrypt.compareSync('Abdool786!', currentHash));

// Test the seed default hash
const seedHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHHi';
console.log('\nTesting seed default hash:');
console.log('  hash:', seedHash);
console.log('  compare GfaAdmin2024!:', bcrypt.compareSync('GfaAdmin2024!', seedHash));
console.log('  compare TagAdmin2024!:', bcrypt.compareSync('TagAdmin2024!', seedHash));

// Generate a new hash with bcryptjs and test it
const newHash = bcrypt.hashSync('Abdool786!', 10);
console.log('\nFresh bcryptjs hash for Abdool786!:');
console.log('  hash:', newHash);
console.log('  compare:', bcrypt.compareSync('Abdool786!', newHash));

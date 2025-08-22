#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unused-vars */

const fs = require('fs');
const path = require('path');

// Sua chave privada atual
const privateKey = `------YOUR KEY HERE------`;

// Converter para base64
const base64Key = Buffer.from(privateKey).toString('base64');

console.log('🔑 Private key converted to base64:');
console.log('');
console.log('BIGO_PRIVATE_KEY=' + base64Key);
console.log('');
console.log('📋 Copy this line to your .env.deploy file');
console.log('');
console.log(
  '✅ The key is now in a single line and will be automatically decoded!',
);

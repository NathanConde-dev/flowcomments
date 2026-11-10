#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, copyFile } from 'fs/promises';

const BASE_URL = 'http://localhost:8080';
const OUTPUT_DIR = 'docs/screenshots';
const ARTIFACTS_DIR = '/opt/cursor/artifacts';

const browser = await chromium.launch({ headless: true });

console.log('\n📸 Capturing unauthenticated pages...');

// Desktop screenshots (1440px)
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await desktop.newPage();

// Home
await page.goto(`${BASE_URL}/`);
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUTPUT_DIR}/home.png`, fullPage: true });
console.log('✓ home.png');

// Login
await page.goto(`${BASE_URL}/login`);
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUTPUT_DIR}/login.png`, fullPage: true });
console.log('✓ login.png');

// Setup
await page.goto(`${BASE_URL}/setup`);
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUTPUT_DIR}/setup.png`, fullPage: true });
console.log('✓ setup.png');

// Try to login
console.log('\n📸 Logging in...');
await page.goto(`${BASE_URL}/login`);
try {
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log('✓ Logged in');
} catch (e) {
  console.log('⚠ Login failed');
}

console.log('\n📸 Capturing authenticated pages...');

// Dashboard
try {
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUTPUT_DIR}/dashboard.png`, fullPage: true });
  console.log('✓ dashboard.png');
} catch (e) {
  console.log('⚠ dashboard.png failed:', e.message);
}

// Contacts
try {
  await page.goto(`${BASE_URL}/contacts`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUTPUT_DIR}/contatos.png`, fullPage: true });
  console.log('✓ contatos.png');
} catch (e) {
  console.log('⚠ contatos.png failed:', e.message);
}

// Automations
try {
  await page.goto(`${BASE_URL}/automations`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUTPUT_DIR}/automacoes.png`, fullPage: true });
  console.log('✓ automacoes.png');
} catch (e) {
  console.log('⚠ automacoes.png failed:', e.message);
}

// Inbox
try {
  await page.goto(`${BASE_URL}/inbox`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUTPUT_DIR}/inbox.png`, fullPage: true });
  console.log('✓ inbox.png');
} catch (e) {
  console.log('⚠ inbox.png failed:', e.message);
}

// Settings
try {
  await page.goto(`${BASE_URL}/settings`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUTPUT_DIR}/settings.png`, fullPage: true });
  console.log('✓ settings.png');
} catch (e) {
  console.log('⚠ settings.png failed:', e.message);
}

await desktop.close();

// Mobile (390px)
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mobilePage = await mobile.newPage();

console.log('\n📸 Capturing mobile...');

await mobilePage.goto(`${BASE_URL}/login`);
await mobilePage.fill('input[type="text"]', 'admin');
await mobilePage.fill('input[type="password"]', 'admin123');
await mobilePage.click('button[type="submit"]');
await mobilePage.waitForTimeout(3000);

await mobilePage.goto(`${BASE_URL}/dashboard`);
await mobilePage.waitForTimeout(1000);

// Click menu
try {
  const menuBtn = await mobilePage.locator('button').first();
  await menuBtn.click();
  await mobilePage.waitForTimeout(500);

  await mobilePage.screenshot({ path: `${OUTPUT_DIR}/mobile-drawer.png` });
  console.log('✓ mobile-drawer.png');
} catch (e) {
  console.log('⚠ mobile-drawer.png failed:', e.message);
}

await mobile.close();
await browser.close();

// Copy to artifacts
console.log('\n📦 Copying to artifacts...');
try {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  const files = ['home.png', 'login.png', 'setup.png', 'dashboard.png', 'contatos.png', 'automacoes.png', 'inbox.png', 'settings.png', 'mobile-drawer.png'];
  
  for (const file of files) {
    try {
      await copyFile(`${OUTPUT_DIR}/${file}`, `${ARTIFACTS_DIR}/${file}`);
      console.log(`✓ ${file}`);
    } catch (e) {
      console.log(`⚠ ${file} not found`);
    }
  }
} catch (error) {
  console.log('⚠ Could not copy to artifacts:', error.message);
}

console.log('\n✅ Screenshots complete!');

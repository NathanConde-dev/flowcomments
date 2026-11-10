#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, copyFile } from 'fs/promises';

const BASE_URL = 'http://localhost:8080';
const OUTPUT_DIR = 'docs/screenshots';
const ARTIFACTS_DIR = '/opt/cursor/artifacts';

const browser = await chromium.launch({ headless: true });

// Desktop screenshots (1440px)
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await desktop.newPage();

// Go to login
await page.goto(`${BASE_URL}/login`);
await page.waitForTimeout(1000);

// Try to login
try {
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log('✓ Logged in');
} catch (e) {
  console.log('⚠ Login failed, trying setup first');
  // Try setup if login fails
  await page.goto(`${BASE_URL}/setup`);
  await page.waitForTimeout(1000);
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="email"]', 'admin@test.com');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
}

console.log('\n📸 Capturing authenticated pages...');

// Dashboard
await page.goto(`${BASE_URL}/dashboard`);
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUTPUT_DIR}/dashboard.png`, fullPage: true });
console.log('✓ dashboard.png');

// Contacts
await page.goto(`${BASE_URL}/contacts`);
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUTPUT_DIR}/contatos.png`, fullPage: true });
console.log('✓ contatos.png');

// Automations
await page.goto(`${BASE_URL}/automations`);
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUTPUT_DIR}/automacoes.png`, fullPage: true });
console.log('✓ automacoes.png');

// Inbox
await page.goto(`${BASE_URL}/inbox`);
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUTPUT_DIR}/inbox.png`, fullPage: true });
console.log('✓ inbox.png');

// Settings
await page.goto(`${BASE_URL}/settings`);
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUTPUT_DIR}/settings.png`, fullPage: true });
console.log('✓ settings.png');

await desktop.close();

// Mobile (390px)
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mobilePage = await mobile.newPage();

await mobilePage.goto(`${BASE_URL}/login`);
await mobilePage.fill('input[type="text"]', 'admin');
await mobilePage.fill('input[type="password"]', 'admin123');
await mobilePage.click('button[type="submit"]');
await mobilePage.waitForTimeout(3000);

await mobilePage.goto(`${BASE_URL}/dashboard`);
await mobilePage.waitForTimeout(1000);

// Click menu
const menuBtn = await mobilePage.locator('button').first();
await menuBtn.click();
await mobilePage.waitForTimeout(500);

await mobilePage.screenshot({ path: `${OUTPUT_DIR}/mobile-drawer.png` });
console.log('✓ mobile-drawer.png');

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

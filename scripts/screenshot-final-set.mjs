#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, copyFile } from 'fs/promises';

const BASE_URL = 'http://localhost:8080';
const OUTPUT_DIR = 'docs/screenshots';
const ARTIFACTS_DIR = '/opt/cursor/artifacts';

const browser = await chromium.launch({ headless: true });
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await desktop.newPage();

// Login
await page.goto(`${BASE_URL}/login`);
await page.fill('input[type="text"]', 'admin');
await page.fill('input[type="password"]', 'admin123');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);

console.log('\n📸 Capturing final screenshots...');

// Dashboard
await page.goto(`${BASE_URL}/dashboard`);
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUTPUT_DIR}/dashboard.png`, fullPage: true });
console.log('✓ dashboard.png');

// Automations
await page.goto(`${BASE_URL}/automations`);
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUTPUT_DIR}/automacoes.png`, fullPage: true });
console.log('✓ automacoes.png');

// Settings Meta (full scroll)
await page.goto(`${BASE_URL}/settings/meta`);
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUTPUT_DIR}/settings-meta.png`, fullPage: true });
console.log('✓ settings-meta.png (full page)');

// Settings Instagram
await page.goto(`${BASE_URL}/settings/instagram`);
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUTPUT_DIR}/settings-instagram.png`, fullPage: true });
console.log('✓ settings-instagram.png');

// Mobile drawer
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mobilePage = await mobile.newPage();

await mobilePage.goto(`${BASE_URL}/login`);
await mobilePage.fill('input[type="text"]', 'admin');
await mobilePage.fill('input[type="password"]', 'admin123');
await mobilePage.click('button[type="submit"]');
await mobilePage.waitForTimeout(3000);

await mobilePage.goto(`${BASE_URL}/dashboard`);
await mobilePage.waitForTimeout(1000);

const menuBtn = await mobilePage.locator('button').first();
await menuBtn.click();
await mobilePage.waitForTimeout(500);

await mobilePage.screenshot({ path: `${OUTPUT_DIR}/mobile-drawer.png` });
console.log('✓ mobile-drawer.png');

await mobile.close();
await browser.close();

// Copy to artifacts
console.log('\n📦 Copying to artifacts...');
const files = ['dashboard.png', 'automacoes.png', 'settings-meta.png', 'settings-instagram.png', 'mobile-drawer.png'];

for (const file of files) {
  try {
    await copyFile(`${OUTPUT_DIR}/${file}`, `${ARTIFACTS_DIR}/${file}`);
    console.log(`✓ ${file}`);
  } catch (e) {
    console.log(`⚠ ${file} failed`);
  }
}

console.log('\n✅ Final screenshots complete!');

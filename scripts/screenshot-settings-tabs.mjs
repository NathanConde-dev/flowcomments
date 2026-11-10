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

console.log('\n📸 Capturing settings tabs...');

const tabs = [
  { name: 'geral', url: '/settings' },
  { name: 'instagram', url: '/settings/instagram' },
  { name: 'meta', url: '/settings/meta' },
  { name: 'mcp', url: '/settings/mcp' },
  { name: 'conta', url: '/settings/account' },
];

for (const tab of tabs) {
  await page.goto(`${BASE_URL}${tab.url}`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUTPUT_DIR}/settings-${tab.name}.png`, fullPage: true });
  console.log(`✓ settings-${tab.name}.png`);
}

await browser.close();

// Copy to artifacts
console.log('\n📦 Copying to artifacts...');
for (const tab of tabs) {
  try {
    await copyFile(`${OUTPUT_DIR}/settings-${tab.name}.png`, `${ARTIFACTS_DIR}/settings-${tab.name}.png`);
    console.log(`✓ settings-${tab.name}.png`);
  } catch (e) {
    console.log(`⚠ settings-${tab.name}.png not found`);
  }
}

console.log('\n✅ Settings tabs screenshots complete!');

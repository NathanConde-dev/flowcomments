#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const OUTPUT_DIR = 'docs/screenshots';
const ARTIFACTS_DIR = '/opt/cursor/artifacts';

// Wait for migrations/setup
await new Promise(resolve => setTimeout(resolve, 8000));

const browser = await chromium.launch({ headless: true });

// Desktop screenshots (1440px)
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const desktopPage = await desktop.newPage();

console.log('📸 Capturing desktop screenshots (1440px)...');

// Home page
await desktopPage.goto(`${BASE_URL}/`);
await desktopPage.waitForLoadState('networkidle');
await desktopPage.screenshot({ path: `${OUTPUT_DIR}/home.png`, fullPage: true });
console.log('✓ home.png');

// Login page
await desktopPage.goto(`${BASE_URL}/login`);
await desktopPage.waitForLoadState('networkidle');
await desktopPage.screenshot({ path: `${OUTPUT_DIR}/login.png`, fullPage: true });
console.log('✓ login.png');

// Setup page
await desktopPage.goto(`${BASE_URL}/setup`);
await desktopPage.waitForLoadState('networkidle');
await desktopPage.screenshot({ path: `${OUTPUT_DIR}/setup.png`, fullPage: true });
console.log('✓ setup.png');

// Login to access protected pages
await desktopPage.goto(`${BASE_URL}/login`);
await desktopPage.fill('input[name="username"]', 'admin');
await desktopPage.fill('input[name="password"]', 'admin123');
await desktopPage.click('button[type="submit"]');
await desktopPage.waitForURL('**/dashboard', { timeout: 10000 });

// Contatos
await desktopPage.goto(`${BASE_URL}/contacts`);
await desktopPage.waitForLoadState('networkidle');
await desktopPage.screenshot({ path: `${OUTPUT_DIR}/contatos.png`, fullPage: true });
console.log('✓ contatos.png');

// Automações
await desktopPage.goto(`${BASE_URL}/automations`);
await desktopPage.waitForLoadState('networkidle');
await desktopPage.screenshot({ path: `${OUTPUT_DIR}/automacoes.png`, fullPage: true });
console.log('✓ automacoes.png');

// Inbox
await desktopPage.goto(`${BASE_URL}/inbox`);
await desktopPage.waitForLoadState('networkidle');
await desktopPage.screenshot({ path: `${OUTPUT_DIR}/inbox.png`, fullPage: true });
console.log('✓ inbox.png');

// Settings - Geral
await desktopPage.goto(`${BASE_URL}/settings`);
await desktopPage.waitForLoadState('networkidle');
await desktopPage.screenshot({ path: `${OUTPUT_DIR}/settings-geral.png`, fullPage: true });
console.log('✓ settings-geral.png');

// Settings - Instagram
await desktopPage.goto(`${BASE_URL}/settings?tab=instagram`);
await desktopPage.waitForLoadState('networkidle');
await desktopPage.screenshot({ path: `${OUTPUT_DIR}/settings-instagram.png`, fullPage: true });
console.log('✓ settings-instagram.png');

// Settings - Meta
await desktopPage.goto(`${BASE_URL}/settings?tab=meta`);
await desktopPage.waitForLoadState('networkidle');
await desktopPage.screenshot({ path: `${OUTPUT_DIR}/settings-meta.png`, fullPage: true });
console.log('✓ settings-meta.png');

// Settings - MCP
await desktopPage.goto(`${BASE_URL}/settings?tab=mcp`);
await desktopPage.waitForLoadState('networkidle');
await desktopPage.screenshot({ path: `${OUTPUT_DIR}/settings-mcp.png`, fullPage: true });
console.log('✓ settings-mcp.png');

await desktop.close();

// Mobile screenshots (390px with drawer)
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mobilePage = await mobile.newPage();

console.log('\n📱 Capturing mobile screenshot (390px)...');

// Login first
await mobilePage.goto(`${BASE_URL}/login`);
await mobilePage.fill('input[name="username"]', 'admin');
await mobilePage.fill('input[name="password"]', 'admin123');
await mobilePage.click('button[type="submit"]');
await mobilePage.waitForURL('**/dashboard', { timeout: 10000 });

// Go to dashboard and open drawer
await mobilePage.goto(`${BASE_URL}/dashboard`);
await mobilePage.waitForLoadState('networkidle');

// Click hamburger menu to open drawer
const menuButton = await mobilePage.locator('button[aria-label="Menu"], button:has-text("Menu"), button:has(svg)').first();
if (await menuButton.isVisible()) {
  await menuButton.click();
  await mobilePage.waitForTimeout(500);
}

await mobilePage.screenshot({ path: `${OUTPUT_DIR}/mobile-drawer.png`, fullPage: false });
console.log('✓ mobile-drawer.png');

await mobile.close();
await browser.close();

// Copy to artifacts
console.log('\n📦 Copying to artifacts...');
try {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  const { copyFile } = await import('fs/promises');
  const { readdir } = await import('fs/promises');
  
  const files = await readdir(OUTPUT_DIR);
  for (const file of files) {
    if (file.endsWith('.png')) {
      await copyFile(`${OUTPUT_DIR}/${file}`, `${ARTIFACTS_DIR}/${file}`);
      console.log(`✓ ${file} → artifacts`);
    }
  }
} catch (error) {
  console.log('⚠ Could not copy to artifacts:', error.message);
}

console.log('\n✅ All screenshots generated!');

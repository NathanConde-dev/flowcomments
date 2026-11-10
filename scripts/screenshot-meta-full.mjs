#!/usr/bin/env node
import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8080';
const ARTIFACTS_DIR = '/opt/cursor/artifacts';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// Login
await page.goto(`${BASE_URL}/login`);
await page.fill('input[type="text"]', 'admin');
await page.fill('input[type="password"]', 'admin123');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);

// Go to Meta settings
await page.goto(`${BASE_URL}/settings/meta`);
await page.waitForTimeout(2000);

// Scroll to bottom to ensure all content loads
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1000);

// Take full page screenshot
await page.screenshot({ path: `${ARTIFACTS_DIR}/settings-meta.png`, fullPage: true });
console.log('✓ settings-meta.png (scrolled + fullPage)');

await browser.close();

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

await mkdir('/opt/cursor/artifacts', { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 }
});
const page = await context.newPage();

// Setup wizard step 1 (admin)
await page.goto('http://localhost:8080/setup');
await page.waitForLoadState('networkidle');
await page.screenshot({ path: '/opt/cursor/artifacts/setup-wizard-step1.png', fullPage: true });
console.log('✓ Wizard step 1 screenshot saved');

// Fill admin and go to step 2
await page.fill('input[placeholder="admin"]', 'testadmin');
await page.fill('input[type="email"]', 'test@example.com');
await page.fill('input[placeholder="••••••••"]', 'testpass123');
const passwordInputs = await page.locator('input[placeholder="••••••••"]').all();
await passwordInputs[1].fill('testpass123');
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);

// Setup wizard step 2 (Meta config) with help buttons
await page.screenshot({ path: '/opt/cursor/artifacts/setup-wizard-step2.png', fullPage: true });
console.log('✓ Wizard step 2 with help buttons screenshot saved');

// Click help icon on App ID field to show modal
const helpButtons = await page.locator('button[aria-label="Ajuda"]').or(page.locator('button').filter({ hasText: /^\?$/ })).or(page.locator('svg.lucide-help-circle').locator('..')).all();
if (helpButtons.length > 0) {
  await helpButtons[0].click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/opt/cursor/artifacts/setup-help-modal.png', fullPage: true });
  console.log('✓ Help modal screenshot saved');
}

await browser.close();
console.log('\n✅ All wizard screenshots saved to /opt/cursor/artifacts/');

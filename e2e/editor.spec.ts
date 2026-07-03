import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const fixture = fileURLToPath(new URL('./fixtures/sample.png', import.meta.url));

test('uploads, edits, crops and exports an image', async ({ page }) => {
  await page.goto('/');

  await page.setInputFiles('input[accept="image/*"]', fixture);
  await expect(page.getByText('sample.png')).toBeVisible();

  const brightness = page.getByRole('slider').first();
  await brightness.focus();
  await brightness.press('End');
  await expect(brightness).toHaveAttribute('aria-valuenow', '100');

  await page.getByRole('button', { name: 'Crop', exact: true }).click();
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByRole('button', { name: 'Remove crop' })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('sample');
});

test('exports the operations as a replayable json document', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('input[accept="image/*"]', fixture);
  await expect(page.getByText('sample.png')).toBeVisible();

  await page.getByRole('button', { name: 'More actions' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('listitem').filter({ hasText: 'Export edits (JSON)' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('.json');
});

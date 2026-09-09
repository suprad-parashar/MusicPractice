import { expect, test, type Page } from '@playwright/test';

async function navigate(page: Page, name: string) {
  const toggle = page.getByRole('button', { name: 'Open navigation' });
  if (await toggle.isVisible()) await toggle.click();
  await page
    .getByRole('navigation', { name: 'Practice sections' })
    .getByRole('button', { name, exact: true })
    .click();
  await expect(page.locator('.page-heading h1')).toHaveText(name);
}

async function openTools(page: Page) {
  const toggle = page.getByRole('button', { name: 'Practice tools', exact: true });
  // The icon-only mobile button has the same accessible name.
  if (await toggle.isVisible()) await toggle.click();
}

async function closeTools(page: Page) {
  const close = page.getByRole('button', { name: 'Close practice tools' });
  if (await close.isVisible()) await close.click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.page-heading h1')).toBeVisible();
});

test('raga search supports keyboard selection, playback, tempo, and loop', async ({ page }) => {
  await openTools(page);
  await page.getByLabel('Instrument', { exact: true }).selectOption('sine');
  await closeTools(page);
  const search = page.getByRole('combobox', { name: 'Find a raga' });
  await search.fill('Mohanam');
  await search.press('Enter');
  await expect(page.locator('.raga-card-heading h3')).toHaveText('Mohanam');
  await page.getByRole('button', { name: 'Play raga', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop raga' })).toBeVisible();
  await expect(page.locator('.swara-chip.is-active')).toHaveCount(1);
  await page.getByRole('button', { name: 'Loop playback' }).click();
  await expect(page.getByRole('button', { name: 'Loop playback' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('textbox', { name: 'Tempo BPM', exact: true }).fill('150');
  await page.getByRole('textbox', { name: 'Tempo BPM', exact: true }).press('Enter');
  await expect(page.getByRole('textbox', { name: 'Tempo BPM', exact: true })).toHaveValue('150');
  await page.getByRole('button', { name: 'Stop raga' }).click();
  await expect(page.locator('.swara-chip.is-active')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.raga-card-heading h3')).toHaveText('Mohanam');
  await expect(page.getByRole('button', { name: 'Loop playback' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('preferences, reference key, and notation survive a reload', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Practice key' }).selectOption('G#');
  const navToggle = page.getByRole('button', { name: 'Open navigation' });
  if (await navToggle.isVisible()) await navToggle.click();
  await page.getByRole('button', { name: 'Preferences', exact: true }).click();
  await page.getByRole('button', { name: 'Midnight', exact: true }).click();
  await page.getByLabel('Notation language').selectOption('devanagari');
  await page.getByRole('button', { name: 'Ocean accent' }).click();
  await page.getByRole('button', { name: 'Close preferences' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark-slate');
  await expect(page.getByRole('combobox', { name: 'Practice key' })).toHaveValue('G#');
  await expect(page.locator('.swara-chip').first()).toContainText('स');
  expect(
    await page.evaluate(() => document.documentElement.style.getPropertyValue('--accent')),
  ).toBe('#36658c');
});

test('every section and practice sub-section remains reachable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await navigate(page, 'Exercises');
  await expect(page.getByRole('radio', { name: 'Varisais', exact: true })).toBeChecked();
  for (const label of ['Warm-ups', 'Voice patterns', 'Varisais']) {
    await page.getByRole('radio', { name: label, exact: true }).check();
    await expect(page.getByRole('radio', { name: label, exact: true })).toBeChecked();
    await expect(page.locator('.feature-panel')).toBeVisible();
  }
  for (const label of ['Ear training', 'Rhythm', 'Compositions', 'Learn'])
    await navigate(page, label);
  await page.getByRole('radio', { name: 'Reading sheet music' }).check();
  await expect(page.getByRole('radio', { name: 'Reading sheet music' })).toBeChecked();
  expect(errors).toEqual([]);
});

test('composition filters, legacy links, and returning to the library work', async ({ page }) => {
  await navigate(page, 'Compositions');
  await page
    .getByRole('searchbox', { name: 'Search compositions' })
    .fill('no matching composition');
  await expect(page.getByRole('heading', { name: 'No compositions found.' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.composition-row')).toHaveCount(5);
  await page.goto('/?song=mere_dholna');
  await expect(page.locator('.page-heading h1')).toHaveText('Compositions');
  await expect(page.getByRole('button', { name: 'Back to compositions' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to compositions' }).click();
  await expect(page.locator('.composition-row')).toHaveCount(5);
  await page.reload();
  await expect(page.locator('.composition-row')).toHaveCount(5);
});

test('accompaniment starts, stops, and stays mounted while navigating', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openTools(page);
  await page.getByRole('button', { name: 'Play metronome', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop metronome' })).toBeVisible();
  await closeTools(page);
  await navigate(page, 'Exercises');
  await openTools(page);
  await expect(page.getByRole('button', { name: 'Stop metronome' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop metronome' }).click();
  await page.getByRole('button', { name: 'Play tanpura', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop tanpura' })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Stop tanpura' }).click();
  expect(errors).toEqual([]);
});

test('exercises support keyboard playback and guided practice from a selected exercise', async ({
  page,
}) => {
  await openTools(page);
  await page.getByLabel('Instrument', { exact: true }).selectOption('sine');
  await closeTools(page);
  await navigate(page, 'Exercises');
  await page.getByLabel('Varisai type').selectOption('janta');
  await page.getByRole('button', { name: 'Exercise 2', exact: true }).click();
  await expect(page.locator('.exercise-notes-heading')).toHaveText('Janta Varisai 2');
  await page.locator('.exercise-note').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Stop exercise', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Stop exercise', exact: true }).click();
  await page.getByRole('radio', { name: 'Listen & repeat', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Start from current exercise' }).check();
  await page.getByRole('button', { name: 'Exercise 3', exact: true }).click();
  await page.getByRole('button', { name: 'Play exercise', exact: true }).click();
  await expect(page.locator('.exercise-guidance')).toContainText('Exercise 3 of');
  await expect(page.getByRole('radio', { name: 'Listen & repeat', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Stop exercise', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Single exercise', exact: true })).toBeChecked();
  await page.getByRole('radio', { name: 'Listen & repeat', exact: true }).check();
  await page.reload();
  await expect(page.getByLabel('Varisai type')).toHaveValue('janta');
  await expect(page.getByRole('radio', { name: 'Listen & repeat', exact: true })).toBeChecked();
});

test('warm-up, voice pattern, and ear-training choices survive returning to a screen', async ({
  page,
}) => {
  await navigate(page, 'Exercises');
  await page.getByRole('radio', { name: 'Warm-ups', exact: true }).check();
  await page.getByRole('button', { name: 'Chromatic', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tempo BPM', exact: true }).fill('155');
  await page.getByRole('textbox', { name: 'Tempo BPM', exact: true }).press('Enter');
  await page.getByRole('radio', { name: 'Voice patterns', exact: true }).check();
  await page.getByRole('textbox', { name: 'Number of notes', exact: true }).fill('7');
  await page.getByRole('textbox', { name: 'Number of notes', exact: true }).press('Tab');
  await page.getByRole('radio', { name: 'Warm-ups', exact: true }).check();
  await expect(page.locator('.feature-heading h2')).toHaveText('Chromatic');
  await expect(page.getByRole('textbox', { name: 'Tempo BPM', exact: true })).toHaveValue('155');
  await page.getByRole('radio', { name: 'Voice patterns', exact: true }).check();
  await expect(page.getByRole('textbox', { name: 'Number of notes', exact: true })).toHaveValue(
    '7',
  );
  await navigate(page, 'Ear training');
  await page.getByRole('button', { name: 'Timed', exact: true }).click();
  await page.getByRole('button', { name: '2 notes', exact: true }).click();
  await page.getByRole('checkbox', { name: 'End game if wrong (high-score mode)' }).check();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Timed', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: '2 notes', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(
    page.getByRole('checkbox', { name: 'End game if wrong (high-score mode)' }),
  ).toBeChecked();
});

test('composition reference playback cannot stop the studio metronome', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openTools(page);
  await page.getByLabel('Instrument', { exact: true }).selectOption('sine');
  await page.getByRole('button', { name: 'Play metronome', exact: true }).click();
  await closeTools(page);
  await navigate(page, 'Compositions');

  const readBeat = () =>
    page
      .locator('.beat-indicators > span')
      .evaluateAll((beats) => beats.findIndex((beat) => beat.classList.contains('is-active')));
  const expectBeatAdvancing = async () => {
    await expect.poll(readBeat).toBeGreaterThanOrEqual(0);
    const initial = await readBeat();
    await expect
      .poll(async () => {
        const next = await readBeat();
        return next >= 0 && next !== initial;
      })
      .toBe(true);
  };

  // Exercise both the song and the chittaswaram adapters without a page reload.
  for (const title of ['Sri Gananatha', 'Mere Dholna']) {
    await page.locator('.composition-row').filter({ hasText: title }).first().click();
    const reference = page.locator('.composition-reference');
    await reference.locator('summary').click();
    await reference.getByRole('button', { name: 'Play tala', exact: true }).click();
    await expect(reference.locator('.reference-beat.is-active')).toHaveCount(1);
    await expectBeatAdvancing();
    await reference.getByRole('button', { name: 'Stop tala', exact: true }).click();
    await expectBeatAdvancing();
    await reference.getByRole('button', { name: 'Play scale', exact: true }).click();
    await expect(reference.locator('.reference-scale-notes .is-active')).toHaveCount(1);
    await reference.getByRole('button', { name: 'Stop scale', exact: true }).click();
    await page.getByRole('button', { name: 'Back to compositions' }).click();
    await expectBeatAdvancing();
  }
  await openTools(page);
  await page.getByRole('button', { name: 'Stop metronome', exact: true }).click();
  expect(errors).toEqual([]);
});

test('narrow layouts and mobile drawers remain usable with a keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('dialog', { name: 'Main navigation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await openTools(page);
  await expect(page.getByRole('dialog', { name: 'Practice tools' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Practice tools' })).toHaveCount(0);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

// Smooth scrolling is handled via CSS (scroll-behavior: smooth).
// Enhance keyboard focus after nav click.
document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('.nav-list a');
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        const target = document.querySelector(href);
        if (target) {
          // Allow CSS smooth scroll, then focus the section title
          setTimeout(() => {
            const title = target.querySelector('.section-title');
            if (title) title.setAttribute('tabindex', '-1'), title.focus();
          }, 300);
        }
      }
    });
  });

  // Prevent accidental horizontal scroll
  document.documentElement.style.overflowX = 'hidden';

  // Service Worker registration (PWA-ready structure)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then((reg) => console.log('Service Worker registered:', reg.scope))
        .catch((err) => console.log('Service Worker registration skipped/failed:', err));
    });
  }
});

// Add to app.js - Load verses from JSON
async function loadVerses() {
  const response = await fetch('./data/verses.json');
  return await response.json();
}

// Render a single verse as a card
function renderVerseCard(verse) {
  const arabicText = verse.displayArabic || verse.arabic || '';

  const translationRaw = verse.translation || '';
  // Remove unintended leading full stop and surrounding whitespace
  const cleanTranslation = translationRaw.replace(/^\s*\.?\s*/, '');

  // Build reference text: prefer explicit reference, otherwise use Surah + verse
  const refText = verse.reference
    ? verse.reference
    : (verse.surah && verse.verse ? `${verse.surah} ${verse.verse}` : '');
  const refHtml = refText ? ` <span class="ref">(${refText})</span>` : '';

  return `
    <div class="verse-card">
      <div class="arabic-text quran-verse">${arabicText}</div>
      <div class="translation subtle">${cleanTranslation}${refHtml}</div>
    </div>
  `;
}

function renderSection(containerId, verses) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = verses.map(renderVerseCard).join('');
}

let currentTargetedKey = null;

function toggleTargetedVerses(key, verses) {
  const container = document.getElementById('targeted-verses');
  const titleEl = document.getElementById('targeted-title');
  if (!container) return;
  const labels = { sihr: 'Sihr', evilEye: 'Evil Eye', healing: 'Healing' };
  const isVisible = container.style.display !== 'none' && container.innerHTML.trim() !== '';
  if (isVisible && currentTargetedKey === key) {
    container.style.display = 'none';
    container.innerHTML = '';
    currentTargetedKey = null;
    if (titleEl) { titleEl.textContent = 'Targeted Verses'; titleEl.style.display = 'none'; }
  } else {
    container.style.display = 'block';
    renderSection('targeted-verses', verses);
    currentTargetedKey = key;
    if (titleEl) { titleEl.textContent = `${labels[key] || 'Targeted'} Targeted Verses`; titleEl.style.display = 'block'; }
  }
}

function setupButtons(versesData) {
  const sihrBtn = document.getElementById('sihr-btn');
  const evilEyeBtn = document.getElementById('evil-eye-btn');
  const healingBtn = document.getElementById('healing-btn');

  if (sihrBtn) sihrBtn.onclick = () => toggleTargetedVerses('sihr', versesData.targetedVerses.sihr);
  if (evilEyeBtn) evilEyeBtn.onclick = () => toggleTargetedVerses('evilEye', versesData.targetedVerses.evilEye);
  if (healingBtn) healingBtn.onclick = () => toggleTargetedVerses('healing', versesData.targetedVerses.healing);
}

function showTargetedVerses(verses) {
  const container = document.getElementById('targeted-verses');
  if (!container) return;
  container.style.display = 'block';
  renderSection('targeted-verses', verses);
}

async function initApp() {
  const versesData = await loadVerses();
  renderSection('opening-supplications', versesData.supplications.opening);
  renderSection('core-verses', versesData.coreVerses);
  renderSection('closing-supplications', versesData.supplications.closing);
  setupButtons(versesData);

  const targetedContainer = document.getElementById('targeted-verses');
  if (targetedContainer) targetedContainer.style.display = 'none';
  const targetedTitle = document.getElementById('targeted-title');
  if (targetedTitle) targetedTitle.style.display = 'none';

  const toggleCoreBtn = document.getElementById('toggle-core-btn');
  const coreContainer = document.getElementById('core-verses');
  if (toggleCoreBtn && coreContainer) {
    // Start hidden with "Show" label
    coreContainer.style.display = 'none';
    toggleCoreBtn.setAttribute('aria-pressed', 'false');
    toggleCoreBtn.innerHTML = '<i class="fa-regular fa-eye" aria-hidden="true"></i> Show';

    toggleCoreBtn.addEventListener('click', () => {
      const isHidden = coreContainer.style.display === 'none';
      // Toggle visibility
      coreContainer.style.display = isHidden ? 'block' : 'none';
      // Update label and icon
      toggleCoreBtn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
      const iconClass = isHidden ? 'fa-solid fa-eye-slash' : 'fa-regular fa-eye';
      const labelText = isHidden ? 'Hide' : 'Show';
      toggleCoreBtn.innerHTML = `<i class="${iconClass}" aria-hidden="true"></i> ${labelText}`;
    });
  }
}
document.addEventListener('DOMContentLoaded', initApp);
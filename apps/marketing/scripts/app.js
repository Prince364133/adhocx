/**
 * AdhocX Marketing Web Application - Interactive Logic
 * Zero-dependency, accessible, highly responsive client script.
 */

document.addEventListener('DOMContentLoaded', () => {
  initEarningsCalculator();
  initLeadForm();
  initMobileMenu();
});

/* ==========================================================================
   1. Interactive Driver Earnings Calculator
   ========================================================================== */
function initEarningsCalculator() {
  const vehicleSelect = document.getElementById('calc-vehicle');
  const hoursSlider = document.getElementById('calc-hours');
  const hoursDisplay = document.getElementById('calc-hours-val');
  const daysSelect = document.getElementById('calc-days');

  const weeklyBaseElem = document.getElementById('calc-weekly-base');
  const monthlyBaseElem = document.getElementById('calc-monthly-base');
  const bonusElem = document.getElementById('calc-bonus');
  const grandTotalElem = document.getElementById('calc-grand-total');

  if (!vehicleSelect || !hoursSlider || !grandTotalElem) return;

  // Base hourly rates per vehicle category in INR
  const rateCards = {
    hatchback: 180,  // Mini Hatchback
    sedan: 220,      // Prime Sedan
    suv: 280,        // SUV (Ertiga / Innova)
    traveller: 360   // Tempo Traveller / Large
  };

  function updateCalculator() {
    const category = vehicleSelect.value;
    const hours = parseInt(hoursSlider.value, 10);
    const days = parseInt(daysSelect.value, 10);

    if (hoursDisplay) {
      hoursDisplay.textContent = `${hours} hrs`;
    }

    const hourlyRate = rateCards[category] || 220;
    const dailyEarnings = hourlyRate * hours;
    const weeklyEarnings = dailyEarnings * days;
    const monthlyBaseEarnings = Math.round(weeklyEarnings * 4.33);
    const centuryBonus = 2000; // Fixed ₹2,000 Century Milestone Bonus

    const totalProjected = monthlyBaseEarnings + centuryBonus;

    if (weeklyBaseElem) weeklyBaseElem.textContent = `₹${weeklyEarnings.toLocaleString('en-IN')}`;
    if (monthlyBaseElem) monthlyBaseElem.textContent = `₹${monthlyBaseEarnings.toLocaleString('en-IN')}`;
    if (bonusElem) bonusElem.textContent = `+ ₹${centuryBonus.toLocaleString('en-IN')}`;
    if (grandTotalElem) grandTotalElem.textContent = `₹${totalProjected.toLocaleString('en-IN')} / mo`;
  }

  vehicleSelect.addEventListener('change', updateCalculator);
  hoursSlider.addEventListener('input', updateCalculator);
  daysSelect.addEventListener('change', updateCalculator);

  // Initial calculation run
  updateCalculator();
}

/* ==========================================================================
   2. Enterprise Lead Form Validation & Confirmation Modal
   ========================================================================== */
function initLeadForm() {
  const leadForm = document.getElementById('enterprise-lead-form');
  const modal = document.getElementById('lead-success-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const modalRefId = document.getElementById('modal-ref-id');

  if (!leadForm) return;

  leadForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const companyName = document.getElementById('lead-company')?.value.trim();
    const email = document.getElementById('lead-email')?.value.trim();
    const city = document.getElementById('lead-city')?.value;
    const demand = document.getElementById('lead-demand')?.value;
    const phone = document.getElementById('lead-phone')?.value.trim();

    if (!companyName || !email || !city || !demand || !phone) {
      alert('Please fill out all required fields.');
      return;
    }

    // 10-digit Indian Mobile Validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      alert('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    // Work email basic check
    if (!email.includes('@') || email.endsWith('@gmail.com') || email.endsWith('@yahoo.com') || email.endsWith('@hotmail.com')) {
      if (!confirm('You entered a public email provider. We recommend using your official business work email for corporate fulfillment setup. Continue anyway?')) {
        return;
      }
    }

    // Generate reference ID
    const refId = 'ADHOC-' + Math.floor(100000 + Math.random() * 900000);
    if (modalRefId) modalRefId.textContent = refId;

    // Show Success Modal
    if (modal) {
      modal.classList.add('active');
    }

    leadForm.reset();
  });

  if (closeModalBtn && modal) {
    closeModalBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }
}

/* ==========================================================================
   3. Responsive Mobile Menu Drawer & Toggle
   ========================================================================== */
function initMobileMenu() {
  const toggleBtn = document.getElementById('menu-toggle-btn') || document.querySelector('.menu-toggle');
  const navLinks = document.getElementById('primary-nav-links') || document.querySelector('.nav-links');
  const hamburgerIcon = toggleBtn?.querySelector('.hamburger-icon');
  const closeIcon = toggleBtn?.querySelector('.close-icon');

  if (!toggleBtn || !navLinks) return;

  function closeMenu() {
    navLinks.classList.remove('active');
    toggleBtn.setAttribute('aria-expanded', 'false');
    if (hamburgerIcon) hamburgerIcon.style.display = 'block';
    if (closeIcon) closeIcon.style.display = 'none';
  }

  function openMenu() {
    navLinks.classList.add('active');
    toggleBtn.setAttribute('aria-expanded', 'true');
    if (hamburgerIcon) hamburgerIcon.style.display = 'none';
    if (closeIcon) closeIcon.style.display = 'block';
  }

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = navLinks.classList.contains('active');
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Close menu when clicking any nav link
  const links = navLinks.querySelectorAll('a');
  links.forEach((link) => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!toggleBtn.contains(e.target) && !navLinks.contains(e.target)) {
      closeMenu();
    }
  });

  // Close menu on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
    }
  });
}

/**
 * AdhocX Marketing Web Application - Interactive Logic
 * Zero-dependency, accessible, highly responsive client script.
 */

document.addEventListener('DOMContentLoaded', () => {
  initLeadForm();
  initDriverSignupForm();
  initMobileMenu();
});

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
   3. Driver Registration Form & Milestone Confirmation Modal
   ========================================================================== */
function initDriverSignupForm() {
  const driverForm = document.getElementById('driver-signup-form');
  const modal = document.getElementById('driver-success-modal');
  const closeModalBtn = document.getElementById('close-driver-modal-btn');
  const refIdElem = document.getElementById('driver-ref-id');

  if (!driverForm) return;

  driverForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('driver-name')?.value.trim();
    const phone = document.getElementById('driver-phone')?.value.trim();

    if (!name || !phone) {
      alert('Please fill out your name and mobile number.');
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      alert('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    const refId = 'DRV-' + Math.floor(10000 + Math.random() * 90000);
    if (refIdElem) refIdElem.textContent = refId;

    if (modal) {
      modal.classList.add('active');
    }

    driverForm.reset();
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
   4. Responsive Mobile Menu Drawer & Toggle
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

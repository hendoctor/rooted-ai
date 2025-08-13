const initServicesLearnMore = () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cards = document.querySelectorAll<HTMLElement>('.service-card');

  cards.forEach((card, index) => {
    const button = card.querySelector<HTMLButtonElement>('[data-learn-more]');
    const featureList = card.querySelector<HTMLUListElement>('[data-feature-list]');
    if (!button || !featureList) return;

    const serviceName = card.querySelector('h3')?.textContent?.trim() || 'Service';
    const detailsId = `service-details-${index}`;

    let details = card.querySelector<HTMLDivElement>('[data-service-details]');
    if (!details) {
      details = document.createElement('div');
      details.setAttribute('data-service-details', '');
      details.id = detailsId;
      details.setAttribute('role', 'region');
      details.setAttribute('aria-label', `${serviceName} details`);
      details.className = 'service-details overflow-hidden transition-[height] duration-300 ease-in-out mt-4 motion-reduce:transition-none';
      details.hidden = true;
      featureList.insertAdjacentElement('afterend', details);
    }

    const items = Array.from(featureList.querySelectorAll<HTMLLIElement>('li'));
    items.forEach((li) => {
      const title = li.querySelector('span')?.textContent?.trim();
      if (!title) return;

      let desc = li.getAttribute('data-detail')?.trim();
      if (!desc) {
        const span = li.querySelector<HTMLSpanElement>('span.detail');
        if (span) desc = span.textContent?.trim() || undefined;
      }

      const item = document.createElement('div');
      item.className = 'service-detail-item py-2';

      const titleEl = document.createElement('div');
      titleEl.className = 'service-detail-title text-forest-green font-medium';
      titleEl.textContent = title;
      item.appendChild(titleEl);

      if (desc) {
        const descEl = document.createElement('div');
        descEl.className = 'service-detail-desc text-slate-gray text-sm mt-1';
        descEl.textContent = desc;
        item.appendChild(descEl);
      }

      details?.appendChild(item);
    });

    featureList.hidden = true;

    const label = button.querySelector<HTMLElement>('.label');
    const chevron = button.querySelector<HTMLElement>('svg');

    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', detailsId);

    const openDetails = () => {
      if (!details) return;
      details.hidden = false;
      const height = details.scrollHeight;
      details.style.height = '0px';
      requestAnimationFrame(() => {
        details!.style.height = `${height}px`;
      });
      const onEnd = () => {
        details!.style.height = '';
        details!.removeEventListener('transitionend', onEnd);
      };
      details.addEventListener('transitionend', onEnd);
    };

    const closeDetails = () => {
      if (!details) return;
      const height = details.scrollHeight;
      details.style.height = `${height}px`;
      requestAnimationFrame(() => {
        details!.style.height = '0px';
      });
      const onEnd = () => {
        details!.hidden = true;
        details!.style.height = '';
        details!.removeEventListener('transitionend', onEnd);
      };
      details.addEventListener('transitionend', onEnd);
    };

    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      const next = !expanded;
      button.setAttribute('aria-expanded', String(next));
      if (label) label.textContent = next ? 'Show Less' : 'Learn More';
      if (chevron) chevron.classList.toggle('rotate-180', next);

      if (prefersReducedMotion) {
        details!.hidden = !next;
        return;
      }

      if (next) {
        openDetails();
      } else {
        closeDetails();
      }
    });
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initServicesLearnMore);
} else {
  initServicesLearnMore();
}

export {};

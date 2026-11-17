/* ==========================================================
   Travel Agent Academy – Dynamic Testimonials Slider
   Vanilla JS, no dependencies.

   Data source (in order of priority):
   1. JSON URL in the slider's data-src attribute, e.g.
      <div id="testimonialSlider" data-src="/api/testimonials.json">
      Expected format: [{ "quote": "", "name": "", "role": "", "photo": "" }, ...]
   2. The DEFAULT_TESTIMONIALS array below.

   Options (data attributes on the slider element):
   data-autoplay="7000"   autoplay delay in ms; "0" turns autoplay off
   data-loop="true"       wrap around at the ends
   ========================================================== */
(function () {
  'use strict';

  var DEFAULT_TESTIMONIALS = [
    {
      quote: 'I had a great experience with Travel Agent Academy’s Dominican Republic Specialist Course. I appreciate the in-depth information about all of the different regions, accommodations, history, culture, popular activities, sights, dining and nightlife.',
      name: 'Kelli Pike',
      role: 'Owner, Luxury Travel Designer',
      photo: 'images/kelli-pike.jpg'
    },
    {
      quote: 'Travel Agent Academy has been awesome! I’ve been able to incorporate new travel areas and services in record time. As a new agent, having high-quality, flexible training has been fantastic.',
      name: 'Jonathan Shaw',
      role: 'Costco Travel',
      photo: 'images/jonathan-shaw.jpg'
    },
    // PLACEHOLDERS: the two headshots below were in the design file without
    // a quote or name. Replace the text with real testimonials before going live.
    {
      quote: '[Placeholder] Replace this text with a real testimonial from a Travel Agent Academy graduate.',
      name: 'Graduate Name',
      role: 'Title, Agency',
      photo: 'images/testimonial-3.jpg'
    },
    {
      quote: '[Placeholder] Replace this text with a real testimonial from a Travel Agent Academy graduate.',
      name: 'Graduate Name',
      role: 'Title, Agency',
      photo: 'images/testimonial-4.jpg'
    }
  ];

  var QUOTE_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 7H6a3 3 0 0 0-3 3v7h7v-7H6a1 1 0 0 1 1-1h3zm11 0h-4a3 3 0 0 0-3 3v7h7v-7h-4a1 1 0 0 1 1-1h3z"/></svg>';

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function TestimonialSlider(root, items) {
    this.root = root;
    this.items = items;
    this.viewport = root.querySelector('.t-viewport');
    this.track = root.querySelector('.t-track');
    this.prevBtn = root.querySelector('[data-t-prev]');
    this.nextBtn = root.querySelector('[data-t-next]');
    this.dotsEl = root.querySelector('.t-dots');
    this.status = root.querySelector('.t-status');
    this.loop = root.getAttribute('data-loop') !== 'false';
    this.delay = parseInt(root.getAttribute('data-autoplay') || '7000', 10);
    this.reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.index = 0;
    this.timer = null;
    this.paused = false;
    this.render();
    this.bind();
    this.update(false);
    this.play();
  }

  TestimonialSlider.prototype.render = function () {
    var total = this.items.length;
    this.track.innerHTML = this.items.map(function (t, i) {
      var photo = t.photo
        ? '<img src="' + escapeHtml(t.photo) + '" alt="" loading="lazy">'
        : '<span class="t-avatar-fallback" aria-hidden="true">' + escapeHtml((t.name || '?').charAt(0)) + '</span>';
      return '' +
        '<div class="t-slide" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + ' of ' + total + '">' +
          '<figure class="testimonial-card mb-0">' +
            '<span class="quote-icon" aria-hidden="true">' + QUOTE_SVG + '</span>' +
            '<blockquote>' + escapeHtml(t.quote) + '</blockquote>' +
            '<figcaption class="testimonial-author">' + photo +
              '<div><span class="name">' + escapeHtml(t.name) + '</span>' +
              '<span class="role">' + escapeHtml(t.role) + '</span></div>' +
            '</figcaption>' +
          '</figure>' +
        '</div>';
    }).join('');
    this.slides = Array.prototype.slice.call(this.track.children);
  };

  TestimonialSlider.prototype.perView = function () {
    return window.matchMedia('(min-width: 768px)').matches ? 2 : 1;
  };

  TestimonialSlider.prototype.maxIndex = function () {
    return Math.max(0, this.items.length - this.perView());
  };

  TestimonialSlider.prototype.renderDots = function () {
    if (!this.dotsEl) return;
    var pages = this.maxIndex() + 1;
    if (this.dotsEl.children.length === pages) return;
    var html = '';
    for (var i = 0; i < pages; i++) {
      html += '<button type="button" class="t-dot" data-t-goto="' + i + '" aria-label="Go to testimonial ' + (i + 1) + '"></button>';
    }
    this.dotsEl.innerHTML = html;
  };

  TestimonialSlider.prototype.update = function (animate) {
    var max = this.maxIndex();
    if (this.index > max) this.index = max;
    this.renderDots();

    var step = this.slides.length > 1
      ? this.slides[1].offsetLeft - this.slides[0].offsetLeft
      : 0;
    this.track.style.transition = (animate === false || this.reduceMotion) ? 'none' : '';
    this.track.style.transform = 'translateX(' + (-this.index * step) + 'px)';

    var pv = this.perView(), idx = this.index;
    this.slides.forEach(function (s, i) {
      var visible = i >= idx && i < idx + pv;
      s.setAttribute('aria-hidden', visible ? 'false' : 'true');
      // keep hidden slides out of the tab order
      Array.prototype.forEach.call(s.querySelectorAll('a, button'), function (el) {
        el.tabIndex = visible ? 0 : -1;
      });
    });

    var single = max === 0;
    this.root.classList.toggle('t-static', single);
    if (this.prevBtn) this.prevBtn.disabled = single || (!this.loop && idx === 0);
    if (this.nextBtn) this.nextBtn.disabled = single || (!this.loop && idx === max);

    if (this.dotsEl) {
      Array.prototype.forEach.call(this.dotsEl.children, function (d, i) {
        d.classList.toggle('active', i === idx);
        d.setAttribute('aria-current', i === idx ? 'true' : 'false');
      });
    }
    if (this.status) {
      this.status.textContent = 'Showing testimonial ' + (idx + 1) + (pv > 1 && this.items.length > 1 ? ' to ' + Math.min(idx + pv, this.items.length) : '') + ' of ' + this.items.length;
    }
  };

  TestimonialSlider.prototype.go = function (i) {
    var max = this.maxIndex();
    if (i < 0) i = this.loop ? max : 0;
    if (i > max) i = this.loop ? 0 : max;
    this.index = i;
    this.update(true);
  };

  TestimonialSlider.prototype.next = function () { this.go(this.index + 1); };
  TestimonialSlider.prototype.prev = function () { this.go(this.index - 1); };

  TestimonialSlider.prototype.play = function () {
    var self = this;
    this.stop();
    if (!this.delay || this.reduceMotion || this.maxIndex() === 0) return;
    this.timer = setInterval(function () {
      if (!self.paused && !document.hidden) self.next();
    }, this.delay);
  };

  TestimonialSlider.prototype.stop = function () {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  };

  TestimonialSlider.prototype.bind = function () {
    var self = this;

    if (this.prevBtn) this.prevBtn.addEventListener('click', function () { self.prev(); self.play(); });
    if (this.nextBtn) this.nextBtn.addEventListener('click', function () { self.next(); self.play(); });
    if (this.dotsEl) this.dotsEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-t-goto]');
      if (b) { self.go(parseInt(b.getAttribute('data-t-goto'), 10)); self.play(); }
    });

    // Pause on hover / focus
    this.root.addEventListener('mouseenter', function () { self.paused = true; });
    this.root.addEventListener('mouseleave', function () { self.paused = false; });
    this.root.addEventListener('focusin', function () { self.paused = true; });
    this.root.addEventListener('focusout', function () { self.paused = false; });

    // Keyboard arrows when the slider has focus
    this.root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); self.prev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); self.next(); }
    });

    // Swipe / drag
    var startX = null, startY = null;
    this.viewport.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      startX = e.clientX; startY = e.clientY;
    });
    this.viewport.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      startX = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) self.next(); else self.prev();
        self.play();
      }
    });
    this.viewport.addEventListener('pointercancel', function () { startX = null; });

    // Recalculate on resize (cards per view changes at 768px)
    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () { self.update(false); self.play(); }, 120);
    });
  };

  function init() {
    var root = document.getElementById('testimonialSlider');
    if (!root) return;

    var start = function (items) {
      if (!items || !items.length) { root.closest('section').style.display = 'none'; return; }
      root.testimonialSlider = new TestimonialSlider(root, items);
    };

    var src = root.getAttribute('data-src');
    if (src && window.fetch) {
      fetch(src, { headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(start)
        .catch(function () { start(DEFAULT_TESTIMONIALS); });
    } else {
      start(DEFAULT_TESTIMONIALS);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

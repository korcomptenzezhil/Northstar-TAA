/* ==========================================================
   Travel Agent Academy – Course List (jQuery)
   Loads courses dynamically and filters them by
   search text, category and language.

   Markup hooks (index.html):
   #courseList[data-src]       JSON URL to load (default: data/courses.json)
   #courseList[data-page-size] cards added per scroll step (0 = show all at once)
   #courseList[data-load-delay] ms the spinner shows before each batch (default 400)
   #courseSearch, #categoryFilter, #languageFilter, #clearFilters,
   #courseCount, #courseEmpty, #courseLoading, #courseSentinel

   Course JSON format:
   {
     "id": "aruba",
     "title": "Aruba Certified Expert Program",
     "description": "…",
     "categories": ["Destination", "Rewards"],
     "language": "en",              // ISO code, see LANGUAGE_NAMES
     "isNew": false,
     "logo": "images/logo-aruba.jpg",
     "logoAlt": "Aruba",
     "url": "/courses/aruba",
     "ctaLabel": "Get started"      // optional, defaults per language
   }
   ========================================================== */
(function ($) {
  'use strict';

  var LANGUAGE_NAMES = { en: 'English', fr: 'Français', es: 'Español', pt: 'Português', de: 'Deutsch' };
  var CTA_LABELS = { en: 'Get started', fr: 'Commencer', es: 'Comenzar', pt: 'Começar', de: 'Loslegen' };

  // Used only if the JSON file can't be loaded (e.g. opening index.html
  // straight from disk, where browsers block AJAX on file:// URLs).
  var FALLBACK_COURSES = [
    {
      id: "xcaret-expert",
      title: "Xcaret Expert Program",
      categories: ["Promotions", "New", "Hotel/Resort"],
      language: "en",
      isNew: true,
      logo: "images/logo-xcaret.png",
      logoAlt: "Xcaret",
      url: "#",
      description:
        "Become a Xcaret Xpert and give your clients a seamless tropical vacation like no other by learning how to sell the parks and resorts together as the perfect incarnation of a dream getaway!",
    },
    {
      id: "airfrance-klm-en",
      title: "Air France and KLM Specialist Program",
      categories: ["Airlines"],
      language: "en",
      logo: "images/logo-airfrance-klm.png",
      logoAlt: "Air France KLM",
      url: "#",
      description:
        "Learn about the distinct offerings that define both these legendary airlines and the benefits they provide you and your clients — whether your clients are looking for luxury, affordable comfort or customized personal service.",
      isNew: false,
    },
    {
      id: "airfrance-klm-fr",
      title: "Le programme spécialiste Air France et KLM",
      categories: ["Airlines"],
      language: "fr",
      logo: "images/logo-airfrance-klm.png",
      logoAlt: "Air France KLM",
      url: "#",
      description:
        "Que vos clients recherchent le luxe, un confort abordable ou un service personnalisé, vous apprendrez à tirer parti des nombreuses options proposées par Air France et KLM pour trouver la solution qui leur convient, quelle que soit leur destination.",
      isNew: false,
    },
    {
      id: "allianz",
      title: "Allianz Travel Protection Partners",
      categories: ["Services"],
      language: "en",
      logo: "images/logo-allianz.jpg",
      logoAlt: "Allianz",
      url: "#",
      description:
        "Offering travel insurance is an important part of the travel sales process, because providing protection for those hard-earned vacations helps you deliver the best value and highest level of service to your customers.",
      isNew: false,
    },
    {
      id: "visit-algarve",
      title: "Visit Algarve Specialist Program",
      categories: ["Destination"],
      language: "en",
      logo: "images/logo-visit-algarve.png",
      logoAlt: "Visit Algarve Portugal",
      url: "#",
      description:
        "Introduce Portugal’s beautiful Algarve to clients who would love the luxurious feel of a European beach escape!",
      isNew: false,
    },
    {
      id: "arizona",
      title: "Arizona Specialist Program",
      categories: ["Destination"],
      language: "en",
      logo: "images/logo-arizona.jpg",
      logoAlt: "Arizona",
      url: "#",
      description:
        "Arizona’s landscapes are brimming with natural beauty, adventure, history, wellness, art and culinary flavor. Enroll to help your clients discover the best of what the Grand Canyon State has to offer!",
      isNew: false,
    },
    {
      id: "aruba",
      title: "Aruba Certified Expert Program",
      categories: ["Destination", "Rewards"],
      language: "en",
      logo: "images/logo-aruba.jpg",
      logoAlt: "Aruba",
      url: "aruba.html",
      description:
        "Learn how Aruba is “One Happy Island” for couples, families, active vacationers and pure beach relaxation-lovers alike.",
      isNew: false,
    },
    {
      id: "atlantis",
      title: "Atlantis Ambassador",
      categories: ["Hotel/Resort", "Luxury", "Rewards", "Tours"],
      language: "en",
      logo: "images/logo-atlantis.jpg",
      logoAlt: "Atlantis Paradise Island Bahamas",
      url: "atlantis-ambassador.html",
      description:
        "Become empowered! Discover how to create unforgettable vacations at our unique resort destination, with unparalleled entertainment and awe-inspiring recreation.",
      isNew: false,
    },
  ];

  var PLANE_ICON = '<svg width="14" height="12" viewBox="0 0 24 20" fill="currentColor" aria-hidden="true"><path d="M2 17h20v2H2zM22.07 7.57c-.21-.8-1.04-1.28-1.84-1.06L14.92 7.93 8 1.48 6.07 2l4.14 7.17-4.97 1.33L3.27 8.96 1.82 9.35l1.82 3.16.77 1.33 1.6-.43 5.31-1.42 4.35-1.16 5.31-1.43c.81-.23 1.28-1.05 1.09-1.83z"/></svg>';

  function esc(str) {
    return $('<div>').text(str == null ? '' : String(str)).html().replace(/"/g, '&quot;');
  }

  // Lower-case and strip accents so "francais" matches "Français"
  function normalize(str) {
    str = String(str || '').toLowerCase();
    return str.normalize ? str.normalize('NFD').replace(/[̀-ͯ]/g, '') : str;
  }

  var CourseList = function ($root) {
    this.$root = $root;
    this.$grid = $root.find('.course-grid');
    this.$count = $('#courseCount');
    this.$empty = $('#courseEmpty');
    this.$loading = $('#courseLoading');
    this.$sentinel = $('#courseSentinel');
    this.loadDelay = parseInt($root.data('load-delay'), 10);
    if (isNaN(this.loadDelay)) this.loadDelay = 400;
    this.isLoadingMore = false;
    this.loadTimer = null;
    this.$search = $('#courseSearch');
    this.$category = $('#categoryFilter');
    this.$language = $('#languageFilter');
    this.pageSize = parseInt($root.data('page-size'), 10) || 0;
    this.visible = this.pageSize;
    this.courses = [];
    this.filtered = [];
  };

  CourseList.prototype.load = function () {
    var self = this;
    var src = this.$root.data('src') || 'data/courses.json';
    this.$root.attr('aria-busy', 'true').addClass('is-loading');

    $.ajax({ url: src, dataType: 'json', cache: false })
      .done(function (data) { self.init($.isArray(data) ? data : (data && data.courses) || []); })
      .fail(function () {
        if (FALLBACK_COURSES.length) {
          self.init(FALLBACK_COURSES);
        } else {
          self.$root.removeClass('is-loading').attr('aria-busy', 'false');
          self.$grid.html('<div class="col-12"><p class="course-error">Sorry, the courses couldn’t be loaded. Please refresh the page to try again.</p></div>');
          self.$count.text('');
        }
      });
  };

  CourseList.prototype.init = function (courses) {
    this.courses = $.map(courses, function (c, i) {
      c.categories = $.isArray(c.categories) ? c.categories : (c.categories ? [c.categories] : []);
      c.language = c.language || 'en';
      c._index = i;
      c._haystack = normalize([c.title, c.description, c.categories.join(' ')].join(' '));
      return c;
    });
    this.buildFilterOptions();
    this.readUrl();
    this.bind();
    this.$root.removeClass('is-loading').attr('aria-busy', 'false');
    this.apply();
  };

  // Fill the dropdowns from the data so new categories/languages appear automatically
  CourseList.prototype.buildFilterOptions = function () {
    var cats = {}, langs = {};
    $.each(this.courses, function (_, c) {
      $.each(c.categories, function (_, cat) {
        if (normalize(cat) !== 'new') cats[cat] = true; // "New" is shown as a badge, not a filter
      });
      langs[c.language] = true;
    });

    var $cat = this.$category.empty().append('<option value="">All Categories</option>');
    $.each(Object.keys(cats).sort(), function (_, cat) {
      $cat.append($('<option>').val(cat).text(cat));
    });

    var $lang = this.$language.empty().append('<option value="">All Languages</option>');
    $.each(Object.keys(langs).sort(), function (_, code) {
      $lang.append($('<option>').val(code).text(LANGUAGE_NAMES[code] || code.toUpperCase()));
    });
  };

  CourseList.prototype.bind = function () {
    var self = this, timer;

    this.$search.on('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { self.reset(); }, 200);
    });
    this.$category.add(this.$language).on('change', function () { self.reset(); });

    $('#clearFilters').add(this.$empty.find('[data-clear]')).on('click', function (e) {
      e.preventDefault();
      self.$search.val('');
      self.$category.val('');
      self.$language.val('');
      self.reset();
      self.$search.trigger('focus');
    });

    this.watchScroll();

    // Search on Enter without reloading the page
    this.$search.closest('form').on('submit', function (e) { e.preventDefault(); self.reset(); });
  };

  // ---------- Infinite scroll ----------
  CourseList.prototype.hasMore = function () {
    return this.pageSize > 0 && this.visible < this.filtered.length;
  };

  // Is the end of the list on screen? (sentinel at least 80px above the bottom
  // edge, so the spinner that appears there is visible)
  CourseList.prototype.nearEnd = function () {
    var el = this.$sentinel.get(0);
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    return rect.top <= (window.innerHeight || document.documentElement.clientHeight) - 80;
  };

  CourseList.prototype.watchScroll = function () {
    var self = this;
    if (!this.pageSize) return;

    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) self.loadNext();
      }, { rootMargin: '0px 0px -80px 0px' });
      this.observer.observe(this.$sentinel.get(0));
    } else {
      // Older browsers: throttled scroll/resize check
      var ticking = false;
      $(window).on('scroll.courses resize.courses', function () {
        if (ticking) return;
        ticking = true;
        setTimeout(function () { ticking = false; if (self.nearEnd()) self.loadNext(); }, 150);
      });
    }
  };

  CourseList.prototype.loadNext = function () {
    var self = this;
    if (this.isLoadingMore || !this.hasMore()) return;

    this.isLoadingMore = true;
    this.$loading.removeClass('d-none');
    this.$root.attr('aria-busy', 'true');

    this.loadTimer = setTimeout(function () {
      var first = self.visible;
      self.visible += self.pageSize;
      self.render(first);
      self.isLoadingMore = false;
      self.$loading.addClass('d-none');
      self.$root.attr('aria-busy', 'false');
      // Still near the end (tall screen / short batch)? keep filling
      if (self.nearEnd()) self.loadNext();
    }, this.loadDelay);
  };

  CourseList.prototype.cancelLoad = function () {
    clearTimeout(this.loadTimer);
    this.isLoadingMore = false;
    this.$loading.addClass('d-none');
    this.$root.attr('aria-busy', 'false');
  };

  CourseList.prototype.reset = function () {
    this.cancelLoad();
    this.visible = this.pageSize;
    this.apply();
    this.writeUrl();
  };

  CourseList.prototype.apply = function () {
    var q = normalize($.trim(this.$search.val())),
        terms = q ? q.split(/\s+/) : [],
        cat = this.$category.val(),
        lang = this.$language.val();

    this.filtered = $.grep(this.courses, function (c) {
      if (cat && $.inArray(cat, c.categories) === -1) return false;
      if (lang && c.language !== lang) return false;
      for (var i = 0; i < terms.length; i++) {
        if (c._haystack.indexOf(terms[i]) === -1) return false;
      }
      return true;
    });

    this.render(0);
  };

  // Renders cards; `from` > 0 appends (Load more) instead of replacing
  CourseList.prototype.render = function (from) {
    var total = this.filtered.length,
        limit = this.pageSize ? Math.min(this.visible, total) : total,
        html = '';

    for (var i = from; i < limit; i++) html += this.cardHtml(this.filtered[i]);

    var $cards = $(html);
    if (from === 0) this.$grid.empty();
    this.$grid.append($cards);
    $cards.hide().fadeIn(250);


    this.$count.text(total ? 'Showing ' + limit + ' of ' + total + ' course' + (total === 1 ? '' : 's') : '');
    this.$empty.toggleClass('d-none', total > 0);

    // After a fresh render, fill the screen if the list is shorter than the viewport
    var self = this;
    if (from === 0) setTimeout(function () { if (self.nearEnd()) self.loadNext(); }, 0);
  };

  CourseList.prototype.cardHtml = function (c) {
    var tag = $.map(c.categories, function (cat) { return cat.toLowerCase(); }).join('|');
    var cta = c.ctaLabel || CTA_LABELS[c.language] || CTA_LABELS.en;
    var isNew = c.isNew || $.grep(c.categories, function (x) { return normalize(x) === 'new'; }).length > 0;

    return '' +
      '<div class="col-sm-6 col-lg-3 course-col">' +
        '<article class="course-card" lang="' + esc(c.language) + '" data-id="' + esc(c.id) + '">' +
          (isNew ? '<span class="badge-new">New!</span>' : '') +
          '<div class="course-card-logo">' +
            '<div class="logo-box"><img src="' + esc(c.logo) + '" alt="' + esc(c.logoAlt || c.title) + '" loading="lazy"></div>' +
            (tag ? '<span class="course-tag">' + esc(tag) + '</span>' : '') +
          '</div>' +
          '<div class="course-card-body">' +
            '<h3>' + esc(c.title) + '</h3>' +
            '<p>' + esc(c.description) + '</p>' +
            '<a href="' + esc(c.url || '#') + '" class="card-cta">' + PLANE_ICON + ' ' + esc(cta) + '</a>' +
          '</div>' +
        '</article>' +
      '</div>';
  };

  // Keep filters in the URL (?q=&category=&lang=) so results can be shared/bookmarked
  CourseList.prototype.readUrl = function () {
    if (!window.URLSearchParams) return;
    var p = new URLSearchParams(window.location.search);
    if (p.get('q')) this.$search.val(p.get('q'));
    if (p.get('category') && this.$category.find('option').filter(function () { return this.value === p.get('category'); }).length) this.$category.val(p.get('category'));
    if (p.get('lang') && this.$language.find('option[value="' + p.get('lang').replace(/"/g, '') + '"]').length) this.$language.val(p.get('lang'));
  };

  CourseList.prototype.writeUrl = function () {
    if (!window.URLSearchParams || !window.history || !history.replaceState || location.protocol === 'file:') return;
    var p = new URLSearchParams(window.location.search);
    var set = function (k, v) { if (v) p.set(k, v); else p.delete(k); };
    set('q', $.trim(this.$search.val()));
    set('category', this.$category.val());
    set('lang', this.$language.val());
    var qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  };

  $(function () {
    var $root = $('#courseList');
    if ($root.length) new CourseList($root).load();
  });
})(jQuery);

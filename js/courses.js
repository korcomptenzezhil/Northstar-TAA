/* ==========================================================
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
  "use strict";

  var LANGUAGE_NAMES = {
    en: "English",
    fr: "Français",
    es: "Español",
    pt: "Português",
    de: "Deutsch",
  };
  var CTA_LABELS = {
    en: "Get started",
    fr: "Commencer",
    es: "Comenzar",
    pt: "Começar",
    de: "Loslegen",
  };

  var PLANE_ICON =
    '<svg width="14" height="12" viewBox="0 0 24 20" fill="currentColor" aria-hidden="true"><path d="M2 17h20v2H2zM22.07 7.57c-.21-.8-1.04-1.28-1.84-1.06L14.92 7.93 8 1.48 6.07 2l4.14 7.17-4.97 1.33L3.27 8.96 1.82 9.35l1.82 3.16.77 1.33 1.6-.43 5.31-1.42 4.35-1.16 5.31-1.43c.81-.23 1.28-1.05 1.09-1.83z"/></svg>';

  function esc(str) {
    return $("<div>")
      .text(str == null ? "" : String(str))
      .html()
      .replace(/"/g, "&quot;");
  }

  // Lower-case and strip accents so "francais" matches "Français"
  function normalize(str) {
    str = String(str || "").toLowerCase();
    return str.normalize ? str.normalize("NFD").replace(/[̀-ͯ]/g, "") : str;
  }

  var CourseList = function ($root) {
    this.$root = $root;
    this.$grid = $root.find(".course-grid");
    this.$count = $("#courseCount");
    this.$empty = $("#courseEmpty");
    this.$loading = $("#courseLoading");
    this.$sentinel = $("#courseSentinel");

    // Create the infinite-scroll sentinel if it is missing from the HTML.
    if (!this.$sentinel.length && this.$grid.length) {
      this.$sentinel = $('<div id="courseSentinel" aria-hidden="true"></div>');
      this.$grid.after(this.$sentinel);
    }

    this.loadDelay = parseInt($root.data("load-delay"), 10);
    if (isNaN(this.loadDelay)) this.loadDelay = 400;
    this.isLoadingMore = false;
    this.loadTimer = null;
    this.$search = $("#courseSearch");
    this.$category = $("#categoryFilter");
    this.$language = $("#languageFilter");
    this.pageSize = parseInt($root.data("page-size"), 10) || 0;
    this.visible = this.pageSize;
    this.courses = [];
    this.filtered = [];
  };

  // Merge JSON data with fallback data. JSON records take priority;
  // fallback records are added only when their IDs are not already present.
  CourseList.prototype.load = function () {
    var self = this;
    var src = this.$root.data("src") || "data/courses.json";

    this.$root.attr("aria-busy", "true").addClass("is-loading");

    if (!this.$grid.length) {
      this.$root.removeClass("is-loading").attr("aria-busy", "false");
      console.error(
        "Course list: .course-grid was not found inside #courseList.",
      );
      return;
    }

    $.ajax({
      url: src,
      dataType: "json",
      cache: false,
      timeout: 10000,
    })
      .done(function (data) {
        var courses = $.isArray(data)
          ? data
          : data && $.isArray(data.courses)
            ? data.courses
            : [];

        if (!courses.length) {
          self.$root.removeClass("is-loading").attr("aria-busy", "false");
          self.$grid.html(
            '<div class="col-12"><p class="course-error">No courses are available.</p></div>',
          );
          self.$count.text("");
          return;
        }

        self.init(courses);
      })
      .fail(function (xhr, status, error) {
        console.error("Course JSON could not be loaded:", status, error);
        self.$root.removeClass("is-loading").attr("aria-busy", "false");
        self.$grid.html(
          '<div class="col-12"><p class="course-error">Sorry, the courses could not be loaded. Please check the data/courses.json path and try again.</p></div>',
        );
        self.$count.text("");
        self.$loading.addClass("d-none");
      });
  };

  CourseList.prototype.init = function (courses) {
    this.courses = $.map(courses, function (c, i) {
      c.categories = $.isArray(c.categories)
        ? c.categories
        : c.categories
          ? [c.categories]
          : [];
      c.language = c.language || "en";
      c._index = i;
      c._haystack = normalize(
        [c.title, c.description, c.categories.join(" ")].join(" "),
      );
      return c;
    });
    this.buildFilterOptions();
    this.readUrl();
    this.bind();
    this.$root.removeClass("is-loading").attr("aria-busy", "false");
    this.apply();
  };

  // Fill the dropdowns from the data so new categories/languages appear automatically
  CourseList.prototype.buildFilterOptions = function () {
    var cats = {},
      langs = {};
    $.each(this.courses, function (_, c) {
      $.each(c.categories, function (_, cat) {
        if (normalize(cat) !== "new") cats[cat] = true; // "New" is shown as a badge, not a filter
      });
      langs[c.language] = true;
    });

    var $cat = this.$category
      .empty()
      .append('<option value="">All Categories</option>');
    $.each(Object.keys(cats).sort(), function (_, cat) {
      $cat.append($("<option>").val(cat).text(cat));
    });

    var $lang = this.$language
      .empty()
      .append('<option value="">All Languages</option>');
    $.each(Object.keys(langs).sort(), function (_, code) {
      $lang.append(
        $("<option>")
          .val(code)
          .text(LANGUAGE_NAMES[code] || code.toUpperCase()),
      );
    });
  };

  CourseList.prototype.bind = function () {
    var self = this,
      timer;

    this.$search.on("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        self.reset();
      }, 200);
    });
    this.$category.add(this.$language).on("change", function () {
      self.reset();
    });

    $("#clearFilters")
      .add(this.$empty.find("[data-clear]"))
      .on("click", function (e) {
        e.preventDefault();
        self.$search.val("");
        self.$category.val("");
        self.$language.val("");
        self.reset();
        self.$search.trigger("focus");
      });

    this.watchScroll();

    // Search on Enter without reloading the page
    this.$search.closest("form").on("submit", function (e) {
      e.preventDefault();
      self.reset();
    });
  };

  // ---------- Infinite scroll ----------
  CourseList.prototype.hasMore = function () {
    return this.pageSize > 0 && this.visible < this.filtered.length;
  };

  // Is the end of the list on screen? (sentinel at least 80px above the bottom
  // edge, so the spinner that appears there is visible)
  CourseList.prototype.nearEnd = function () {
    var el = this.$sentinel.get(0);
    if (!el || !document.documentElement.contains(el)) return false;
    var rect = el.getBoundingClientRect();
    return (
      rect.top <=
      (window.innerHeight || document.documentElement.clientHeight) - 80
    );
  };

  CourseList.prototype.watchScroll = function () {
    var self = this;

    // Infinite scroll needs a page size and a real sentinel element.
    if (!this.pageSize || !this.$sentinel.length) return;

    if ("IntersectionObserver" in window) {
      this.observer = new IntersectionObserver(
        function (entries) {
          if (entries[0] && entries[0].isIntersecting) {
            self.loadNext();
          }
        },
        {
          root: null,
          rootMargin: "0px 0px -80px 0px",
        },
      );

      this.observer.observe(this.$sentinel.get(0));
    } else {
      // Fallback for browsers without IntersectionObserver.
      var ticking = false;

      $(window).on("scroll.courses resize.courses", function () {
        if (ticking) return;
        ticking = true;

        setTimeout(function () {
          ticking = false;
          if (self.nearEnd()) self.loadNext();
        }, 150);
      });
    }
  };

  CourseList.prototype.loadNext = function () {
    var self = this;
    if (this.isLoadingMore || !this.hasMore()) return;

    this.isLoadingMore = true;
    this.$loading.removeClass("d-none");
    this.$root.attr("aria-busy", "true");

    this.loadTimer = setTimeout(function () {
      var first = self.visible;
      self.visible += self.pageSize;
      self.render(first);
      self.isLoadingMore = false;
      self.loadTimer = null;
      self.$loading.addClass("d-none");
      self.$root.attr("aria-busy", "false");
      // Still near the end (tall screen / short batch)? keep filling
      if (self.nearEnd()) self.loadNext();
    }, this.loadDelay);
  };

  CourseList.prototype.cancelLoad = function () {
    if (this.loadTimer) {
      clearTimeout(this.loadTimer);
      this.loadTimer = null;
    }

    this.isLoadingMore = false;
    this.$loading.addClass("d-none");
    this.$root.attr("aria-busy", "false");
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
      html = "";

    for (var i = from; i < limit; i++) html += this.cardHtml(this.filtered[i]);

    var $cards = $(html);
    if (from === 0) this.$grid.empty();
    this.$grid.append($cards);
    $cards.hide().fadeIn(250);

    this.$count.text(
      total
        ? "Showing " +
            limit +
            " of " +
            total +
            " course" +
            (total === 1 ? "" : "s")
        : "",
    );
    this.$empty.toggleClass("d-none", total > 0);

    // After a fresh render, fill the screen if the list is shorter than the viewport
    var self = this;
    if (from === 0)
      setTimeout(function () {
        if (self.nearEnd()) self.loadNext();
      }, 0);
  };

  CourseList.prototype.cardHtml = function (c) {
    var tag = $.map(c.categories, function (cat) {
      return cat.toLowerCase();
    }).join("|");
    var cta = c.ctaLabel || CTA_LABELS[c.language] || CTA_LABELS.en;
    var isNew =
      c.isNew ||
      $.grep(c.categories, function (x) {
        return normalize(x) === "new";
      }).length > 0;

    return (
      "" +
      '<div class="col-sm-6 col-lg-3 course-col">' +
      '<article class="course-card" lang="' +
      esc(c.language) +
      '" data-id="' +
      esc(c.id) +
      '">' +
      (isNew ? '<span class="badge-new">New!</span>' : "") +
      '<div class="course-card-logo">' +
      '<div class="logo-box"><img src="' +
      esc(c.logo) +
      '" alt="' +
      esc(c.logoAlt || c.title) +
      '" loading="lazy"></div>' +
      (tag ? '<span class="course-tag">' + esc(tag) + "</span>" : "") +
      "</div>" +
      '<div class="course-card-body">' +
      "<h3>" +
      esc(c.title) +
      "</h3>" +
      "<p>" +
      esc(c.description) +
      "</p>" +
      '<a href="' +
      esc(c.url || "#") +
      '" class="card-cta">' +
      PLANE_ICON +
      " " +
      esc(cta) +
      "</a>" +
      "</div>" +
      "</article>" +
      "</div>"
    );
  };

  // Keep filters in the URL (?q=&category=&lang=) so results can be shared/bookmarked
  CourseList.prototype.readUrl = function () {
    if (!window.URLSearchParams) return;
    var p = new URLSearchParams(window.location.search);
    if (p.get("q")) this.$search.val(p.get("q"));
    if (
      p.get("category") &&
      this.$category.find("option").filter(function () {
        return this.value === p.get("category");
      }).length
    )
      this.$category.val(p.get("category"));
    if (
      p.get("lang") &&
      this.$language.find(
        'option[value="' + p.get("lang").replace(/"/g, "") + '"]',
      ).length
    )
      this.$language.val(p.get("lang"));
  };

  CourseList.prototype.writeUrl = function () {
    if (
      !window.URLSearchParams ||
      !window.history ||
      !history.replaceState ||
      location.protocol === "file:"
    )
      return;
    var p = new URLSearchParams(window.location.search);
    var set = function (k, v) {
      if (v) p.set(k, v);
      else p.delete(k);
    };
    set("q", $.trim(this.$search.val()));
    set("category", this.$category.val());
    set("lang", this.$language.val());
    var qs = p.toString();
    history.replaceState(
      null,
      "",
      location.pathname + (qs ? "?" + qs : "") + location.hash,
    );
  };

  $(function () {
    var $root = $("#courseList");
    if ($root.length) new CourseList($root).load();
  });
})(jQuery);

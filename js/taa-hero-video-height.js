(function () {
  "use strict";

  var desktopBreakpoint = 1200;
  var heroSelector = ".course-hero-atlantis.course-hero-has-video";

  function updateAtlantisHeroHeight() {
    var hero = document.querySelector(heroSelector);

    if (!hero) return;

    // Keep the existing responsive CSS height below 1200px.
    if (window.innerWidth < desktopBreakpoint) {
      hero.style.height = "";
      return;
    }

    var header = document.querySelector(".site-header");
    var promoBar = document.querySelector(".promo-bar");

    var headerHeight = header ? header.getBoundingClientRect().height : 0;
    var promoHeight = promoBar ? promoBar.getBoundingClientRect().height : 0;

    var viewportHeight = window.visualViewport
      ? window.visualViewport.height
      : window.innerHeight;

    var availableHeight = Math.max(
      0,
      Math.round(viewportHeight - headerHeight - promoHeight),
    );

    hero.style.height = availableHeight + "px";
  }

  function initAtlantisHeroHeight() {
    updateAtlantisHeroHeight();

    window.addEventListener("load", updateAtlantisHeroHeight);
    window.addEventListener("resize", updateAtlantisHeroHeight);
    window.addEventListener("orientationchange", updateAtlantisHeroHeight);

    if (window.visualViewport) {
      window.visualViewport.addEventListener(
        "resize",
        updateAtlantisHeroHeight,
      );
    }

    if ("ResizeObserver" in window) {
      var observer = new ResizeObserver(updateAtlantisHeroHeight);
      var header = document.querySelector(".site-header");
      var promoBar = document.querySelector(".promo-bar");

      if (header) observer.observe(header);
      if (promoBar) observer.observe(promoBar);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAtlantisHeroHeight);
  } else {
    initAtlantisHeroHeight();
  }
})();

(function ($) {
  "use strict";

  function updateTaaLayout() {
    var $header = $(".site-header").first();
    var $promo = $(".promo-bar").first();
    var $hero = $("#heroCarousel");

    if (!$hero.length) {
      $hero = $(".hero-carousel").first();
    }

    if (!$header.length) {
      return;
    }

    // Measure header height after responsive styles and menu changes.
    var headerHeight = Math.ceil($header.outerHeight() || 0);

    document.documentElement.style.setProperty(
      "--site-header-height",
      headerHeight + "px",
    );

    // Measure promo bar height.
    var promoHeight = $promo.length ? Math.ceil($promo.outerHeight() || 0) : 0;

    if (!$hero.length) {
      return;
    }

    // Apply dynamic hero height only at 1200px and above.
    if (window.innerWidth >= 1200) {
      var viewportHeight = window.visualViewport
        ? Math.round(window.visualViewport.height)
        : window.innerHeight;

      var heroHeight = Math.max(0, viewportHeight - headerHeight - promoHeight);

      document.documentElement.style.setProperty(
        "--hero-carousel-height",
        heroHeight + "px",
      );

      $hero.css("height", heroHeight + "px");

      $hero
        .find(".carousel-inner, .carousel-item")
        .css("height", heroHeight + "px");

      // Video fills the complete hero slide.
      $hero.find(".hero-video").css({
        width: "100%",
        height: "100%",
        display: "block",
      });
    } else {
      // Below 1200px, reset inline styles.
      // Responsive CSS controls hero and video dimensions.
      document.documentElement.style.removeProperty("--hero-carousel-height");

      $hero.css("height", "");

      $hero.find(".carousel-inner, .carousel-item").css("height", "");

      $hero.find(".hero-video").css({
        width: "",
        height: "",
        display: "",
      });
    }
  }

  // Header scroll animation.
  function updateHeaderScrollState() {
    $(".site-header").toggleClass("is-scrolled", $(window).scrollTop() > 5);
  }

  $(function () {
    updateTaaLayout();
    updateHeaderScrollState();

    // Recalculate on load, resize and orientation changes.
    $(window).on(
      "load.taaLayout resize.taaLayout orientationchange.taaLayout",
      function () {
        updateTaaLayout();
      },
    );

    // Header scroll state.
    $(window).on("scroll.taaHeader", updateHeaderScrollState);

    // Recalculate when Bootstrap navigation expands or collapses.
    $(document).on(
      "shown.bs.collapse.taaLayout hidden.bs.collapse.taaLayout",
      ".site-header .navbar-collapse",
      function () {
        window.requestAnimationFrame(updateTaaLayout);
        window.setTimeout(updateTaaLayout, 250);
      },
    );

    // Observe header and promo bar dimension changes.
    if ("ResizeObserver" in window) {
      var layoutObserver = new ResizeObserver(function () {
        updateTaaLayout();
      });

      var headerElement = document.querySelector(".site-header");
      var promoElement = document.querySelector(".promo-bar");

      if (headerElement) {
        layoutObserver.observe(headerElement);
      }

      if (promoElement) {
        layoutObserver.observe(promoElement);
      }
    }
  });
})(jQuery);

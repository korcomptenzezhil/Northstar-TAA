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

    // Measure the header after responsive styles and collapsed-menu changes.
    var headerHeight = Math.ceil($header.outerHeight() || 0);

    // Keep the fixed header in the normal document flow by offsetting the promo bar.
    document.documentElement.style.setProperty(
      "--site-header-height",
      headerHeight + "px",
    );

    // Read promo height after the header offset has been applied.
    var promoHeight = $promo.length ? Math.ceil($promo.outerHeight() || 0) : 0;

    if (!$hero.length) {
      return;
    }

    // Hero occupies the remaining visible viewport below the fixed header and promo bar.
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

    // Explicitly size the video to the slide so no intrinsic video whitespace appears.
    $hero.find(".hero-video").css({
      width: "100%",
      height: "100%",
      display: "block",
    });
  }

  function updateHeaderScrollState() {
    $(".site-header").toggleClass("is-scrolled", $(window).scrollTop() > 5);
  }

  $(function () {
    updateTaaLayout();
    updateHeaderScrollState();

    $(window).on(
      "load.taaLayout resize.taaLayout orientationchange.taaLayout",
      function () {
        updateTaaLayout();
      },
    );

    $(window).on("scroll.taaHeader", updateHeaderScrollState);

    // Bootstrap 4/5 responsive navigation can change the fixed header height.
    $(document).on(
      "shown.bs.collapse.taaLayout hidden.bs.collapse.taaLayout",
      ".site-header .navbar-collapse",
      function () {
        window.requestAnimationFrame(updateTaaLayout);
        window.setTimeout(updateTaaLayout, 250);
      },
    );

    // Recalculate if fonts/images inside the header or promo bar change their dimensions.
    if ("ResizeObserver" in window) {
      var layoutObserver = new ResizeObserver(function () {
        updateTaaLayout();
      });

      var headerElement = document.querySelector(".site-header");
      var promoElement = document.querySelector(".promo-bar");

      if (headerElement) layoutObserver.observe(headerElement);
      if (promoElement) layoutObserver.observe(promoElement);
    }
  });
})(jQuery);

/* ==========================================================
   Travel Agent Academy – Hero banner video (jQuery)
   - Plays the slide-1 video only while that slide is showing
   - Pause/play button (WCAG 2.2.2: moving content can be paused)
   - Respects "reduced motion": video starts paused on the poster
   - Falls back to the slide's background image if the video can't load
   ========================================================== */
(function ($) {
  'use strict';

  $(function () {
    var $carousel = $('#heroCarousel');
    var $slide = $carousel.find('.hero-slide-video');
    var video = $slide.find('.hero-video').get(0);
    if (!video) return;

    var $btn = $slide.find('.hero-video-toggle');
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var userPaused = reduceMotion; // user's choice wins over autoplay

    function setButton(paused) {
      $btn.toggleClass('is-paused', paused)
          .attr('aria-pressed', paused ? 'true' : 'false')
          .attr('aria-label', paused ? 'Play background video' : 'Pause background video');
    }

    function play() {
      var p = video.play();
      if (p && p.catch) p.catch(function () { setButton(true); }); // autoplay blocked
    }

    function fail() {
      $slide.addClass('video-failed');
    }

    // Missing/unsupported file: errors fire on the <source>, not the <video>
    $(video).find('source').last().on('error', fail);
    $(video).on('error', fail);
    // The error may already have happened before this script ran
    if (video.networkState === 3 /* NETWORK_NO_SOURCE */ || video.error) fail();

    if (reduceMotion) {
      video.removeAttribute('autoplay');
      video.pause();
    }
    setButton(userPaused);

    $btn.on('click', function () {
      userPaused = !video.paused ? true : false;
      if (userPaused) video.pause(); else play();
      setButton(userPaused);
    });

    // Only play while slide 1 is visible
    $carousel.on('slide.bs.carousel', function (e) {
      if (e.from === $slide.index()) video.pause();
    });
    $carousel.on('slid.bs.carousel', function (e) {
      if (e.to === $slide.index() && !userPaused) play();
    });

    // Save resources when the tab is in the background
    $(document).on('visibilitychange', function () {
      if (document.hidden) video.pause();
      else if ($slide.hasClass('active') && !userPaused) play();
    });
  });
})(jQuery);


(function ($) {
  'use strict';

  $(function () {
    $('[data-video-player]').each(function () {
      var $wrap = $(this);
      var video = $wrap.find('video').get(0);
      var $play = $wrap.find('.resource-video-play');
      var $error = $wrap.find('.resource-video-error');
      if (!video) return;

      function fail() {
        $wrap.removeClass('is-playing').addClass('is-failed');
        $play.addClass('d-none');
        $error.removeClass('d-none');
      }

      $(video).find('source').last().on('error', fail);
      $(video).on('error', fail);

      $play.on('click', function () {
        video.controls = true;
        $wrap.addClass('is-playing');
        var p = video.play();
        if (p && p.catch) p.catch(function (err) {
          if (err && err.name === 'NotAllowedError') { $wrap.removeClass('is-playing'); return; }
          fail();
        });
        $(video).trigger('focus');
      });

      // Show the play button again when the video ends
      $(video).on('ended', function () {
        $wrap.removeClass('is-playing');
        video.controls = false;
        video.load(); // back to the poster
      });
    });
  });
  // ---------- Background video banners ----------
  $(function () {
    $('[data-bg-video]').each(function () {
      var $wrap = $(this);
      var video = $wrap.find('video').get(0);
      if (!video) return;
      var $play = $wrap.find('[data-video-play]');
      var $mute = $wrap.find('[data-video-mute]');
      var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var userPaused = reduceMotion;
      var inView = true;

      function updateButtons() {
        var paused = video.paused, muted = video.muted;
        $play.toggleClass('is-paused', paused)
             .attr({ 'aria-pressed': paused ? 'true' : 'false', 'aria-label': paused ? 'Play video' : 'Pause video' });
        $mute.toggleClass('is-muted', muted)
             .attr({ 'aria-pressed': muted ? 'true' : 'false', 'aria-label': muted ? 'Unmute video' : 'Mute video' });
      }

      function play() {
        if (userPaused || !inView || document.hidden) return;
        var p = video.play();
        if (p && p.catch) p.catch(function () {
          // e.g. sound was switched on without a click, or autoplay blocked entirely
          if (!video.muted) { video.muted = true; video.play().catch(updateButtons); }
          updateButtons();
        });
      }

      function fail() { $wrap.addClass('video-failed'); }
      $(video).find('source').last().on('error', fail);
      $(video).on('error', fail);
      if (video.networkState === 3 /* NETWORK_NO_SOURCE */ || video.error) fail();

      video.muted = true;
      if (reduceMotion) { video.removeAttribute('autoplay'); video.pause(); }

      $play.on('click', function () {
        userPaused = !video.paused;
        if (userPaused) video.pause(); else play();
        updateButtons();
      });

      $mute.on('click', function () {
        video.muted = !video.muted;   // inside a click, so the browser allows sound
        if (!video.muted && video.paused && !userPaused) play();
        updateButtons();
      });

      $(video).on('play pause volumechange', updateButtons);

      $(document).on('visibilitychange', function () {
        if (document.hidden) video.pause(); else play();
      });

      // Save battery/CPU: pause when the banner is scrolled out of view
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          inView = entries[0].isIntersecting;
          if (inView) play(); else video.pause();
        }, { threshold: 0.1 }).observe($wrap.get(0));
      }

      updateButtons();
      play();
    });
  });
})(jQuery);

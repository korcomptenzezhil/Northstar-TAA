/* ==========================================================
   Travel Agent Academy – Hero banner video (jQuery)

   Sound is ON by default, with a mute/unmute toggle.

   Browser autoplay rules: Chrome, Safari, Firefox and Edge only allow a
   video to play WITH sound after the visitor has interacted with the page
   (click, tap or key press). Some (e.g. iOS Low Power Mode, or a "block
   all autoplay" setting) block muted autoplay too. This script handles all
   three outcomes:

   1. Sound allowed      -> plays unmuted straight away.
   2. Sound blocked      -> plays muted, shows a "Click for sound" button,
                            and turns sound on at the first click / tap /
                            key press anywhere on the page.
   3. All autoplay blocked -> stays on the poster, shows "Click to play",
                            and starts playing with sound at the first
                            interaction.

   If the visitor mutes or pauses the video, that choice is respected.
   Set data-unmute-on-interaction="false" on #heroCarousel to require a
   click on the sound button itself instead of any interaction.

   Also: plays only while its slide is showing, pauses when the tab is
   hidden, starts paused for "reduced motion" visitors, and falls back to
   the slide's background image if the file can't load.
   ========================================================== */
(function ($) {
  'use strict';

  $(function () {
    var $carousel = $('#heroCarousel');
    var $slide = $carousel.find('.hero-slide-video');
    var video = $slide.find('.hero-video').get(0);
    if (!video) return;

    var $playBtn = $slide.find('[data-video-play]');
    var $muteBtn = $slide.find('[data-video-mute]');
    var $hint = $slide.find('[data-video-sound-hint]');
    var $hintText = $hint.find('span');

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var unmuteOnInteraction = $carousel.data('unmute-on-interaction') !== false;

    var wantsSound = true;          // default: sound on
    var userPaused = reduceMotion;  // visitor's play/pause choice
    var blocked = null;             // null | 'sound' | 'play'
    var sliding = false;            // true while the carousel is changing slide

    video.muted = false;            // no "muted" attribute: start unmuted
    video.volume = 1;

    // ---------- UI ----------
    function updateUI() {
      var paused = video.paused;
      $playBtn.toggleClass('is-paused', paused)
              .attr('aria-pressed', paused ? 'true' : 'false')
              .attr('aria-label', paused ? 'Play video' : 'Pause video');

      var muted = video.muted;
      $muteBtn.toggleClass('is-muted', muted)
              .attr('aria-pressed', muted ? 'true' : 'false')
              .attr('aria-label', muted ? 'Unmute video' : 'Mute video');

      // Prompt only while the browser (not the visitor) is holding sound back
      var showHint = !!blocked && wantsSound && !userPaused;
      $hint.toggleClass('d-none', !showHint);
      $hintText.text(blocked === 'play' ? 'Click to play with sound' : 'Click for sound');
    }

    function isActive() { return $slide.hasClass('active'); }

    // ---------- Playback ----------
    // Called from user gestures too: inside a gesture the browser allows sound.
    function play(fromGesture) {
      if (userPaused || sliding || !isActive() || document.hidden) { updateUI(); return; }

      video.muted = !wantsSound;
      var p = video.play();
      if (!p || !p.then) { updateUI(); return; } // very old browsers

      p.then(function () {
        if (!video.muted || !wantsSound) blocked = null;
        updateUI();
      }).catch(function (err) {
        if (err && err.name === 'AbortError') return; // interrupted by a pause(); harmless
        if (!video.muted && !fromGesture) {
          // Sound blocked -> try muted so motion still plays
          video.muted = true;
          video.play().then(function () {
            blocked = 'sound';
            armFirstInteraction();
            updateUI();
          }).catch(function () {
            // Even muted autoplay blocked
            video.muted = !wantsSound;
            blocked = 'play';
            armFirstInteraction();
            updateUI();
          });
        } else {
          blocked = 'play';
          armFirstInteraction();
          updateUI();
        }
      });
    }

    // The first click/tap/key press anywhere on the page counts as permission
    var armed = false;
    function armFirstInteraction() {
      if (!unmuteOnInteraction || armed) return;
      armed = true;
      $(document).on('click.heroSound keydown.heroSound touchend.heroSound', function (e) {
        // The video controls handle their own clicks
        if ($(e.target).closest('.hero-video-toggle').length) return;
        if (e.type === 'keydown' && (e.key === 'Tab' || e.key === 'Escape' || e.key === 'Shift')) return;
        $(document).off('.heroSound');
        armed = false;
        if (blocked && wantsSound) play(true);
      });
    }

    // ---------- Fallback when the file is missing/unsupported ----------
    function fail() { $slide.addClass('video-failed'); }
    $(video).find('source').last().on('error', fail);
    $(video).on('error', fail);
    if (video.networkState === 3 /* NETWORK_NO_SOURCE */ || video.error) fail();

    // ---------- Controls ----------
    $playBtn.on('click', function () {
      if (video.paused) {
        userPaused = false;
        play(true);
      } else {
        userPaused = true;
        video.pause();
        updateUI();
      }
    });

    $muteBtn.on('click', function () {
      wantsSound = video.muted;          // currently muted -> visitor wants sound
      if (wantsSound) {
        blocked = null;
        if (video.paused && !userPaused) { play(true); return; }
        video.muted = false;             // inside a click, so the browser allows it
      } else {
        video.muted = true;
      }
      updateUI();
    });

    $hint.on('click', function () {
      wantsSound = true;
      userPaused = false;
      blocked = null;
      play(true);
    });

    $(video).on('play pause volumechange', updateUI);

    // ---------- Slides (manual only) ----------
    $carousel.on('slide.bs.carousel', function (e) {
      sliding = true;
      if (e.from === $slide.index()) video.pause();
    });
    $carousel.on('slid.bs.carousel', function (e) {
      sliding = false;
      // Arriving here was a click on an arrow/indicator, i.e. a user gesture
      if (e.to === $slide.index()) play(true);
    });

    // ---------- Tab visibility ----------
    $(document).on('visibilitychange', function () {
      if (document.hidden) video.pause();
      else if (isActive()) play(false);
    });

    // ---------- Start ----------
    if (reduceMotion) {
      video.removeAttribute('autoplay');
      video.pause();
      updateUI();
    } else {
      play(false);
    }
  });
})(jQuery);

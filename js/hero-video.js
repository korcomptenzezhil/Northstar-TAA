/* ==========================================================
   Travel Agent Academy – Hero banner video (jQuery)

   Sound
   - Tries to play WITH sound first.
   - Browsers (Chrome, Safari, Firefox, Edge) block autoplay with sound until
     the visitor has interacted with the page. When that happens the video
     plays muted instead, the mute button shows "Unmute", and sound turns on
     at the visitor's first click, tap or key press anywhere on the page.
     Turn that off with data-unmute-on-interaction="false" on #heroCarousel.
   - If the visitor mutes the video themselves, it stays muted.

   Playback
   - Play/pause and mute/unmute buttons inside .hero-video-toggle
   - Plays only while slide 1 is showing; pauses when the tab is hidden
   - While it plays with sound, the carousel holds on slide 1 so the
     audio isn't cut off; auto-rotation resumes when muted or paused
   - "Reduced motion" visitors: starts paused on the poster image
   - Falls back to the slide's background image if the video can't load
   ========================================================== */
(function ($) {
  "use strict";

  $(function () {
    var $carousel = $("#heroCarousel");
    var $slide = $carousel.find(".hero-slide-video");
    var video = $slide.find(".hero-video").get(0);
    if (!video) return;

    var $controls = $slide.find(".hero-video-toggle");
    var $playBtn = $controls.find("[data-video-play]");
    var $muteBtn = $controls.find("[data-video-mute]");

    var reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var unmuteOnInteraction = $carousel.data("unmute-on-interaction") !== false;

    var userPaused = reduceMotion; // the visitor's choice wins over autoplay
    var wantsSound = true; // sound on by default; false once the visitor mutes

    // ---------- UI ----------
    function updateButtons() {
      var paused = video.paused;
      $playBtn
        .toggleClass("is-paused", paused)
        .attr("aria-pressed", paused ? "true" : "false")
        .attr("aria-label", paused ? "Play video" : "Pause video");

      var muted = video.muted;
      $muteBtn
        .toggleClass("is-muted", muted)
        .attr("aria-pressed", muted ? "true" : "false")
        .attr("aria-label", muted ? "Unmute video" : "Mute video");

      syncCarousel();
    }

    // Hold the carousel on this slide while audio is playing
    function syncCarousel() {
      var audible = $slide.hasClass("active") && !video.paused && !video.muted;
      $carousel.carousel(audible ? "pause" : "cycle");
    }

    // ---------- Playback ----------
    // Try with sound; if the browser blocks it, retry muted.
    function play() {
      if (userPaused || !$slide.hasClass("active") || document.hidden) return;
      video.muted = !wantsSound;
      var p = video.play();
      if (p && p.then) {
        p.then(updateButtons).catch(function () {
          if (video.muted) {
            updateButtons();
            return;
          } // blocked even muted
          video.muted = true; // sound blocked: go muted
          var p2 = video.play();
          if (p2 && p2.then) p2.then(updateButtons, updateButtons);
          else updateButtons();
          armUnmuteOnInteraction();
        });
      } else {
        updateButtons();
      }
    }

    // Unmute at the first real user gesture (a gesture is required for sound)
    var armed = false;
    function armUnmuteOnInteraction() {
      if (!unmuteOnInteraction || armed) return;
      armed = true;
      $(document).on(
        "pointerdown.heroSound keydown.heroSound touchend.heroSound",
        function (e) {
          if ($(e.target).closest(".hero-video-toggle").length) return; // the buttons handle themselves
          if (e.type === "keydown" && (e.key === "Escape" || e.key === "Tab"))
            return;
          $(document).off(".heroSound");
          armed = false;
          if (!wantsSound) return;
          video.muted = false;
          updateButtons();
        },
      );
    }

    // ---------- Fallback when the file is missing/unsupported ----------
    function fail() {
      $slide.addClass("video-failed");
      syncCarousel();
    }
    $(video).find("source").last().on("error", fail);
    $(video).on("error", fail);
    if (video.networkState === 3 /* NETWORK_NO_SOURCE */ || video.error) fail();

    // ---------- Buttons ----------
    $playBtn.on("click", function () {
      if (video.paused) {
        userPaused = false;
        play();
      } else {
        userPaused = true;
        video.pause();
        updateButtons();
      }
    });

    $muteBtn.on("click", function () {
      wantsSound = video.muted; // clicking "Unmute" means they want sound
      video.muted = !wantsSound;
      if (wantsSound && video.paused && !userPaused) play();
      updateButtons();
    });

    // Keep buttons in sync with any other source of change
    $(video).on("play pause volumechange", updateButtons);

    // ---------- Carousel ----------
    $carousel.on("slide.bs.carousel", function (e) {
      if (e.from === $slide.index()) video.pause();
    });
    $carousel.on("slid.bs.carousel", function (e) {
      if (e.to === $slide.index()) play();
      else syncCarousel();
    });

    // ---------- Tab visibility ----------
    $(document).on("visibilitychange", function () {
      if (document.hidden) video.pause();
      else play();
    });

    // Bootstrap starts data-ride carousels on window load, which would undo a
    // pause applied earlier, so re-apply the carousel state once that has run.
    $(window).on("load", function () {
      setTimeout(syncCarousel, 0);
    });

    // ---------- Start ----------
    if (reduceMotion) {
      video.removeAttribute("autoplay");
      video.pause();
      updateButtons();
    } else {
      play();
    }
  });
})(jQuery);

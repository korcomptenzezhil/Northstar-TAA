/* ==========================================================
   Travel Agent Academy – Registration (jQuery)
   3-step form: one step visible at a time, each step is
   validated before moving on, and the progress steps update.

   - Required fields:      [required]
   - Must match another:   data-match="#otherField"  data-match-message="…"
   - Password rules:       [data-password]  (rules listed below)
   - At least one of:      data-require-one="#a, #b, #c" on a wrapper
   - Single-choice boxes:  data-single-choice on a wrapper of checkboxes
   - "All / None of the above" handled in #regDestinations
   - Submitting: while the form's action is "#", the thank-you message is
     shown instead. Set action to your endpoint to submit for real.
   ========================================================== */
(function ($) {
  'use strict';

  var SPECIAL = '!@$%^&*()_?":{}|<>';
  var BANNED_COMBOS = ['!@&', '!&@', '@!&', '@&!', '&!@', '&@!'];

  function passwordChecks(v) {
    var special = false;
    for (var i = 0; i < v.length; i++) {
      if (SPECIAL.indexOf(v.charAt(i)) !== -1) { special = true; break; }
    }
    var combo = true;
    for (var j = 0; j < BANNED_COMBOS.length; j++) {
      if (v.indexOf(BANNED_COMBOS[j]) !== -1) { combo = false; break; }
    }
    return {
      length: v.length >= 12 && v.length <= 32,
      case: /[a-z]/.test(v) && /[A-Z]/.test(v),
      digit: /[0-9]/.test(v),
      special: special,
      combo: combo
    };
  }

  function passwordStrength(v, checks) {
    if (!v) return { label: '—', cls: '' };
    var passed = 0;
    $.each(checks, function (_, ok) { if (ok) passed++; });
    if (passed < 5) return { label: 'Weak', cls: 'is-weak' };
    var variety = (v.match(/[^A-Za-z0-9]/g) || []).length;
    if (v.length >= 16 && variety >= 2) return { label: 'Strong', cls: 'is-strong' };
    return { label: 'Acceptable', cls: 'is-acceptable' };
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  $(function () {
    var $form = $('#registerForm');
    if (!$form.length) return;

    var $panels = $form.find('.register-panel');
    var $steps = $('#registerSteps .register-step');
    var $status = $('#registerStatus');
    var current = 1;
    var total = $panels.length;

    // ---------- Field validation ----------
    function setError($field, message) {
      var $group = $field.closest('.form-group, .form-check');
      var $fb = $group.find('.invalid-feedback').first();
      if (message) {
        $field.addClass('is-invalid').attr('aria-invalid', 'true');
        if (!$fb.attr('id')) $fb.attr('id', ($field.attr('id') || 'f') + 'Error');
        $fb.text(message);
        var described = ($field.attr('aria-describedby') || '').split(' ');
        if ($.inArray($fb.attr('id'), described) === -1) {
          described.push($fb.attr('id'));
          $field.attr('aria-describedby', $.trim(described.join(' ')));
        }
      } else {
        $field.removeClass('is-invalid').removeAttr('aria-invalid');
        $fb.text('');
      }
      return !message;
    }

    function validateField($field) {
      var el = $field.get(0);
      var v = $.trim($field.val() || '');
      var isBox = el.type === 'checkbox';

      if (el.required && (isBox ? !el.checked : !v)) {
        return setError($field, $field.data('required-message') || 'This field is required.');
      }
      if (el.type === 'email' && v && !EMAIL_RE.test(v)) {
        return setError($field, 'Please enter a valid email address.');
      }
      if ($field.is('[data-password]') && v) {
        var c = passwordChecks($field.val());
        if (!(c.length && c.case && c.digit && c.special && c.combo)) {
          return setError($field, 'Your password doesn’t meet all the requirements below.');
        }
      }
      var match = $field.data('match');
      if (match && v && $field.val() !== $(match).val()) {
        return setError($field, $field.data('match-message') || 'Values do not match.');
      }
      return setError($field, '');
    }

    function validateRequireOne($group) {
      var $fields = $($group.data('require-one'));
      var ok = $fields.filter(function () { return $.trim(this.value) !== ''; }).length > 0;
      $group.toggleClass('is-invalid', !ok);
      $fields.toggleClass('is-invalid', !ok).attr('aria-invalid', ok ? null : 'true');
      $group.find('> .invalid-feedback').text(ok ? '' : $group.data('require-one-message'));
      return ok;
    }

    function validatePanel($panel) {
      var valid = true, $first = null;
      $panel.find('input, select, textarea').filter('[required], [data-match], [type="email"], [data-password]').each(function () {
        var $f = $(this);
        if (!validateField($f)) { valid = false; $first = $first || $f; }
      });
      $panel.find('[data-require-one]').each(function () {
        var $g = $(this);
        if (!validateRequireOne($g)) { valid = false; $first = $first || $($g.data('require-one')).first(); }
      });
      $panel.addClass('was-validated-once');
      if ($first) $first.trigger('focus');
      return valid;
    }

    // Live re-validation once a panel has been submitted (or a field touched)
    $form.on('blur', 'input, select', function () {
      var $f = $(this);
      if ($f.closest('[data-require-one]').length) return;
      if ($f.val() || $f.closest('.was-validated-once').length) validateField($f);
    });
    $form.on('input change', 'input, select', function () {
      var $f = $(this);
      if ($f.hasClass('is-invalid')) validateField($f);
      // keep the "confirm" field in sync when the original changes
      $form.find('[data-match="#' + this.id + '"]').filter('.is-invalid').each(function () { validateField($(this)); });
      var $group = $f.closest('[data-require-one]');
      if ($group.length && $group.hasClass('is-invalid')) validateRequireOne($group);
    });

    // ---------- Password helpers ----------
    $form.on('input', '[data-password]', function () {
      var v = $(this).val();
      var checks = passwordChecks(v);
      var $rules = $('#regPasswordRules');
      $.each(checks, function (rule, ok) {
        $rules.find('[data-rule="' + rule + '"]').toggleClass('is-met', !!v && ok);
      });
      var s = passwordStrength(v, checks);
      $('#regPasswordStrength [data-strength]').text(s.label)
        .removeClass('is-weak is-acceptable is-strong').addClass(s.cls);
    });

    $form.on('click', '[data-toggle-password]', function () {
      var $btn = $(this), $input = $($btn.data('toggle-password'));
      var show = $input.attr('type') === 'password';
      $input.attr('type', show ? 'text' : 'password');
      $btn.attr({ 'aria-pressed': show ? 'true' : 'false', 'aria-label': show ? 'Hide password' : 'Show password' })
          .toggleClass('is-showing', show);
    });

    // ---------- Checkbox groups ----------
    // "All of the above" / "None of the above"
    $('#regDestinations').on('change', 'input', function () {
      var $all = $('#regDestinations [data-all]'), $none = $('#regDestinations [data-none]');
      var $regular = $('#regDestinations input').not($all).not($none);
      if ($(this).is($all)) {
        $regular.prop('checked', this.checked);
        if (this.checked) $none.prop('checked', false);
      } else if ($(this).is($none)) {
        if (this.checked) { $regular.prop('checked', false); $all.prop('checked', false); }
      } else {
        if (this.checked) $none.prop('checked', false);
        $all.prop('checked', $regular.length === $regular.filter(':checked').length);
      }
    });

    // Only one box can be ticked (AgentatHome Magazine: Print or Digital)
    $form.on('change', '[data-single-choice] input[type="checkbox"]', function () {
      if (this.checked) $(this).closest('[data-single-choice]').find('input[type="checkbox"]').not(this).prop('checked', false);
    });

    // ---------- Steps ----------
    function goTo(step) {
      current = step;
      $panels.addClass('d-none').filter('[data-step="' + step + '"]').removeClass('d-none');

      $steps.each(function () {
        var $s = $(this), n = $s.data('step');
        var done = n < step, isCurrent = n === step;
        var $btn = $s.find('.register-step-btn');
        var $label = $s.find('.register-step-label');
        if (!$label.data('default-label')) $label.data('default-label', $label.text());
        $s.toggleClass('is-done', done).toggleClass('is-current', isCurrent);
        $btn.prop('disabled', !done).attr('aria-current', isCurrent ? 'step' : null);
        $label.text(done && $label.data('done-label') ? $label.data('done-label') : $label.data('default-label'));
      });

      $status.text('Step ' + step + ' of ' + total + ': ' + $.trim($steps.filter('[data-step="' + step + '"]').find('.register-step-label').text()).replace(/^\d+\s*/, ''));

      var top = $('#registerSteps').offset().top - ($('.site-header').outerHeight() || 0) - 16;
      if ($(window).scrollTop() > top) $('html, body').animate({ scrollTop: top }, 250);
      $panels.filter('[data-step="' + step + '"]').find('input, select').filter(':visible').first().trigger('focus');
    }

    $form.on('click', '[data-next]', function () {
      var $panel = $(this).closest('.register-panel');
      if (validatePanel($panel)) goTo(current + 1);
    });

    // Completed steps can be revisited
    $('#registerSteps').on('click', '.register-step-btn', function () {
      var step = $(this).closest('.register-step').data('step');
      if (step < current) goTo(step);
    });

    // Enter key: go to the next step instead of submitting early
    $form.on('keydown', 'input', function (e) {
      if (e.key === 'Enter' && this.type !== 'checkbox' && current < total) {
        e.preventDefault();
        $(this).closest('.register-panel').find('[data-next]').trigger('click');
      }
    });

    // ---------- Submit ----------
    $form.on('submit', function (e) {
      // Re-check every step in case something changed
      for (var s = 1; s <= total; s++) {
        var $p = $panels.filter('[data-step="' + s + '"]');
        if (!validatePanel($p)) { e.preventDefault(); if (s !== current) goTo(s); validatePanel($p); return; }
      }
      if ($form.attr('action') === '#') {
        e.preventDefault();
        $panels.addClass('d-none');
        $steps.removeClass('is-current').addClass('is-done').find('.register-step-btn').prop('disabled', true);
        $steps.first().find('.register-step-label').text($steps.first().find('.register-step-label').data('done-label'));
        $('#registerSuccess').removeClass('d-none').trigger('focus');
        $status.text('Registration complete.');
      }
    });
  });
})(jQuery);

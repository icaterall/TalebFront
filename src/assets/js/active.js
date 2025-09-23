// active.js
(function (w, d) {
  function initTheme() {
    // 🔽 Move your original DOM wiring here (menus, dropdowns, sliders, etc.)

    // Example:
    var toggler = d.querySelector('.navbar-toggler');
    if (toggler) {
      toggler.addEventListener('click', function () {
        var nav = d.querySelector('#saasboxNav');
        if (nav) nav.classList.toggle('show');
      });
    }

    // If you use jQuery plugins, do them here too:
    if (w.jQuery) {
      // $('.tooltip').tooltip(); // example
    }
  }

  // 1) run once on initial load (static pages)
  d.addEventListener('DOMContentLoaded', initTheme);

  // 2) expose for Angular to call after route changes
  w.initTheme = initTheme;
})(window, document);

// Folio Forge — PWA glue: service worker, install prompt, iOS hint, mobile-safe download
(function () {
  var isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

  // 1) Service worker (needs https or localhost)
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () {});
    });
  }

  // 2) Install button (Android / Chrome / Edge)
  var deferred = null;
  var fab = document.createElement("button");
  fab.id = "install-fab";
  fab.innerHTML = "📲 Install app";
  document.body.appendChild(fab);
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); deferred = e;
    if (!isStandalone) fab.classList.add("show");
  });
  fab.addEventListener("click", function () {
    if (!deferred) return;
    deferred.prompt();
    deferred.userChoice.finally(function () { deferred = null; fab.classList.remove("show"); });
  });
  window.addEventListener("appinstalled", function () {
    fab.classList.remove("show");
    if (window.showToast) showToast("✅ Folio Forge installed!");
  });

  // 3) iOS has no install prompt — show a one-time hint
  if (isIOS && !isStandalone) {
    var seen = false;
    try { seen = localStorage.getItem("ff-ios-hint") === "1"; } catch (e) {}
    if (!seen) {
      var hint = document.createElement("div");
      hint.id = "ios-hint";
      hint.innerHTML = '<button aria-label="Close">×</button>Install this app: tap <b>Share</b> (⬆️) then <b>Add to Home Screen</b>.';
      document.body.appendChild(hint);
      setTimeout(function () { hint.classList.add("show"); }, 2500);
      hint.querySelector("button").onclick = function () {
        hint.classList.remove("show");
        try { localStorage.setItem("ff-ios-hint", "1"); } catch (e) {}
      };
    }
  }

  // 4) Mobile-safe download: blob downloads are flaky in iOS/installed apps,
  //    so use the native share sheet when available.
  var origDownload = window.downloadSite;
  window.downloadSite = function () {
    var useShare = (isStandalone || isIOS) && navigator.canShare;
    if (useShare && typeof buildHtml === "function") {
      try {
        var file = new File([buildHtml()], "index.html", { type: "text/html" });
        if (navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: "My portfolio" }).catch(function () {});
          return;
        }
      } catch (e) {}
    }
    if (origDownload) origDownload();
  };
})();

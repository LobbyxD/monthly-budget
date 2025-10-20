// src/utils/fixIOSViewport.ts
export function applyIOSViewportFix() {
  const setViewportHeight = () => {
    // 1% of the current viewport height
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
  };

  // Set on load
  setViewportHeight();

  // Update on resize and orientation change
  window.addEventListener("resize", setViewportHeight);
  window.addEventListener("orientationchange", setViewportHeight);
}

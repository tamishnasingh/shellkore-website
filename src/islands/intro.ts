/**
 * Intro video: the hero's "ERP Easy is now Shellkore" badge opens a full-screen player.
 * Without JavaScript the badge is a plain link to the announcement post.
 */
export function mount(root: HTMLElement): () => void {
  const trigger = root.querySelector<HTMLAnchorElement>("[data-intro-open]");
  const dlg = root.querySelector<HTMLDialogElement>("dialog.intro");
  const video = dlg?.querySelector<HTMLVideoElement>("video");
  if (!trigger || !dlg || !video || typeof dlg.showModal !== "function") return () => {};
  const end = dlg.querySelector<HTMLElement>(".intro-end");

  const open = (e: Event) => {
    e.preventDefault();
    if (video.readyState === 0) video.load();
    end?.classList.remove("show");
    dlg.showModal();
    document.documentElement.classList.add("intro-open");
    video.currentTime = 0;
    video.play().catch(() => { /* autoplay with sound refused: controls are visible */ });
  };
  const close = () => { video.pause(); if (dlg.open) dlg.close(); };
  const onClose = () => { video.pause(); document.documentElement.classList.remove("intro-open"); trigger.focus(); };
  const onEnded = () => end?.classList.add("show");
  const onBackdrop = (e: MouseEvent) => { if (e.target === dlg) close(); };

  trigger.addEventListener("click", open);
  dlg.addEventListener("close", onClose);
  dlg.addEventListener("click", onBackdrop);
  video.addEventListener("ended", onEnded);
  const closeBtns = Array.from(dlg.querySelectorAll<HTMLElement>("[data-intro-close]"));
  closeBtns.forEach((b) => b.addEventListener("click", close));
  const replay = dlg.querySelector<HTMLElement>("[data-intro-replay]");
  const onReplay = () => { end?.classList.remove("show"); video.currentTime = 0; video.play().catch(() => {}); };
  replay?.addEventListener("click", onReplay);
  // "Join the waitlist" in the player: close and focus the hero email field
  const join = dlg.querySelector<HTMLAnchorElement>("[data-intro-join]");
  const onJoin = (e: Event) => {
    e.preventDefault(); close();
    const input = document.querySelector<HTMLInputElement>(".joined input[type=email]") || document.querySelector<HTMLInputElement>("#waitlist input[type=email]");
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => input?.focus({ preventScroll: true }), 450);
  };
  join?.addEventListener("click", onJoin);

  return () => {
    trigger.removeEventListener("click", open); dlg.removeEventListener("close", onClose); dlg.removeEventListener("click", onBackdrop);
    video.removeEventListener("ended", onEnded); closeBtns.forEach((b) => b.removeEventListener("click", close));
    replay?.removeEventListener("click", onReplay); join?.removeEventListener("click", onJoin);
  };
}

/** The Shellkore SK mark (public/brand/shellkore-mark.png, 302×320). */
export function LogoMark({ size = 28 }: { size?: number }) {
  const w = Math.round(size * (302 / 320));
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="logo-mark" src="/brand/shellkore-mark.png" alt="" width={w} height={size} decoding="async" />;
}

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <a className="brand" href={href} aria-label="Shellkore home">
      <LogoMark />
      <span className="brand-word">shellkore</span>
    </a>
  );
}

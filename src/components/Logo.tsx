/** The Shellkore SK mark (public/brand/shellkore-mark.png, 294×256). */
export function LogoMark({ size = 28 }: { size?: number }) {
  const w = Math.round(size * (294 / 256));
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="logo-mark" src="/brand/shellkore-mark.png" alt="" width={w} height={size} decoding="async" />;
}

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <a className="brand" href={href} aria-label="Shellkore home">
      <LogoMark />
      Shellkore
    </a>
  );
}

import { Brand } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="wrap notfound">
      <Brand />
      <h1>This page isn&apos;t on the drawing.</h1>
      <p className="lede">The link may be old, or the page may have moved.</p>
      <p><a className="btn btn-solid" href="/">Back to Shellkore</a></p>
    </main>
  );
}

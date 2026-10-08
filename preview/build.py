"""Generate the shareable preview from the real site's server-rendered home page."""
import re, subprocess, sys, pathlib, urllib.request
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/home/claude/shellkore/dist-artifact/shellkore.html")
html = urllib.request.urlopen("http://localhost:3100/").read().decode()
body = html[html.index("<body"):html.rindex("</body>")]
body = body[body.index(">") + 1:]
body = re.sub(r"<script\b.*?</script>", "", body, flags=re.S)
body = re.sub(r"<link\b[^>]*>", "", body)
body = re.sub(r"<next-route-announcer.*?</next-route-announcer>", "", body, flags=re.S)
body = re.sub(r"<!--.*?-->", "", body, flags=re.S)
# in-page links work in the preview; other pages point at the closest section
body = body.replace('href="/#', 'href="#')
for path, to in [("/about", "#faq"), ("/blog/erp-easy-is-now-shellkore", "#faq"), ("/blog", "#faq"), ("/terms", "#top"), ("/privacy", "#top"), ("/", "#top")]:
    body = body.replace(f'href="{path}"', f'href="{to}"')
# embed local images (operator logos) so the single-file preview shows them
import base64
def _inline(m):
    f = ROOT / "public" / m.group(1).lstrip("/")
    return f'src="data:image/png;base64,{base64.b64encode(f.read_bytes()).decode()}"' if f.exists() else m.group(0)
body = re.sub(r'src="(/brand/[^"]+\.png)"', _inline, body)
# the logo sheen uses the same files through a CSS mask: url(/brand/...)
def _inline_url(m):
    f = ROOT / "public" / m.group(1).lstrip("/")
    return f'url(data:image/png;base64,{base64.b64encode(f.read_bytes()).decode()})' if f.exists() else m.group(0)
body = re.sub(r'url\((/brand/[^)]+\.png)\)', _inline_url, body)
# SVG <image href> (the hub mark on the site board)
body = re.sub(r'href="(/brand/[^"]+\.png)"', lambda m: _inline(m).replace('src=', 'href=', 1), body)
# the 3D roadmap's textures and posters (also referenced from the island's data-tex JSON)
def _inline_rm(m):
    f = ROOT / "public" / m.group(0).lstrip("/")
    mime = "image/webp" if f.suffix == ".webp" else "image/png"
    return f"data:{mime};base64,{base64.b64encode(f.read_bytes()).decode()}" if f.exists() else m.group(0)
body = re.sub(r"/roadmap/[a-z_-]+\.(?:webp|png)", _inline_rm, body)
# the intro video, poster and captions travel inside the single-file preview (720p keeps it light)
_v = ROOT / "public/video"
_mp4 = "data:video/mp4;base64," + base64.b64encode((_v / "shellkore-intro-720.mp4").read_bytes()).decode()
_webm = "data:video/webm;base64," + base64.b64encode((_v / "shellkore-intro.webm").read_bytes()).decode()
body = body.replace('src="/video/shellkore-intro.mp4"', f'src="{_mp4}"').replace('src="/video/shellkore-intro.webm"', f'src="{_webm}"')
body = body.replace('poster="/video/shellkore-intro-poster.jpg"', 'poster="data:image/jpeg;base64,' + base64.b64encode((_v / "shellkore-intro-poster.jpg").read_bytes()).decode() + '"')
body = body.replace('src="/video/shellkore-intro.en.vtt"', 'src="data:text/vtt;base64,' + base64.b64encode((_v / "shellkore-intro.en.vtt").read_bytes()).decode() + '"')
css = (ROOT / "src/app/globals.css").read_text()
# embed the site's own Geist font so the preview never falls back to a system font
_fd = ROOT / "node_modules/geist/dist/fonts"
_ff = "".join(
    f'@font-face{{font-family:"{fam}";src:url(data:font/woff2;base64,{base64.b64encode((_fd / path).read_bytes()).decode()}) format("woff2");font-weight:100 900;font-style:normal;font-display:swap}}'
    for fam, path in [("Geist", "geist-sans/Geist-Variable.woff2"), ("Geist Mono", "geist-mono/GeistMono-Variable.woff2")]
)
css = _ff + ':root{--font-geist-sans:"Geist";--font-geist-mono:"Geist Mono"}\n' + css[: css.index("/* ===== admin ===== */")] if "/* ===== admin ===== */" in css else css
js = subprocess.run(["npx", "-y", "esbuild@0.24.0", str(ROOT / "preview/runtime.ts"), "--bundle", "--format=iife", "--target=es2019", "--minify"], capture_output=True, text=True, check=True).stdout
fonts = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(f'<meta charset="utf-8">\n<title>Shellkore</title>\n<style>\n{css}\n</style>\n{body}\n<script>\n{js}\n</script>\n')
print("preview", OUT, len(body), "html", len(css), "css", len(js), "js")

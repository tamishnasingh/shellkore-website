import { Brand } from "./Logo";
import { CopyButton } from "./CopyButton";

export function Footer({ email, linkedin }: { email: string; linkedin: string }) {
  return (
    <footer>
      <div className="wrap">
        <div className="foot three">
          <div>
            <Brand />
            <p>The construction operating system. Run every job from lead to cash in one place.</p>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>
              <li><a href="/#product">Product</a></li>
              <li><a href="/#how">How it works</a></li>
              <li><a href="/#faq">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4>Connect</h4>
            <ul>
              <li><a href={linkedin} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a></li>
              <li style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: ".92rem" }}>{email}</span>
                <CopyButton text={email} />
              </li>
            </ul>
          </div>
        </div>
        <div className="legal">
          <span>© {new Date().getFullYear()} Shellkore. All rights reserved. Built by Techfnatic Labs.</span>
          <nav>
            <a href="/terms">Terms of Service</a>
            <a href="/privacy">Privacy Policy</a>
            <a href="#top">Back to top</a>
          </nav>
        </div>
        <div className="wordmark" aria-hidden="true">Shellkore</div>
      </div>
    </footer>
  );
}

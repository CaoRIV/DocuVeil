import { FaCodeBranch, FaLock, FaRegFileAlt, FaMagic } from "react-icons/fa";
import "../App.css";

const installUrl = "https://github.com/CaoRIV/DocuVeil#install-and-run-from-source";

const Home = () => (
  <div className="app" id="home">
    <nav className="navbar" aria-label="Main navigation">
      <ul>
        <li><a href="#home">Home</a></li>
        <li><a href="#features">Principles</a></li>
        <li><a href="#status">Status</a></li>
      </ul>
    </nav>
    <main>
      <header className="header-section">
        <h1>DocuVeil</h1>
        <p className="typing">A calmer way to work with AI.</p>
        <div className="release-status" id="status">
          <FaCodeBranch aria-hidden="true" /> Open-source release in progress
        </div>
        <a className="install-link" href={installUrl}>Install from GitHub</a>
        <a className="explore-link" href="#features">Explore DocuVeil ↓</a>
      </header>
      <section className="laptop-container" aria-labelledby="features-title">
        <div className="platform-badge">Chrome + Edge · local-first</div>
        <div className="laptop">
          <div className="laptop-screen">
            <div className="screen-content">
              <div className="demo-content" id="features">
                <h2 className="demo-title" id="features-title">
                  Your AI workspace, in document mode
                </h2>
                <div className="demo-description">
                  DocuVeil gives supported AI chats a focused document-style interface
                  without collecting or storing your conversations. Only the extension’s
                  on/off settings are stored locally. ChatGPT and Claude still process
                  your conversations under their own privacy policies.
                </div>
                <div className="demo-features">
                  <div className="feature-item">
                    <FaLock className="feature-icon" />
                    <span className="feature-text">Local</span>
                  </div>
                  <div className="feature-item">
                    <FaRegFileAlt className="feature-icon" />
                    <span className="feature-text">Focused</span>
                  </div>
                  <div className="feature-item">
                    <FaMagic className="feature-icon" />
                    <span className="feature-text">Open source</span>
                  </div>
                </div>
                <a
                  className="install-link"
                  href={installUrl}
                >
                  Install from GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
);

export default Home;

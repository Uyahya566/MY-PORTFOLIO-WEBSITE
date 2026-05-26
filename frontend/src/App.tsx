import React, { useState, useEffect, useRef, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Stage, Html, useProgress } from '@react-three/drei';
import { Analytics } from '@vercel/analytics/react';
import CanvasBackground from './components/CanvasBackground';

import './App.css';

// TypeScript Type Interfaces
interface Project {
  id: number;
  title: string;
  desc: string;
  tags: string[];
  features: string[];
  tech: string[];
  image: string;
  github: string;
  live: string;
  category: string | string[];
}

interface TerminalLine {
  id: string;
  type: 'prompt' | 'output' | 'system' | 'error' | 'success';
  text: string;
  commandTyped?: string;
}

// Resilient fallback projects array if backend API is not responding
const FALLBACK_PROJECTS: Project[] = [
  {
    id: 1,
    title: "AI Assisted Inventory Management System",
    desc: "An intelligent, web-based Progressive Web App that integrates inventory management, sales processing, and AI-driven decision support into a single, efficient platform to optimize retail operations.",
    tags: ["Web Apps", "AI/ML"],
    features: ["Integrated inventory and sales processing", "AI-driven decision support for retail operations", "Progressive Web App (PWA) capabilities"],
    tech: ["Next.js", "TypeScript", "HTML5", "CSS3", "React", "Node.js", "Firebase"],
    image: "/assets/inventory management system.png",
    github: "https://github.com/Uyahya566/inventory-management-system",
    live: "https://hub-computers.vercel.app/login",
    category: ["ai", "web"]
  }
];

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      if (this.state.error?.message.includes("WebGL")) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px', background: 'rgba(0,0,0,0.5)', color: 'var(--text-secondary)', textAlign: 'center' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '3rem', color: 'var(--accent-primary)', marginBottom: '1rem' }}></i>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>WebGL Not Supported</h3>
            <p>Your current browser preview does not support 3D hardware acceleration.</p>
            <p style={{ marginTop: '0.5rem', color: 'var(--accent-primary)' }}>Please open <strong>http://localhost:5173</strong> in a real browser (Chrome/Edge) to view the 3D gallery.</p>
          </div>
        );
      }
      return (
        <div style={{ color: '#ff4444', padding: '20px', background: '#222', zIndex: 9999, position: 'relative' }}>
          <h4>3D Viewer Error</h4>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>{this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children; 
  }
}

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '1.2rem', textShadow: '0 0 10px var(--accent-primary)' }}>
        {progress.toFixed(0)}%
      </div>
    </Html>
  );
}

function App() {
  // --- States ---
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
        if (savedTheme) return savedTheme;
      } catch (e) {
        console.warn("localStorage read blocked in private browsing mode:", e);
      }
      try {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } catch (e) {
        return 'dark';
      }
    }
    return 'dark';
  });
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Projects states
  const [projects, setProjects] = useState<Project[]>(FALLBACK_PROJECTS);
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Modal states
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  
  // Contact Form states
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });
  
  // Scroll to Top state
  const [scrollTopVisible, setScrollTopVisible] = useState(false);

  // Terminal states
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([
    {
      id: 'init',
      type: 'system',
      text: "Welcome to Portfolio CLI v1.2.0. Type 'help' for a list of available actions."
    }
  ]);

  // --- Refs ---
  const cliBodyRef = useRef<HTMLDivElement | null>(null);
  const cliInputRef = useRef<HTMLInputElement | null>(null);


  // --- 3D Tilt Card Event Handlers ---
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const px = x / rect.width;
    const py = y / rect.height;
    
    const maxTilt = 12; // Moderate, elegant tilt
    const rx = (0.5 - py) * maxTilt;
    const ry = (px - 0.5) * maxTilt;
    
    card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.03, 1.03, 1.03)`;
    card.style.setProperty('--mx', `${px * 100}%`);
    card.style.setProperty('--my', `${py * 100}%`);
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    card.style.setProperty('--mx', '50%');
    card.style.setProperty('--my', '50%');
  };

  // --- Sync theme changes to document & status bar meta ---
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    
    // Force instant reflow and repaint of root element backgrounds to trigger status bar update
    const colorValue = theme === 'dark' ? '#030014' : '#f4f6fc';
    document.documentElement.style.backgroundColor = colorValue;
    document.body.style.backgroundColor = colorValue;
    
    // Dynamically update mobile browser address/status bar color to prevent bar popping
    // (Uses static index.html tag and cold arctic frost #f4f6fc for perfect light theme status bar transition)
    const metaThemeColor = document.getElementById('theme-meta') || document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', colorValue);
    }
  }, [theme]);

  // --- Fetch Projects from Node.js Express API ---
  useEffect(() => {
    fetch('http://localhost:5000/api/projects')
      .then(res => {
        if (!res.ok) throw new Error('API server unresponsive');
        return res.json();
      })
      .then((data: Project[]) => {
        setProjects(data);
      })
      .catch(err => {
        console.warn('Could not fetch from live Node.js API, utilizing typed front-end backup indices:', err.message);
        setProjects(FALLBACK_PROJECTS);
      });
  }, []);

  // --- Sticky Header & Section Highlight ---
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      setScrollTopVisible(window.scrollY > 400);

      // Section intersection highlight
      const sections = ['hero', 'about', 'terminal', 'projects', 'communities', 'contact'];
      let currentSection = 'hero';
      
      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop - 120;
          if (window.scrollY >= top) {
            currentSection = sectionId;
          }
        }
      }
      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);



  // --- Auto Scroll CLI Terminal ---
  useEffect(() => {
    if (cliBodyRef.current) {
      cliBodyRef.current.scrollTop = cliBodyRef.current.scrollHeight;
    }
  }, [terminalHistory]);

  // --- Theme Toggle Action ---
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      localStorage.setItem('theme', nextTheme);
    } catch (e) {
      console.warn("localStorage write blocked in private browsing mode:", e);
    }
  };

  // --- Terminal Command Handler ---
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = terminalInput;
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;

    const newHistory: TerminalLine[] = [
      ...terminalHistory,
      {
        id: `cmd-${Date.now()}`,
        type: 'prompt',
        text: '',
        commandTyped: raw
      }
    ];

    const generateId = () => `res-${Date.now()}-${Math.random()}`;

    switch (cmd) {
      case 'help':
        newHistory.push({
          id: generateId(),
          type: 'success',
          text: `Available commands inside Portfolio CLI:
  about      - Displays my detailed developer biography.
  skills     - Shows my technical skill indices.
  projects   - Catalogs summaries of current engineering projects.
  contact    - Outputs direct connection protocols.
  clear      - Empties console outputs.`
        });
        break;

      case 'about':
        newHistory.push({
          id: generateId(),
          type: 'output',
          text: `Biography - UMAR YAHYA:
  A detail-oriented and solutions-driven IT professional with strong communication skills 
  and a proven ability to collaborate effectively across teams. Known for analytical thinking 
  and a calm, patient approach to problem-solving, especially under pressure.`
        });
        break;

      case 'skills':
        newHistory.push({
          id: generateId(),
          type: 'output',
          text: `Technical Skill Matrix:
  =============================
  [Dev & Data] Python, HTML5/CSS3, MySQL, VB, Firebase, Node.js, React, Next.js, TS, Tailwind, Git
  [Systems]    Windows, macOS, Android, Hardware Setup, Notion
  [Creative]   Adobe Photoshop, FL Studio 21, CapCut, Canva
  [Networking] Wireshark, Advanced IP Subnetting`
        });
        break;

      case 'projects':
        newHistory.push({
          id: generateId(),
          type: 'output',
          text: `Project Catalog:
  =============================
  1. AI Assisted Inventory Management System
  
  * Type 'projects 1' to view specific detailed outputs!`
        });
        break;

      case 'projects 1':
      case 'projects 2':
      case 'projects 3': {
        const id = parseInt(cmd.split(' ')[1]);
        const proj = projects.find(p => p.id === id);
        if (proj) {
          newHistory.push({
            id: generateId(),
            type: 'success',
            text: `PROJECT DEEP-DIVE: ${proj.title}
  ---------------------------------------------
  Description  : ${proj.desc}
  Tech Stack   : ${proj.tech.join(', ')}
  Highlights   : ${proj.features.map(f => `\n    - ${f}`).join('')}`
          });
        } else {
          newHistory.push({
            id: generateId(),
            type: 'error',
            text: `Project ID ${id} not found in database.`
          });
        }
        break;
      }

      case 'contact':
        newHistory.push({
          id: generateId(),
          type: 'success',
          text: `Direct Connection Protocols:
  Email    : yahyaumar566@gmail.com / business.umaryahya566@gmail.com
  Phone    : 0265390165 / 0247110992
  Location : MADINA MAYEHOT, GHANA
  Address  : 41 BERLIN STREET (GM-002-1163)
  Socials  : GitHub (@Uyahya566) / Snapchat (@sfP35S6Q)`
        });
        break;

      case 'clear':
        setTerminalHistory([
          {
            id: 'init-reset',
            type: 'system',
            text: "Console cleared. Type 'help' for available actions."
          }
        ]);
        setTerminalInput('');
        return;

      default:
        newHistory.push({
          id: generateId(),
          type: 'error',
          text: `Command not recognized: '${raw}'. Type 'help' for options.`
        });
    }

    setTerminalHistory(newHistory);
    setTerminalInput('');
  };

  // --- Contact Form Submission Handler ---
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, subject, message } = formData;

    if (!name || !email || !subject || !message) {
      setFormFeedback({ text: 'All fields are required. Please input correct parameters.', type: 'error' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormFeedback({ text: 'Please provide a valid email address configuration.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setFormFeedback({ text: '', type: '' });

    try {
      // Web3Forms payload
      const payload = {
        ...formData,
        access_key: import.meta.env.VITE_WEB3FORMS_KEY || "156e985a-a26e-4eec-8975-03f048d547c0"
      };

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || 'Failed to dispatch email');
      }

      setFormFeedback({ text: 'Email sent', type: 'success' });
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err: unknown) {
      console.error('Email dispatch failed:', err instanceof Error ? err.message : String(err));
      setFormFeedback({ 
        text: 'Failed to send message. Please try emailing me directly.', 
        type: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Modal Open details Grabs ---
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // --- Scroll top Action ---
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <CanvasBackground theme={theme} />
      {/* Navigation Header */}
      <header className={`header ${scrolled ? 'scrolled' : ''}`} id="header">
        <div className="container nav-container">
          <a href="#hero" className="logo" id="nav-logo">
            <span className="logo-icon">&lt;</span>UMAR<span className="logo-icon"> YAHYA /&gt;</span>
          </a>
          
          <nav className="nav-links" id="nav-menu" style={{ display: mobileMenuOpen ? 'flex' : undefined, flexDirection: mobileMenuOpen ? 'column' : undefined, position: mobileMenuOpen ? 'absolute' : undefined, top: mobileMenuOpen ? '5rem' : undefined, left: mobileMenuOpen ? '0' : undefined, width: mobileMenuOpen ? '100%' : undefined, background: mobileMenuOpen ? 'var(--bg-secondary)' : undefined, borderBottom: mobileMenuOpen ? '1px solid var(--border-color)' : undefined, padding: mobileMenuOpen ? '2rem' : undefined, gap: mobileMenuOpen ? '1.5rem' : undefined }}>
            <a href="#hero" className={`nav-link ${activeSection === 'hero' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>Home</a>
            <a href="#about" className={`nav-link ${activeSection === 'about' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>About</a>
            <a href="#terminal" className={`nav-link ${activeSection === 'terminal' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>Terminal</a>
            <a href="#projects" className={`nav-link ${activeSection === 'projects' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>Projects</a>
            <a href="#communities" className={`nav-link ${activeSection === 'communities' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>Communities</a>
            <a href="#contact" className={`nav-link ${activeSection === 'contact' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>Contact</a>
          </nav>
          
          <div className="nav-controls">
            <button className="theme-toggle-btn" id="theme-toggle" aria-label="Toggle visual theme" onClick={toggleTheme}>
              <i className={theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'}></i>
            </button>
            <button className="mobile-nav-toggle" id="mobile-toggle" aria-label="Toggle mobile menu" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <i className={mobileMenuOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'}></i>
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <motion.section 
          id="hero" 
          className="hero-section"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="container hero-grid">
            <div className="hero-content">
              <div className="hero-subtitle">
                <i className="fa-solid fa-terminal"></i>
                <span>const Professional = 'UMAR YAHYA';</span>
              </div>
              <motion.h1 
                className="hero-title"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                Hi, I'm <br />
                <span className="gradient-text">Umar Yahya.</span>
              </motion.h1>
              <motion.p 
                className="hero-description"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                I am a detail oriented IT professional and developer who bridges the gap between hardware infrastructure, system security, and creative digital solutions. With a strong foundation in IT management, I enjoy tackling complex challenges whether that means configuring secure networks, troubleshooting hardware components, or exploring the intricacies of cybersecurity and cryptography. Beyond traditional IT support, I am highly engaged with modern web development, particularly building Progressive Web Apps (PWAs). When I am not writing code or managing systems, I channel my creativity into multimedia production, interface design, and 3D asset capturing.
              </motion.p>
              <div className="hero-actions">
                <a href="#projects" className="btn btn-primary" id="hero-cta-projects">View Projects</a>
                <a href="#contact" className="btn btn-secondary" id="hero-cta-contact">Let's Connect</a>
              </div>
            </div>
            

            <div className="hero-visual">
              <div className="hero-glow-effect"></div>
              <motion.div 
                className="avatar-wrapper"
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.7}
                whileDrag={{ scale: 1.1, cursor: "grabbing" }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="avatar-inner">
                  <img src="/assets/avatar.jpeg" alt="UMAR YAHYA - Profile Avatar" className="avatar-image" id="avatar-img" />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Tech Stack Section */}
        <motion.section 
          id="stack" 
          className="stack-section"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <div className="container">
            <h2 className="section-title"><span className="gradient-text">Technical Arsenal</span></h2>
            
            <div className="stack-grid-container">
              {/* Category 1: Development & Data */}
              <div className="stack-category">
                <h3 className="stack-category-title">Development & Data</h3>
                <div className="stack-items">
                  <div className="stack-item">
                    <div className="stack-icon"><i className="devicon-python-plain colored"></i></div>
                    <div className="stack-name">Python</div>
                  </div>
                  <div className="stack-item">
                    <div className="stack-icon"><i className="devicon-html5-plain colored"></i></div>
                    <div className="stack-name">HTML5</div>
                  </div>
                  <div className="stack-item">
                    <div className="stack-icon"><i className="devicon-css3-plain colored"></i></div>
                    <div className="stack-name">CSS3</div>
                  </div>
                  <div className="stack-item">
                    <div className="stack-icon"><i className="devicon-mysql-plain colored"></i></div>
                    <div className="stack-name">MySQL</div>
                  </div>
                  <div className="stack-item">
                    <div className="stack-icon"><i className="devicon-visualstudio-plain colored"></i></div>
                    <div className="stack-name">Visual Basic</div>
                  </div>
                  <div className="stack-item">
                    <div className="stack-icon"><i className="devicon-firebase-plain colored"></i></div>
                    <div className="stack-name">Firebase</div>
                  </div>
                  <div className="stack-item">
                    <div className="stack-icon"><img src="/assets/antigravity.png" alt="Antigravity" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
                    <div className="stack-name">Antigravity</div>
                  </div>
                  <div className="stack-item">
                    <div className="stack-icon"><i className="devicon-nodejs-plain colored"></i></div>
                    <div className="stack-name">Node.js</div>
                  </div>
                  <div className="stack-item">
                    <div className="stack-icon"><i className="devicon-react-original colored"></i></div>
                    <div className="stack-name">React</div>
                  </div>
                  <div className="stack-item">
                    <div className="stack-icon"><img src="/assets/nextjs.png" alt="Next.js" style={{ width: '40px', height: '40px', objectFit: 'contain', filter: 'invert(1) drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))' }} /></div>
                    <div className="stack-name">Next.js</div>
                  </div>
                  <div className="stack-item">
                    <div className="stack-icon"><i className="devicon-typescript-plain colored"></i></div>
                    <div className="stack-name">TypeScript</div>
                  </div>
                  <div className="stack-item">
                    <div className="stack-icon"><i className="devicon-tailwindcss-original colored"></i></div>
                    <div className="stack-name">Tailwind CSS</div>
                  </div>
                  <div className="stack-item">
                    <div className="stack-icon"><i className="devicon-git-plain colored"></i></div>
                    <div className="stack-name">Git</div>
                  </div>
                </div>
              </div>

              {/* Category 2: Systems & IT Support */}
              <div className="stack-category">
                <h3 className="stack-category-title">Systems & IT Support</h3>
                <div className="stack-items">
                  <div className="stack-item">
                    <div className="stack-icon"><i className="devicon-windows8-original colored"></i></div>
                    <div className="stack-name">Windows OS</div>
                  </div>
                  <div className="stack-item">
                    <div className="stack-icon"><i className="devicon-apple-original colored"></i></div>
                    <div className="stack-name">macOS / iOS</div>
                  </div>
                  <div className="stack-item">
                    <div className="stack-icon"><i className="devicon-android-plain colored"></i></div>
                    <div className="stack-name">Android</div>
                  </div>
                  <div className="stack-item">
                    <div className="stack-icon"><i className="fa-solid fa-server" style={{ color: '#0ea5e9' }}></i></div>
                    <div className="stack-name">Hardware & Setup</div>
                  </div>
                  <div className="stack-item">
                    <div className="stack-icon"><img src="/assets/notion.png" alt="Notion" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
                    <div className="stack-name">Notion</div>
                  </div>
                </div>
              </div>

              {/* Category 3: Creative & Media */}
              <div className="stack-category">
                <h3 className="stack-category-title">Creative & Media</h3>
                <div className="stack-items">
                  <div className="stack-item">
                    <div className="stack-icon"><i className="devicon-photoshop-plain colored"></i></div>
                    <div className="stack-name">Adobe Photoshop</div>
                  </div>
                  <div className="stack-item">
                    <div className="stack-icon"><img src="/assets/flstudio.jpg" alt="FL Studio" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} /></div>
                    <div className="stack-name">FL Studio 21</div>
                  </div>
                  <div className="stack-item">
                    <div className="stack-icon"><img src="/assets/capcut.jpg" alt="CapCut" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} /></div>
                    <div className="stack-name">CapCut Video</div>
                  </div>
                  <div className="stack-item">
                    <div className="stack-icon"><i className="devicon-canva-original colored"></i></div>
                    <div className="stack-name">Canva</div>
                  </div>
                </div>
              </div>

              {/* Category 4: Networking & Security */}
              <div className="stack-category">
                <h3 className="stack-category-title">Networking & Security</h3>
                <div className="stack-items">
                  <div className="stack-item">
                    <div className="stack-icon"><i className="fa-solid fa-network-wired" style={{ color: '#8b5cf6' }}></i></div>
                    <div className="stack-name">LAN & Cabling</div>
                  </div>
                  <div className="stack-item">
                    <div className="stack-icon"><i className="fa-solid fa-shield-halved" style={{ color: '#10b981' }}></i></div>
                    <div className="stack-name">Threat Mitigation</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Digital Captures 3D Gallery */}
        <motion.section 
          id="digital-captures" 
          className="gallery-section"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <div className="container">
            <h2 className="section-title"><span className="gradient-text">Digital Captures</span></h2>
            <p className="section-subtitle">
              I am currently experimenting with capturing and working with 3D assets for the web. Check out one of my interactive works below! More captures will be available soon.
            </p>
            
            <div className="model-viewer-container">
              <ErrorBoundary>
                <Canvas shadows camera={{ position: [0, 0, 4], fov: 50 }} dpr={[1, 2]} frameloop="demand">
                  <Suspense fallback={<Loader />}>
                    <Stage environment="city" intensity={0.6}>
                      <Model url="/assets/pikachu.glb" />
                    </Stage>
                  </Suspense>
                  <OrbitControls autoRotate={false} enableZoom={false} />
                </Canvas>
              </ErrorBoundary>
              <div className="model-viewer-overlay">
                <i className="fa-solid fa-hand-pointer"></i> Drag to explore
              </div>
            </div>
          </div>
        </motion.section>

        {/* About Section */}
        <motion.section 
          id="about" 
          className="section"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <div className="container">
            <h2 className="section-title"><span className="gradient-text">About & Journey</span></h2>
            <p className="section-subtitle">Dedicated to applying problem-solving skills and growing through hands-on technology challenges.</p>
            
            <div className="about-grid">
              <div className="about-details">
                <p className="about-p">
                  I am a solutions-driven IT specialist and developer dedicated to ensuring efficient, secure, and user-focused technology operations. I combine a calm, analytical approach to problem-solving with a broad technical skillset that spans hands-on hardware repair, system maintenance, and web development.
                </p>
                <h3 className="about-subtitle" style={{ marginTop: '2rem', marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>My Interests & Focus Areas</h3>
                <ul className="interest-list">
                  <li className="interest-item glow-border">
                    <strong><i className="fa-solid fa-code"></i> Emerging Web Technologies:</strong> Building robust web experiences, exploring Progressive Web Apps (PWAs), and integrating on-device AI tools using WebGPU and WebLLM.
                  </li>
                  <li className="interest-item glow-border">
                    <strong><i className="fa-solid fa-microchip"></i> Hardware & Electronics:</strong> Getting hands-on with hardware testing, electronics repair, and deep-level component troubleshooting.
                  </li>
                  <li className="interest-item glow-border">
                    <strong><i className="fa-solid fa-shield-halved"></i> Cybersecurity & Cryptography:</strong> Studying data protection techniques, threat mitigation, and the mechanics of cryptographic ciphers.
                  </li>
                  <li className="interest-item glow-border">
                    <strong><i className="fa-solid fa-palette"></i> Design & Multimedia:</strong> Blending technical precision with creativity through audio engineering, 3D asset compression, and UI/UX design.
                  </li>
                </ul>
              </div>
              
              <div className="about-timeline-box">
                <h3 className="timeline-title"><i className="fa-solid fa-briefcase"></i> Experience & Education</h3>
                <div className="timeline">
                  <div className="timeline-item glow-timeline-item">
                    <div className="timeline-dot glow-dot"></div>
                    <div className="timeline-date glow-text">In Progress</div>
                    <h4 className="timeline-role glow-text">Bachelor of Science in Information Technology Management</h4>
                    <div className="timeline-company">University of Professional Studies Accra</div>
                    <p className="timeline-desc">Currently advancing technical and managerial expertise in enterprise IT systems.</p>
                  </div>

                  <div className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="timeline-date">2023 - 2025</div>
                    <h4 className="timeline-role">Co-Producer</h4>
                    <div className="timeline-company">B.M.W Studios</div>
                    <p className="timeline-desc">Collaborated on audio production using FL Studio 21, mixing and mastering projects. Applied technical expertise in software and hardware setup for studio operations.</p>
                  </div>
                  
                  <div className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="timeline-date">2024</div>
                    <h4 className="timeline-role">Diploma in IT Management</h4>
                    <div className="timeline-company">University of Professional Studies Accra</div>
                    <p className="timeline-desc">Graduated with foundational knowledge in database administration, networking, and systems management.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* CLI Terminal Section */}
        <motion.section 
          id="terminal" 
          className="section terminal-section"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <div className="container">
            <h2 className="section-title">Interactive <span className="gradient-text">Developer CLI</span></h2>
            <p className="section-subtitle">Use this geeky, retro terminal emulator to explore my biography, skill matrix, and project directory.</p>
            
            <div className="terminal-container glow-border">
              <div className="terminal-header">
                <div className="terminal-buttons">
                  <div className="terminal-btn close"></div>
                  <div className="terminal-btn minimize"></div>
                  <div className="terminal-btn maximize"></div>
                </div>
                <div className="terminal-title-text">umar-dev@portfolio-cli: ~</div>
                <div style={{ width: '50px' }}></div>
              </div>
              
              <div className="terminal-body" id="cli-body" ref={cliBodyRef} onClick={() => cliInputRef.current?.focus()}>
                {terminalHistory.map((line) => (
                  <div key={line.id}>
                    {line.type === 'prompt' ? (
                      <div className="terminal-prompt">
                        <span className="terminal-prompt-prefix">umar-dev ~ $</span>
                        <span className="terminal-command-typed">{line.commandTyped}</span>
                      </div>
                    ) : (
                      <div className={`terminal-output ${line.type === 'success' ? 'terminal-output-success' : line.type === 'error' ? 'terminal-output-error' : ''}`} style={{ whiteSpace: 'pre-wrap' }}>
                        {line.text}
                      </div>
                    )}
                  </div>
                ))}
                
                <form onSubmit={handleTerminalSubmit} className="terminal-prompt" id="cli-prompt-container">
                  <span className="terminal-prompt-prefix">umar-dev ~ $</span>
                  <input
                    type="text"
                    className="terminal-prompt-input"
                    id="cli-input"
                    ref={cliInputRef}
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    autoComplete="off"
                    spellCheck="false"
                    aria-label="Terminal Command Input"
                  />
                </form>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Projects Grid Section */}
        <motion.section 
          id="projects" 
          className="section"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <div className="container">
            <h2 className="section-title">Selected <span className="gradient-text">Projects</span></h2>
            <p className="section-subtitle">A collection of custom applications designed, coded, and deployed across diverse technical domains.</p>
            
            <div className="project-filters">
              {['all', 'web', 'ai', 'mobile'].map((filt) => (
                <button
                  key={filt}
                  className={`filter-btn ${activeFilter === filt ? 'active' : ''}`}
                  onClick={() => setActiveFilter(filt)}
                >
                  {filt === 'all' ? 'All Tech' : filt === 'web' ? 'Web Apps' : filt === 'ai' ? 'AI / ML' : 'Mobile Apps'}
                </button>
              ))}
            </div>
            
            <div className="projects-grid" id="projects-grid">
              {(() => {
                const filtered = projects.filter(p => activeFilter === 'all' || (Array.isArray(p.category) ? p.category.includes(activeFilter) : p.category === activeFilter));
                if (filtered.length === 0) {
                  return (
                    <div className="coming-soon-message" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '6rem 0', opacity: 0.8 }}>
                      <i className="fa-solid fa-code" style={{ fontSize: '3rem', marginBottom: '1.5rem', color: 'var(--text-muted)' }}></i>
                      <h3>Coming Soon!</h3>
                      <p style={{ color: 'var(--text-muted)' }}>I am currently documenting and finalizing my work in this category.</p>
                    </div>
                  );
                }
                return filtered.map((proj) => (
                  <div key={proj.id} className="project-card glass glow-border tilt-card" onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}>
                    <div className="card-glare-wrapper"><div className="card-glare"></div></div>
                    <div className="tilt-card-inner">
                      <div className="project-card-image-box">
                        <img src={proj.image} alt={`${proj.title} Preview`} className="project-card-image" />
                        <div className="project-card-overlay">
                          <a href={proj.github} className="project-link-btn" title="View Source" target="_blank" rel="noopener noreferrer"><i className="fa-brands fa-github"></i></a>
                          <a href={proj.live} className="project-link-btn" title="Live Preview" target="_blank" rel="noopener noreferrer"><i className="fa-solid fa-arrow-up-right-from-square"></i></a>
                        </div>
                      </div>
                      <div className="project-card-details">
                        <div className="project-card-tags">
                          {proj.tags.map((t, idx) => (
                            <span key={idx} className="project-card-tag">#{t.split(' ')[0]}</span>
                          ))}
                        </div>
                        <h3 className="project-card-title tilt-3d-text">{proj.title}</h3>
                        <p className="project-card-desc">{proj.desc.slice(0, 120)}...</p>
                        <div className="project-card-more" onClick={() => setSelectedProjectId(proj.id)}>
                          Learn More <i className="fa-solid fa-arrow-right"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </motion.section>

        {/* Modal Overlay Component */}
        {selectedProject && (
          <div className="modal-overlay open" onClick={() => setSelectedProjectId(null)}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="modal-banner">
                <img src={selectedProject.image} alt={selectedProject.title} className="modal-banner-image" />
                <button className="modal-close-btn" onClick={() => setSelectedProjectId(null)} aria-label="Close details modal">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
              <div className="modal-content">
                <div className="modal-header-meta">
                  <div>
                    <h3 className="modal-title">{selectedProject.title}</h3>
                    <div className="modal-tags">
                      {selectedProject.tags.map((tag, idx) => (
                        <span key={idx} className="modal-tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="modal-links">
                    <a href={selectedProject.github} className="btn btn-secondary" target="_blank" rel="noopener noreferrer"><i className="fa-brands fa-github"></i> Github</a>
                    <a href={selectedProject.live} className="btn btn-primary" target="_blank" rel="noopener noreferrer"><i className="fa-solid fa-arrow-up-right-from-square"></i> Demo</a>
                  </div>
                </div>
                <p className="modal-body-desc">{selectedProject.desc}</p>
                
                <div className="modal-specs">
                  <div>
                    <h4 className="modal-spec-title">Key Architectural Features</h4>
                    <div className="modal-spec-list">
                      {selectedProject.features.map((feat, idx) => (
                        <span key={idx} className="modal-spec-badge">{feat}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="modal-spec-title">Tech Stack Details</h4>
                    <div className="modal-spec-list">
                      {selectedProject.tech.map((t, idx) => (
                        <span key={idx} className="modal-spec-badge">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Communities Section */}
        <motion.section 
          id="communities" 
          className="section"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <div className="container">
            <h2 className="section-title">Tech <span className="gradient-text">Communities</span></h2>
            <p className="section-subtitle">Active involvement and leadership in developer ecosystems across the globe.</p>
            
            <div className="communities-grid">
              <div className="community-card glass glow-border tilt-card" onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}>
                <div className="card-glare-wrapper"><div className="card-glare"></div></div>
                <div className="tilt-card-inner">
                  <div className="community-header">
                    <div className="community-icon"><i className="fa-brands fa-reddit-alien" style={{ color: '#ff4500' }}></i></div>
                    <div>
                      <h3 className="community-title">r/TechGhana</h3>
                      <div className="community-role">Founder & Lead Moderator</div>
                    </div>
                  </div>
                  <p className="community-desc">
                    Founded and manage the premier Reddit community for Ghanaian technologists. We host discussions on software engineering, share local tech news, and provide mentorship to upcoming developers in the region.
                  </p>
                  <a href="https://www.reddit.com/r/TechGhana/" className="community-link" target="_blank" rel="noopener noreferrer">
                    Join Community <i className="fa-solid fa-arrow-right"></i>
                  </a>
                </div>
              </div>

              <div className="community-card glass glow-border tilt-card" onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}>
                <div className="card-glare-wrapper"><div className="card-glare"></div></div>
                <div className="tilt-card-inner">
                  <div className="community-header">
                    <div className="community-icon"><i className="devicon-canva-original colored"></i></div>
                    <div>
                      <h3 className="community-title">Canva Ghana</h3>
                      <div className="community-role">Active Member</div>
                    </div>
                  </div>
                  <p className="community-desc">
                    A vibrant community of designers and creators. I actively participate in local design workshops and share creative assets.
                  </p>
                </div>
              </div>

              <div className="community-card glass glow-border tilt-card" onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}>
                <div className="card-glare-wrapper"><div className="card-glare"></div></div>
                <div className="tilt-card-inner">
                  <div className="community-header">
                    <div className="community-icon" style={{ background: 'transparent', border: 'none', borderRadius: 0, width: 'auto', justifyContent: 'flex-start' }}>
                      <img src="/assets/gdg.png" alt="GDG Accra" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
                    </div>
                    <div>
                      <h3 className="community-title">Google Developer Group Accra</h3>
                      <div className="community-role">Active Member</div>
                    </div>
                  </div>
                  <p className="community-desc">
                    Engaging with the local developer ecosystem, attending technical talks on Google Cloud, Android, and web technologies.
                  </p>
                </div>
              </div>

              <div className="community-card glass glow-border tilt-card" onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}>
                <div className="card-glare-wrapper"><div className="card-glare"></div></div>
                <div className="tilt-card-inner">
                  <div className="community-header">
                    <div className="community-icon" style={{ background: 'transparent', border: 'none', borderRadius: 0, width: 'auto', justifyContent: 'flex-start' }}>
                      <img src="/assets/cursor.png" alt="Cursor Ghana" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
                    </div>
                    <div>
                      <h3 className="community-title">Cursor Ghana</h3>
                      <div className="community-role">Active Member</div>
                    </div>
                  </div>
                  <p className="community-desc">
                    A community focused on AI-assisted coding and modern developer tools. Discussing workflows and productivity enhancements.
                  </p>
                </div>
              </div>

              <div className="community-card glass glow-border tilt-card" onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}>
                <div className="card-glare-wrapper"><div className="card-glare"></div></div>
                <div className="tilt-card-inner">
                  <div className="community-header">
                    <div className="community-icon"><img src="/assets/notion.png" alt="Notion" style={{ width: '35px', height: '35px', objectFit: 'contain' }} /></div>
                    <div>
                      <h3 className="community-title">Notion Accra</h3>
                      <div className="community-role">Active Member</div>
                    </div>
                  </div>
                  <p className="community-desc">
                    Collaborating with local productivity enthusiasts, sharing workspace templates, and building advanced Notion systems.
                  </p>
                </div>
              </div>

              <div className="community-card glass glow-border tilt-card" onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}>
                <div className="card-glare-wrapper"><div className="card-glare"></div></div>
                <div className="tilt-card-inner">
                  <div className="community-header">
                    <div className="community-icon"><i className="fa-solid fa-diagram-project" style={{ color: '#ef4444' }}></i></div>
                    <div>
                      <h3 className="community-title">n8n Ghana</h3>
                      <div className="community-role">Active Member</div>
                    </div>
                  </div>
                  <p className="community-desc">
                    Exploring workflow automation and system integrations. Sharing knowledge on building scalable automation pipelines.
                  </p>
                </div>
              </div>

              <div className="community-card glass glow-border tilt-card" onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}>
                <div className="card-glare-wrapper"><div className="card-glare"></div></div>
                <div className="tilt-card-inner">
                  <div className="community-header">
                    <div className="community-icon"><i className="fa-solid fa-brain" style={{ color: '#8b5cf6' }}></i></div>
                    <div>
                      <h3 className="community-title">Global AI Accra</h3>
                      <div className="community-role">Active Member</div>
                    </div>
                  </div>
                  <p className="community-desc">
                    Participating in discussions around artificial intelligence, machine learning, and the future of tech innovation in Africa.
                  </p>
                </div>
              </div>

              <div className="community-card glass glow-border tilt-card" onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}>
                <div className="card-glare-wrapper"><div className="card-glare"></div></div>
                <div className="tilt-card-inner">
                  <div className="community-header">
                    <div className="community-icon"><i className="fa-solid fa-bezier-curve" style={{ color: '#10b981' }}></i></div>
                    <div>
                      <h3 className="community-title">IxDF Accra</h3>
                      <div className="community-role">Active Member</div>
                    </div>
                  </div>
                  <p className="community-desc">
                    Connecting with local UI/UX designers and researchers through the Interaction Design Foundation's local chapter.
                  </p>
                </div>
              </div>

              <div className="community-card glass glow-border tilt-card" onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}>
                <div className="card-glare-wrapper"><div className="card-glare"></div></div>
                <div className="tilt-card-inner">
                  <div className="community-header">
                    <div className="community-icon"><i className="fa-brands fa-ethereum" style={{ color: '#3c3c3d' }}></i></div>
                    <div>
                      <h3 className="community-title">ethAccra</h3>
                      <div className="community-role">Active Member</div>
                    </div>
                  </div>
                  <p className="community-desc">
                    Engaging with the Web3 and blockchain ecosystem in Ghana, discussing decentralized applications and smart contracts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Contact Form Section */}
        <motion.section 
          id="contact" 
          className="section"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <div className="container">
            <h2 className="section-title">Get In <span className="gradient-text">Touch</span></h2>
            <p className="section-subtitle">Have a complex technical problem to solve or an exciting workspace role to fill? Let's discuss details.</p>
            
            <div className="contact-grid">
              <div className="contact-info">
                <div>
                  <h3 className="contact-info-title">Let's build something <span className="gradient-text">extraordinary</span></h3>
                  <p className="contact-info-desc">Feel free to reach out directly through email, schedule an invitation, or connect with my active channels below.</p>
                </div>
                
                <div className="contact-methods">
                  <div className="contact-method-card glass glow-border tilt-card" onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}>
                    <div className="card-glare-wrapper"><div className="card-glare"></div></div>
                    <div className="tilt-card-inner" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', width: '100%' }}>
                      <div className="contact-method-icon tilt-3d-text"><i className="fa-solid fa-envelope"></i></div>
                      <div>
                        <div className="contact-method-title">Direct Email</div>
                        <div className="contact-method-value">Umaryahta566@gmail.com<br/>business.umaryahya566@gmail.com</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="contact-method-card glass glow-border tilt-card" onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}>
                    <div className="card-glare-wrapper"><div className="card-glare"></div></div>
                    <div className="tilt-card-inner" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', width: '100%' }}>
                      <div className="contact-method-icon tilt-3d-text"><i className="fa-solid fa-phone"></i></div>
                      <div>
                        <div className="contact-method-title">Phone Number</div>
                        <div className="contact-method-value">0265390165<br/>0247110992</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="contact-method-card glass glow-border tilt-card" style={{ marginTop: '1rem' }} onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}>
                    <div className="card-glare-wrapper"><div className="card-glare"></div></div>
                    <div className="tilt-card-inner" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', width: '100%' }}>
                      <div className="contact-method-icon tilt-3d-text"><i className="fa-solid fa-location-dot"></i></div>
                      <div>
                        <div className="contact-method-title">Location Base</div>
                        <div className="contact-method-value">MADINA MAYEHOT, GHANA</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="contact-form-box glass glow-border">
                <form className="contact-form" id="contact-form" onSubmit={handleContactSubmit}>
                  <div className="form-group">
                    <label htmlFor="form-name" className="form-label">Full Name</label>
                    <input
                      type="text"
                      id="form-name"
                      className="form-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="form-email" className="form-label">Email Address</label>
                    <input
                      type="email"
                      id="form-email"
                      className="form-input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="form-group full-width">
                    <label htmlFor="form-subject" className="form-label">Subject</label>
                    <input
                      type="text"
                      id="form-subject"
                      className="form-input"
                      placeholder="Partnership Opportunity"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="form-group full-width">
                    <label htmlFor="form-message" className="form-label">Message Details</label>
                    <textarea
                      id="form-message"
                      className="form-input"
                      placeholder="Describe the details of your project context..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                    ></textarea>
                  </div>
                  
                  <button type="submit" className="btn btn-primary contact-btn" id="contact-submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <span>Sending Message...</span> &nbsp; <i className="fa-solid fa-spinner fa-spin"></i>
                      </>
                    ) : (
                      <>
                        <span>Send Message</span> &nbsp; <i className="fa-solid fa-paper-plane"></i>
                      </>
                    )}
                  </button>
                  
                  {formFeedback.type && (
                    <div className={`form-feedback ${formFeedback.type}`}>
                      {formFeedback.text}
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <a href="#hero" className="logo">
              <span className="logo-icon">&lt;</span>UMAR<span className="logo-icon"> YAHYA /&gt;</span>
            </a>
            <div className="footer-socials">
              <a href="https://github.com/Uyahya566" className="footer-social-btn" aria-label="GitHub Profile" target="_blank" rel="noopener noreferrer"><i className="fa-brands fa-github"></i></a>
              <a href="https://www.linkedin.com/in/umar-yahya-9404602a0?utm_source=share_via&utm_content=profile&utm_medium=member_ios" className="footer-social-btn" aria-label="LinkedIn Profile" target="_blank" rel="noopener noreferrer"><i className="fa-brands fa-linkedin-in"></i></a>
              <a href="https://snapchat.com/t/sfP35S6Q" className="footer-social-btn" aria-label="Snapchat Profile" target="_blank" rel="noopener noreferrer"><i className="fa-brands fa-snapchat"></i></a>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>&copy; 2026 UMAR YAHYA. Engineered with React, TypeScript and Node.js.</p>
            <div className="footer-bottom-links">
              <a href="#about">About</a>
              <a href="#projects">Work</a>
              <a href="#contact">Contact</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Back to top button */}
      <div className={`scroll-top-btn ${scrollTopVisible ? 'visible' : ''}`} id="scroll-top" onClick={scrollToTop} aria-label="Scroll back to top">
        <i className="fa-solid fa-arrow-up"></i>
      </div>
    </div>
  );
}

export default function SafeApp() {
  return (
    <ErrorBoundary>
      <App />
      <Analytics />
    </ErrorBoundary>
  );
}

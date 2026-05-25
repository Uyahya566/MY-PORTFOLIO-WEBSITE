import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for our frontend client
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Automated telemetry endpoint to capture frontend browser errors
app.post('/api/log', (req, res) => {
  const fs = require('fs');
  fs.appendFileSync('browser_logs.txt', new Date().toISOString() + ' | ERROR LOG: ' + JSON.stringify(req.body) + '\n');
  res.json({ success: true });
});

// Strongly typed interfaces
export interface Project {
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

export interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// In-memory Project Database
const PROJECTS: Project[] = [
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

// Root health check endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    status: "online",
    service: "Tech Portfolio Backend API",
    version: "1.2.0"
  });
});

// Projects API Endpoint
app.get('/api/projects', (req: Request, res: Response) => {
  res.json(PROJECTS);
});

// Contact Dispatch Endpoint
app.post('/api/contact', (req: Request, res: Response) => {
  const { name, email, subject, message } = req.body as ContactPayload;

  // Severe validation protocols
  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      error: "All fields are required. Please input correct parameters."
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: "Please provide a valid email address configuration."
    });
  }

  // Visualizing server-side log actions (Node.js processing)
  console.log(`[Mail Server Dispatch] Recipient: ${name} <${email}>`);
  console.log(`[Mail Subject] ${subject}`);
  console.log(`[Mail Body Content] ${message}`);

  // Mock server dispatch success response
  res.json({
    success: true,
    message: "Message dispatched successfully! I will reach out shortly."
  });
});

// Launch server instance
app.listen(PORT, () => {
  console.log(`⚡[server]: Server is running at http://localhost:${PORT}`);
});

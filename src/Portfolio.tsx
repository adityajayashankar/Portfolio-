import React, { useState, useEffect, MouseEvent, useCallback, useRef, ReactNode } from 'react';
import { 
  Github, 
  Linkedin, 
  Mail, 
  ExternalLink, 
  ArrowUp,
  Terminal, 
  Database, 
  Layout, 
  Cpu, 
  Code2,
  Menu,
  X
} from 'lucide-react';
import { motion, useMotionValue, useAnimationFrame, useTransform, useAnimation } from 'framer-motion';
import * as THREE from 'three';

// --- TYPES & INTERFACES ---
interface Experience {
  id: number;
  role: string;
  company: string;
  period: string;
  description: string[];
  technologies: string[];
}

interface Project {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  technologies: string[];
  githubUrl?: string;
  liveUrl?: string;
}

interface SkillGroup {
  category: string;
  icon: React.ElementType;
  skills: string[];
}

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  colors?: string[];
  animationSpeed?: number;
  showBorder?: boolean;
  direction?: 'horizontal' | 'vertical' | 'diagonal';
  pauseOnHover?: boolean;
  yoyo?: boolean;
}

interface GlitchTextProps {
  children: string;
  speed?: number;
  enableShadows?: boolean;
  enableOnHover?: boolean;
  className?: string;
}

interface CircularTextProps {
  text: string;
  spinDuration?: number;
  onHover?: 'slowDown' | 'speedUp' | 'pause' | 'goBonkers';
  className?: string;
}

export type RaysOrigin =
  | 'top-center'
  | 'top-left'
  | 'top-right'
  | 'right'
  | 'left'
  | 'bottom-center'
  | 'bottom-right'
  | 'bottom-left';

interface LightRaysProps {
  raysOrigin?: RaysOrigin;
  raysColor?: string;
  raysSpeed?: number;
  lightSpread?: number;
  rayLength?: number;
  pulsating?: boolean;
  fadeDistance?: number;
  saturation?: number;
  followMouse?: boolean;
  mouseInfluence?: number;
  noiseAmount?: number;
  distortion?: number;
  className?: string;
}

interface BorderGlowProps {
  children?: ReactNode;
  className?: string;
  edgeSensitivity?: number;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  animated?: boolean;
  colors?: string[];
  fillOpacity?: number;
}

// --- UTILS FOR BORDER GLOW & LIGHT RAYS ---
function parseHSL(hslStr: string): { h: number; s: number; l: number } {
  const match = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  if (!match) return { h: 40, s: 80, l: 80 };
  return { h: parseFloat(match[1]), s: parseFloat(match[2]), l: parseFloat(match[3]) };
}

function buildBoxShadow(glowColor: string, intensity: number): string {
  const { h, s, l } = parseHSL(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const layers: [number, number, number, number, number, boolean][] = [
    [0, 0, 0, 1, 100, true], [0, 0, 1, 0, 60, true], [0, 0, 3, 0, 50, true],
    [0, 0, 6, 0, 40, true], [0, 0, 15, 0, 30, true], [0, 0, 25, 2, 20, true],
    [0, 0, 50, 2, 10, true],
    [0, 0, 1, 0, 60, false], [0, 0, 3, 0, 50, false], [0, 0, 6, 0, 40, false],
    [0, 0, 15, 0, 30, false], [0, 0, 25, 2, 20, false], [0, 0, 50, 2, 10, false],
  ];
  return layers.map(([x, y, blur, spread, alpha, inset]) => {
    const a = Math.min(alpha * intensity, 100);
    return `${inset ? 'inset ' : ''}${x}px ${y}px ${blur}px ${spread}px hsl(${base} / ${a}%)`;
  }).join(', ');
}

function easeOutCubic(x: number) { return 1 - Math.pow(1 - x, 3); }
function easeInCubic(x: number) { return x * x * x; }

interface AnimateOpts {
  start?: number; end?: number; duration?: number; delay?: number;
  ease?: (t: number) => number; onUpdate: (v: number) => void; onEnd?: () => void;
}

function animateValue({ start = 0, end = 100, duration = 1000, delay = 0, ease = easeOutCubic, onUpdate, onEnd }: AnimateOpts) {
  const t0 = performance.now() + delay;
  function tick() {
    const elapsed = performance.now() - t0;
    const t = Math.min(elapsed / duration, 1);
    onUpdate(start + (end - start) * ease(t));
    if (t < 1) requestAnimationFrame(tick);
    else if (onEnd) onEnd();
  }
  setTimeout(() => requestAnimationFrame(tick), delay);
}

const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

function buildMeshGradients(colors: string[]): string[] {
  const gradients: string[] = [];
  for (let i = 0; i < 7; i++) {
    const c = colors[Math.min(COLOR_MAP[i], colors.length - 1)];
    gradients.push(`radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${c} 0px, transparent 50%)`);
  }
  gradients.push(`linear-gradient(${colors[0]} 0 100%)`);
  return gradients;
}

const DEFAULT_COLOR = '#ffffff';

const hexToRgbLR = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
};

const getAnchorAndDir = (
  origin: RaysOrigin,
  w: number,
  h: number
): { anchor: [number, number]; dir: [number, number] } => {
  const outside = 0.2;
  switch (origin) {
    case 'top-left':
      return { anchor: [0, -outside * h], dir: [0, 1] };
    case 'top-right':
      return { anchor: [w, -outside * h], dir: [0, 1] };
    case 'left':
      return { anchor: [-outside * w, 0.5 * h], dir: [1, 0] };
    case 'right':
      return { anchor: [(1 + outside) * w, 0.5 * h], dir: [-1, 0] };
    case 'bottom-left':
      return { anchor: [0, (1 + outside) * h], dir: [0, -1] };
    case 'bottom-center':
      return { anchor: [0.5 * w, (1 + outside) * h], dir: [0, -1] };
    case 'bottom-right':
      return { anchor: [w, (1 + outside) * h], dir: [0, -1] };
    default: // "top-center"
      return { anchor: [0.5 * w, -outside * h], dir: [0, 1] };
  }
};

interface UniformsLR {
  [uniform: string]: THREE.IUniform;
  iTime: { value: number };
  iResolution: { value: THREE.Vector2 };
  rayPos: { value: THREE.Vector2 };
  rayDir: { value: THREE.Vector2 };
  raysColor: { value: THREE.Vector3 };
  raysSpeed: { value: number };
  lightSpread: { value: number };
  rayLength: { value: number };
  pulsating: { value: number };
  fadeDistance: { value: number };
  saturation: { value: number };
  mousePos: { value: THREE.Vector2 };
  mouseInfluence: { value: number };
  noiseAmount: { value: number };
  distortion: { value: number };
}

// --- DATA ---
const PERSONAL_INFO = {
  name: "Aditya Jayashankar",
  role: "AI & Software Engineer",
  tagline: "Architecting autonomous LLM agents, intelligent cloud infrastructure, and applied ML systems.",
  email: "adityajayashankar@gmail.com",
  github: "https://github.com/adityajayashankar",
  linkedin: "https://www.linkedin.com/in/aditya-jayashankar-9790b7272/",
};

const EXPERIENCES: Experience[] = [
  {
    id: 1,
    role: "Product Development Intern",
    company: "PESU Venture Labs",
    period: "Jan 2026 - Present",
    description: [
      "DEPLAI: AI-powered DevOps orchestration platform for intelligent cloud deployments.",
      "Built multi-agent backend systems and automated infrastructure with Terraform workflows.",
      "Integrated repository analysis within a cross-functional agile team."
    ],
    technologies: ["Terraform", "Docker", "TypeScript", "LangGraph", "React"]
  },
  {
    id: 2,
    role: "B.Tech Electronics & Communication",
    company: "PES University",
    period: "2022 - 2026",
    description: [
      "CGPA: 7.7. Awarded merit-based scholarship for academic excellence in Semesters 5 & 6.",
      "Mentored 500+ sophomore students in Machine Learning through the Bootstrap program.",
      "Participated in multiple hackathons delivering AI/ML and full-stack solutions."
    ],
    technologies: ["Python", "C/C++", "Machine Learning", "Mathematics"]
  },
  {
    id: 3,
    role: "Higher Secondary (PCMC)",
    company: "ASC PU College",
    period: "2020 - 2022",
    description: [
      "Graduated with 92% in Physics, Chemistry, Mathematics, and Computer Science."
    ],
    technologies: ["Computer Science", "Mathematics", "Physics"]
  },
  {
    id: 4,
    role: "ICSE",
    company: "VLS International",
    period: "2008 - 2020",
    description: [
      "Graduated with 89%."
    ],
    technologies: []
  }
];

const PROJECTS: Project[] = [
  {
    id: 1,
    title: "Deplai - DevSecOps Platform",
    description: "An end-to-end multi-agent DevOps platform that ingests code repositories, performs architecture and dependency analysis, and auto-generates cloud deployment plans. Implemented Terraform-driven workflows with Dockerized pipelines.",
    imageUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop&sat=-100", 
    technologies: ["TypeScript", "React", "SQL", "LangGraph", "Claude SDK", "Terraform"],
    githubUrl: "https://github.com/adityajayashankar/Deplai",
  },
  {
    id: 2,
    title: "CortexKG - Agentic Knowledge Graph",
    description: "Built a cybersecurity intelligence system combining Neo4j graph traversal (7M edges) with vector search for multi-hop CVE reasoning.",
    imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop&sat=-100", 
    technologies: ["Python", "LangGraph", "Neo4j", "Vector DB", "Groq API"],
    githubUrl: "https://github.com/adityajayashankar/CortexKG-Agent",
  },
  {
    id: 3,
    title: "Agentic Web2 Security Auditor",
    description: "Developed an AI-driven security auditing system performing SAST, DAST, dependency, and configuration scans.",
    imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop&sat=-100", 
    technologies: ["Python", "LangGraph"],
    githubUrl: "https://github.com/adityajayashankar/AI-driven-Web2-Security-Auditor",
  },
  {
    id: 4,
    title: "Medical Chatbot",
    description: "Built an AI chatbot delivering real-time healthcare responses with 90%+ relevance.",
    imageUrl: "https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&q=60&w=3000", 
    technologies: ["Python", "Pinecone", "GitHub Actions", "TypeScript"],
    githubUrl: "https://github.com/adityajayashankar/Med_Chatbot",
  }
];

const SKILL_GROUPS: SkillGroup[] = [
  {
    category: "AI / ML / DL",
    icon: Cpu,
    skills: ["PyTorch", "Transformers", "Generative AI", "LLM Agents", "RAG", "RRF", "NLP", "Computer Vision"]
  },
  {
    category: "Languages",
    icon: Code2,
    skills: ["Python", "Java", "C/C++", "JavaScript", "TypeScript", "SQL", "HTML/CSS"]
  },
  {
    category: "Frameworks",
    icon: Layout,
    skills: ["FastAPI", "React.js", "Next.js", "Node.js", "LangChain", "LangGraph"]
  },
  {
    category: "Cloud & Databases",
    icon: Database,
    skills: ["Docker", "Kubernetes", "AWS", "Terraform", "PostgreSQL", "Pinecone", "Qdrant"]
  }
];

const NAV_LINKS = [
  { name: 'About', id: 'about' },
  { name: 'Journey', id: 'journey' },
  { name: 'Works', id: 'projects' },
] as const;

const TRACKED_SECTION_IDS = ['home', ...NAV_LINKS.map(link => link.id)] as const;

// --- FEATURE COMPONENTS ---

const LightRays: React.FC<LightRaysProps> = ({
  raysOrigin = 'top-center',
  raysColor = DEFAULT_COLOR,
  raysSpeed = 1,
  lightSpread = 1,
  rayLength = 2,
  pulsating = false,
  fadeDistance = 1.0,
  saturation = 1.0,
  followMouse = true,
  mouseInfluence = 0.1,
  noiseAmount = 0.0,
  distortion = 0.0,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<UniformsLR | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const smoothMouseRef = useRef({ x: 0.5, y: 0.5 });
  const animationIdRef = useRef<number | null>(null);
  const cleanupFunctionRef = useRef<(() => void) | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(containerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible || !containerRef.current) return;

    if (cleanupFunctionRef.current) {
      cleanupFunctionRef.current();
      cleanupFunctionRef.current = null;
    }

    const initializeWebGL = async () => {
      if (!containerRef.current) return;

      await new Promise(resolve => setTimeout(resolve, 10));

      if (!containerRef.current) return;

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance'
      });
      rendererRef.current = renderer;

      const canvas = renderer.domElement;
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      containerRef.current.appendChild(canvas);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));

      const vert = `
precision highp float;
attribute vec3 position;
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position, 1.0);
}`;

      const frag = `precision highp float;

uniform float iTime;
uniform vec2  iResolution;

uniform vec2  rayPos;
uniform vec2  rayDir;
uniform vec3  raysColor;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float pulsating;
uniform float fadeDistance;
uniform float saturation;
uniform vec2  mousePos;
uniform float mouseInfluence;
uniform float noiseAmount;
uniform float distortion;

varying vec2 vUv;

float noise(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord,
                  float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  vec2 dirNorm = normalize(sourceToCoord);
  float cosAngle = dot(dirNorm, rayRefDirection);

  float distortedAngle = cosAngle + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;
  
  float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));

  float distance = length(sourceToCoord);
  float maxDistance = iResolution.x * rayLength;
  float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);
  
  float fadeFalloff = clamp((iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance), 0.5, 1.0);
  float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;

  float baseStrength = clamp(
    (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
    0.0, 1.0
  );

  return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
  
  vec2 finalRayDir = rayDir;
  if (mouseInfluence > 0.0) {
    vec2 mouseScreenPos = mousePos * iResolution.xy;
    vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
    finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
  }

  vec4 rays1 = vec4(1.0) *
               rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349,
                           1.5 * raysSpeed);
  vec4 rays2 = vec4(1.0) *
               rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234,
                           1.1 * raysSpeed);

  fragColor = rays1 * 0.5 + rays2 * 0.4;

  if (noiseAmount > 0.0) {
    float n = noise(coord * 0.01 + iTime * 0.1);
    fragColor.rgb *= (1.0 - noiseAmount + noiseAmount * n);
  }

  float brightness = 1.0 - (coord.y / iResolution.y);
  fragColor.x *= 0.1 + brightness * 0.8;
  fragColor.y *= 0.3 + brightness * 0.6;
  fragColor.z *= 0.5 + brightness * 0.5;

  if (saturation != 1.0) {
    float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
    fragColor.rgb = mix(vec3(gray), fragColor.rgb, saturation);
  }

  fragColor.rgb *= raysColor;
}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor  = color;
}`;

      const initColor = hexToRgbLR(raysColor);
      const uniforms: UniformsLR = {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(1, 1) },

        rayPos: { value: new THREE.Vector2(0, 0) },
        rayDir: { value: new THREE.Vector2(0, 1) },

        raysColor: { value: new THREE.Vector3(initColor[0], initColor[1], initColor[2]) },
        raysSpeed: { value: raysSpeed },
        lightSpread: { value: lightSpread },
        rayLength: { value: rayLength },
        pulsating: { value: pulsating ? 1.0 : 0.0 },
        fadeDistance: { value: fadeDistance },
        saturation: { value: saturation },
        mousePos: { value: new THREE.Vector2(0.5, 0.5) },
        mouseInfluence: { value: mouseInfluence },
        noiseAmount: { value: noiseAmount },
        distortion: { value: distortion }
      };
      uniformsRef.current = uniforms;

      const material = new THREE.RawShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms,
        transparent: true,
        blending: THREE.NormalBlending,
        depthTest: false,
        depthWrite: false
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      scene.add(mesh);

      const updatePlacement = () => {
        if (!containerRef.current || !renderer) return;

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const wCSS = containerRef.current.clientWidth;
        const hCSS = containerRef.current.clientHeight;
        renderer.setSize(wCSS, hCSS, false);

        const dpr = renderer.getPixelRatio();
        const w = wCSS * dpr;
        const h = hCSS * dpr;

        uniforms.iResolution.value.set(w, h);

        const { anchor, dir } = getAnchorAndDir(raysOrigin, w, h);
        uniforms.rayPos.value.set(anchor[0], anchor[1]);
        uniforms.rayDir.value.set(dir[0], dir[1]);
      };

      const loop = (t: number) => {
        if (!rendererRef.current || !uniformsRef.current) {
          return;
        }

        uniforms.iTime.value = t * 0.001;

        if (followMouse && mouseInfluence > 0.0) {
          const smoothing = 0.92;

          smoothMouseRef.current.x = smoothMouseRef.current.x * smoothing + mouseRef.current.x * (1 - smoothing);
          smoothMouseRef.current.y = smoothMouseRef.current.y * smoothing + mouseRef.current.y * (1 - smoothing);

          uniforms.mousePos.value.set(smoothMouseRef.current.x, smoothMouseRef.current.y);
        }

        try {
          renderer.render(scene, camera);
          animationIdRef.current = requestAnimationFrame(loop);
        } catch (error) {
          console.warn('WebGL rendering error:', error);
          return;
        }
      };

      window.addEventListener('resize', updatePlacement);
      updatePlacement();
      animationIdRef.current = requestAnimationFrame(loop);

      cleanupFunctionRef.current = () => {
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
          animationIdRef.current = null;
        }

        window.removeEventListener('resize', updatePlacement);

        if (renderer) {
          try {
            renderer.dispose();
            renderer.forceContextLoss();
            const canvasElem = renderer.domElement;
            if (canvasElem && canvasElem.parentNode) {
              canvasElem.parentNode.removeChild(canvasElem);
            }
          } catch (error) {
            console.warn('Error during WebGL cleanup:', error);
          }
        }

        rendererRef.current = null;
        uniformsRef.current = null;
      };
    };

    initializeWebGL();

    return () => {
      if (cleanupFunctionRef.current) {
        cleanupFunctionRef.current();
        cleanupFunctionRef.current = null;
      }
    };
  }, [
    isVisible,
    raysOrigin,
    raysColor,
    raysSpeed,
    lightSpread,
    rayLength,
    pulsating,
    fadeDistance,
    saturation,
    followMouse,
    mouseInfluence,
    noiseAmount,
    distortion
  ]);

  useEffect(() => {
    if (!uniformsRef.current || !containerRef.current || !rendererRef.current) return;

    const u = uniformsRef.current;
    const renderer = rendererRef.current;

    const rgb = hexToRgbLR(raysColor);
    u.raysColor.value.set(rgb[0], rgb[1], rgb[2]);
    u.raysSpeed.value = raysSpeed;
    u.lightSpread.value = lightSpread;
    u.rayLength.value = rayLength;
    u.pulsating.value = pulsating ? 1.0 : 0.0;
    u.fadeDistance.value = fadeDistance;
    u.saturation.value = saturation;
    u.mouseInfluence.value = mouseInfluence;
    u.noiseAmount.value = noiseAmount;
    u.distortion.value = distortion;

    const wCSS = containerRef.current.clientWidth;
    const hCSS = containerRef.current.clientHeight;
    const dpr = renderer.getPixelRatio();
    const { anchor, dir } = getAnchorAndDir(raysOrigin, wCSS * dpr, hCSS * dpr);
    u.rayPos.value.set(anchor[0], anchor[1]);
    u.rayDir.value.set(dir[0], dir[1]);
  }, [
    raysColor,
    raysSpeed,
    lightSpread,
    raysOrigin,
    rayLength,
    pulsating,
    fadeDistance,
    saturation,
    mouseInfluence,
    noiseAmount,
    distortion
  ]);

  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!containerRef.current || !rendererRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      mouseRef.current = { x, y };
    };

    if (followMouse) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [followMouse]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full pointer-events-none z-[3] overflow-hidden relative ${className}`.trim()}
    />
  );
};

const BorderGlow: React.FC<BorderGlowProps> = ({
  children,
  className = '',
  edgeSensitivity = 30,
  glowColor = '40 80 80',
  backgroundColor = '#060010',
  borderRadius = 28,
  glowRadius = 40,
  glowIntensity = 1.0,
  coneSpread = 25,
  animated = false,
  colors = ['#c084fc', '#f472b6', '#38bdf8'],
  fillOpacity = 0.5,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [cursorAngle, setCursorAngle] = useState(45);
  const [edgeProximity, setEdgeProximity] = useState(0);
  const [sweepActive, setSweepActive] = useState(false);

  const getCenterOfElement = useCallback((el: HTMLElement) => {
    const { width, height } = el.getBoundingClientRect();
    return [width / 2, height / 2];
  }, []);

  const getEdgeProximity = useCallback((el: HTMLElement, x: number, y: number) => {
    const [cx, cy] = getCenterOfElement(el);
    const dx = x - cx;
    const dy = y - cy;
    let kx = Infinity;
    let ky = Infinity;
    if (dx !== 0) kx = cx / Math.abs(dx);
    if (dy !== 0) ky = cy / Math.abs(dy);
    return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
  }, [getCenterOfElement]);

  const getCursorAngle = useCallback((el: HTMLElement, x: number, y: number) => {
    const [cx, cy] = getCenterOfElement(el);
    const dx = x - cx;
    const dy = y - cy;
    if (dx === 0 && dy === 0) return 0;
    const radians = Math.atan2(dy, dx);
    let degrees = radians * (180 / Math.PI) + 90;
    if (degrees < 0) degrees += 360;
    return degrees;
  }, [getCenterOfElement]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setEdgeProximity(getEdgeProximity(card, x, y));
    setCursorAngle(getCursorAngle(card, x, y));
  }, [getEdgeProximity, getCursorAngle]);

  useEffect(() => {
    if (!animated) return;
    const angleStart = 110;
    const angleEnd = 465;
    setSweepActive(true);
    setCursorAngle(angleStart);

    animateValue({ duration: 500, onUpdate: v => setEdgeProximity(v / 100) });
    animateValue({ ease: easeInCubic, duration: 1500, end: 50, onUpdate: v => {
      setCursorAngle((angleEnd - angleStart) * (v / 100) + angleStart);
    }});
    animateValue({ ease: easeOutCubic, delay: 1500, duration: 2250, start: 50, end: 100, onUpdate: v => {
      setCursorAngle((angleEnd - angleStart) * (v / 100) + angleStart);
    }});
    animateValue({ ease: easeInCubic, delay: 2500, duration: 1500, start: 100, end: 0,
      onUpdate: v => setEdgeProximity(v / 100),
      onEnd: () => setSweepActive(false),
    });
  }, [animated]);

  const colorSensitivity = edgeSensitivity + 20;
  const isVisible = isHovered || sweepActive;
  const borderOpacity = isVisible
    ? Math.max(0, (edgeProximity * 100 - colorSensitivity) / (100 - colorSensitivity))
    : 0;
  const glowOpacity = isVisible
    ? Math.max(0, (edgeProximity * 100 - edgeSensitivity) / (100 - edgeSensitivity))
    : 0;

  const meshGradients = buildMeshGradients(colors);
  const borderBg = meshGradients.map(g => `${g} border-box`);
  const fillBg = meshGradients.map(g => `${g} padding-box`);
  const angleDeg = `${cursorAngle.toFixed(3)}deg`;

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      className={`relative grid isolate border border-white/15 ${className}`}
      style={{
        background: backgroundColor,
        borderRadius: `${borderRadius}px`,
        transform: 'translate3d(0, 0, 0.01px)',
        boxShadow: 'rgba(0,0,0,0.1) 0 1px 2px, rgba(0,0,0,0.1) 0 2px 4px, rgba(0,0,0,0.1) 0 4px 8px, rgba(0,0,0,0.1) 0 8px 16px, rgba(0,0,0,0.1) 0 16px 32px, rgba(0,0,0,0.1) 0 32px 64px',
      }}
    >
      {/* mesh gradient border */}
      <div
        className="absolute inset-0 rounded-[inherit] -z-[1]"
        style={{
          border: '1px solid transparent',
          background: [
            `linear-gradient(${backgroundColor} 0 100%) padding-box`,
            'linear-gradient(rgb(255 255 255 / 0%) 0% 100%) border-box',
            ...borderBg,
          ].join(', '),
          opacity: borderOpacity,
          maskImage: `conic-gradient(from ${angleDeg} at center, black ${coneSpread}%, transparent ${coneSpread + 15}%, transparent ${100 - coneSpread - 15}%, black ${100 - coneSpread}%)`,
          WebkitMaskImage: `conic-gradient(from ${angleDeg} at center, black ${coneSpread}%, transparent ${coneSpread + 15}%, transparent ${100 - coneSpread - 15}%, black ${100 - coneSpread}%)`,
          transition: isVisible ? 'opacity 0.25s ease-out' : 'opacity 0.75s ease-in-out',
        }}
      />

      {/* mesh gradient fill near edges */}
      <div
        className="absolute inset-0 rounded-[inherit] -z-[1]"
        style={{
          border: '1px solid transparent',
          background: fillBg.join(', '),
          maskImage: [
            'linear-gradient(to bottom, black, black)',
            'radial-gradient(ellipse at 50% 50%, black 40%, transparent 65%)',
            'radial-gradient(ellipse at 66% 66%, black 5%, transparent 40%)',
            'radial-gradient(ellipse at 33% 33%, black 5%, transparent 40%)',
            'radial-gradient(ellipse at 66% 33%, black 5%, transparent 40%)',
            'radial-gradient(ellipse at 33% 66%, black 5%, transparent 40%)',
            `conic-gradient(from ${angleDeg} at center, transparent 5%, black 15%, black 85%, transparent 95%)`,
          ].join(', '),
          WebkitMaskImage: [
            'linear-gradient(to bottom, black, black)',
            'radial-gradient(ellipse at 50% 50%, black 40%, transparent 65%)',
            'radial-gradient(ellipse at 66% 66%, black 5%, transparent 40%)',
            'radial-gradient(ellipse at 33% 33%, black 5%, transparent 40%)',
            'radial-gradient(ellipse at 66% 33%, black 5%, transparent 40%)',
            'radial-gradient(ellipse at 33% 66%, black 5%, transparent 40%)',
            `conic-gradient(from ${angleDeg} at center, transparent 5%, black 15%, black 85%, transparent 95%)`,
          ].join(', '),
          maskComposite: 'subtract, add, add, add, add, add',
          WebkitMaskComposite: 'source-out, source-over, source-over, source-over, source-over, source-over',
          opacity: borderOpacity * fillOpacity,
          mixBlendMode: 'soft-light',
          transition: isVisible ? 'opacity 0.25s ease-out' : 'opacity 0.75s ease-in-out',
        } as React.CSSProperties}
      />

      {/* outer glow */}
      <span
        className="absolute pointer-events-none z-[1] rounded-[inherit]"
        style={{
          inset: `${-glowRadius}px`,
          maskImage: `conic-gradient(from ${angleDeg} at center, black 2.5%, transparent 10%, transparent 90%, black 97.5%)`,
          WebkitMaskImage: `conic-gradient(from ${angleDeg} at center, black 2.5%, transparent 10%, transparent 90%, black 97.5%)`,
          opacity: glowOpacity,
          mixBlendMode: 'plus-lighter',
          transition: isVisible ? 'opacity 0.25s ease-out' : 'opacity 0.75s ease-in-out',
        } as React.CSSProperties}
      >
        <span
          className="absolute rounded-[inherit]"
          style={{
            inset: `${glowRadius}px`,
            boxShadow: buildBoxShadow(glowColor, glowIntensity),
          }}
        />
      </span>

      <div className="flex flex-col relative overflow-auto z-[1] w-full h-full">
        {children}
      </div>
    </div>
  );
};


export function GradientText({
  children,
  className = '',
  colors = ['#5227FF', '#FF9FFC', '#B19EEF'],
  animationSpeed = 8,
  showBorder = false,
  direction = 'horizontal',
  pauseOnHover = false,
  yoyo = true
}: GradientTextProps) {
  const [isPaused, setIsPaused] = useState(false);
  const progress = useMotionValue(0);
  const elapsedRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);

  const animationDuration = animationSpeed * 1000;

  useAnimationFrame(time => {
    if (isPaused) {
      lastTimeRef.current = null;
      return;
    }

    if (lastTimeRef.current === null) {
      lastTimeRef.current = time;
      return;
    }

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;
    elapsedRef.current += deltaTime;

    if (yoyo) {
      const fullCycle = animationDuration * 2;
      const cycleTime = elapsedRef.current % fullCycle;

      if (cycleTime < animationDuration) {
        progress.set((cycleTime / animationDuration) * 100);
      } else {
        progress.set(100 - ((cycleTime - animationDuration) / animationDuration) * 100);
      }
    } else {
      progress.set((elapsedRef.current / animationDuration) * 100);
    }
  });

  useEffect(() => {
    elapsedRef.current = 0;
    progress.set(0);
  }, [animationSpeed, yoyo]);

  const backgroundPosition = useTransform(progress, p => {
    if (direction === 'horizontal') {
      return `${p}% 50%`;
    } else if (direction === 'vertical') {
      return `50% ${p}%`;
    } else {
      return `${p}% 50%`;
    }
  });

  const handleMouseEnter = useCallback(() => {
    if (pauseOnHover) setIsPaused(true);
  }, [pauseOnHover]);

  const handleMouseLeave = useCallback(() => {
    if (pauseOnHover) setIsPaused(false);
  }, [pauseOnHover]);

  const gradientAngle =
    direction === 'horizontal' ? 'to right' : direction === 'vertical' ? 'to bottom' : 'to bottom right';
  const gradientColors = [...colors, colors[0]].join(', ');

  const gradientStyle = {
    backgroundImage: `linear-gradient(${gradientAngle}, ${gradientColors})`,
    backgroundSize: direction === 'horizontal' ? '300% 100%' : direction === 'vertical' ? '100% 300%' : '300% 300%',
    backgroundRepeat: 'repeat'
  };

  return (
    <motion.div
      className={`relative flex max-w-fit flex-row items-center justify-center font-medium backdrop-blur transition-shadow duration-500 overflow-hidden cursor-pointer ${showBorder ? 'py-1 px-2 rounded-[1.25rem]' : ''} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {showBorder && (
        <motion.div
          className="absolute inset-0 z-0 pointer-events-none rounded-[1.25rem]"
          style={{ ...gradientStyle, backgroundPosition }}
        >
          <div
            className="absolute bg-black rounded-[1.25rem] z-[-1]"
            style={{
              width: 'calc(100% - 2px)',
              height: 'calc(100% - 2px)',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          />
        </motion.div>
      )}
      <motion.div
        className="inline-block relative z-2 text-transparent bg-clip-text"
        style={{ ...gradientStyle, backgroundPosition, WebkitBackgroundClip: 'text' }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export const GlitchText: React.FC<GlitchTextProps> = ({
  children,
  speed = 0.5,
  enableShadows = true,
  enableOnHover = false,
  className = ''
}) => {
  const [isGlitching, setIsGlitching] = useState(true);

  useEffect(() => {
    if (!enableOnHover) {
      const timer = setTimeout(() => setIsGlitching(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [enableOnHover]);

  const activeGlitch = enableOnHover || isGlitching;

  const inlineStyles = {
    '--after-duration': `${speed * 3}s`,
    '--before-duration': `${speed * 2}s`,
    '--after-shadow': enableShadows && activeGlitch ? '-3px 0 rgba(255,255,255,0.7)' : 'none',
    '--before-shadow': enableShadows && activeGlitch ? '3px 0 rgba(150,150,150,0.7)' : 'none'
  } as React.CSSProperties;

  const combinedClasses = `glitch-wrapper ${enableOnHover ? 'glitch-hover-only' : ''} ${!activeGlitch ? 'glitch-stop' : ''} ${className}`;

  return (
    <div style={inlineStyles} data-text={children} className={combinedClasses}>
      {children}
    </div>
  );
};

const getRotationTransition = (duration: number, from: number, loop: boolean = true) => ({
  from,
  to: from + 360,
  ease: 'linear' as const,
  duration,
  type: 'tween' as const,
  repeat: loop ? Infinity : 0
});

const getTransition = (duration: number, from: number) => ({
  rotate: getRotationTransition(duration, from),
  scale: {
    type: 'spring' as const,
    damping: 20,
    stiffness: 300
  }
});

export const CircularText: React.FC<CircularTextProps> = ({
  text,
  spinDuration = 20,
  onHover = 'speedUp',
  className = ''
}) => {
  const letters = Array.from(text);
  const controls = useAnimation();
  const rotation = useMotionValue(0);

  useEffect(() => {
    const start = rotation.get();
    controls.start({
      rotate: start + 360,
      scale: 1,
      transition: getTransition(spinDuration, start) as any
    });
  }, [spinDuration, text, onHover, controls]);

  const handleHoverStart = () => {
    const start = rotation.get();

    if (!onHover) return;

    let transitionConfig: any;
    let scaleVal = 1;

    switch (onHover) {
      case 'slowDown':
        transitionConfig = getTransition(spinDuration * 2, start);
        break;
      case 'speedUp':
        transitionConfig = getTransition(spinDuration / 4, start);
        break;
      case 'pause':
        transitionConfig = {
          rotate: { type: 'spring', damping: 20, stiffness: 300 },
          scale: { type: 'spring', damping: 20, stiffness: 300 }
        };
        break;
      case 'goBonkers':
        transitionConfig = getTransition(spinDuration / 20, start);
        scaleVal = 0.8;
        break;
      default:
        transitionConfig = getTransition(spinDuration, start);
    }

    controls.start({
      rotate: start + 360,
      scale: scaleVal,
      transition: transitionConfig
    });
  };

  const handleHoverEnd = () => {
    const start = rotation.get();
    controls.start({
      rotate: start + 360,
      scale: 1,
      transition: getTransition(spinDuration, start) as any
    });
  };

  return (
    <motion.div
      className={`m-0 mx-auto rounded-full w-[160px] h-[160px] relative font-mono text-xs tracking-widest uppercase text-neutral-400 text-center cursor-pointer origin-center ${className}`}
      style={{ rotate: rotation }}
      initial={{ rotate: 0 }}
      animate={controls}
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
    >
      {letters.map((letter, i) => {
        const rotationDeg = (360 / letters.length) * i;
        const transform = `translate(-50%, -50%) rotateZ(${rotationDeg}deg) translate3d(0, -80px, 0)`;

        return (
          <span
            key={i}
            className="absolute left-[50%] top-[50%] inline-block transition-all duration-500 ease-[cubic-bezier(0,0,0,1)]"
            style={{ transform, WebkitTransform: transform }}
          >
            {letter}
          </span>
        );
      })}
    </motion.div>
  );
};

class Pixel {
  width: number;
  height: number;
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  color: string;
  speed: number;
  size: number;
  sizeStep: number;
  minSize: number;
  maxSizeInteger: number;
  maxSize: number;
  delay: number;
  counter: number;
  counterStep: number;
  isIdle: boolean;
  isReverse: boolean;
  isShimmer: boolean;

  constructor(
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    speed: number,
    delay: number
  ) {
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx = context;
    this.x = x;
    this.y = y;
    this.color = color;
    this.speed = this.getRandomValue(0.1, 0.9) * speed;
    this.size = 0;
    this.sizeStep = Math.random() * 0.4;
    this.minSize = 0.5;
    this.maxSizeInteger = 2;
    this.maxSize = this.getRandomValue(this.minSize, this.maxSizeInteger);
    this.delay = delay;
    this.counter = 0;
    this.counterStep = Math.random() * 4 + (this.width + this.height) * 0.01;
    this.isIdle = false;
    this.isReverse = false;
    this.isShimmer = false;
  }

  getRandomValue(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  draw() {
    const centerOffset = this.maxSizeInteger * 0.5 - this.size * 0.5;
    this.ctx.fillStyle = this.color;
    this.ctx.fillRect(this.x + centerOffset, this.y + centerOffset, this.size, this.size);
  }

  appear() {
    this.isIdle = false;
    if (this.counter <= this.delay) {
      this.counter += this.counterStep;
      return;
    }
    if (this.size >= this.maxSize) {
      this.isShimmer = true;
    }
    if (this.isShimmer) {
      this.shimmer();
    } else {
      this.size += this.sizeStep;
    }
    this.draw();
  }

  disappear() {
    this.isShimmer = false;
    this.counter = 0;
    if (this.size <= 0) {
      this.isIdle = true;
      return;
    } else {
      this.size -= 0.1;
    }
    this.draw();
  }

  shimmer() {
    if (this.size >= this.maxSize) {
      this.isReverse = true;
    } else if (this.size <= this.minSize) {
      this.isReverse = false;
    }
    if (this.isReverse) {
      this.size -= this.speed;
    } else {
      this.size += this.speed;
    }
  }
}

function getEffectiveSpeed(value: number, reducedMotion: boolean) {
  const min = 0;
  const max = 100;
  const throttle = 0.001;

  if (value <= min || reducedMotion) {
    return min;
  } else if (value >= max) {
    return max * throttle;
  } else {
    return value * throttle;
  }
}

const VARIANTS = {
  default: {
    activeColor: null,
    gap: 5,
    speed: 35,
    colors: '#f8fafc,#f1f5f9,#cbd5e1',
    noFocus: false
  },
  blue: {
    activeColor: '#e0f2fe',
    gap: 10,
    speed: 25,
    colors: '#e0f2fe,#7dd3fc,#0ea5e9',
    noFocus: false
  },
  yellow: {
    activeColor: '#fef08a',
    gap: 3,
    speed: 20,
    colors: '#fef08a,#fde047,#eab308',
    noFocus: false
  },
  pink: {
    activeColor: '#fecdd3',
    gap: 6,
    speed: 80,
    colors: '#fecdd3,#fda4af,#e11d48',
    noFocus: true
  }
};

interface PixelCardProps {
  variant?: 'default' | 'blue' | 'yellow' | 'pink';
  gap?: number;
  speed?: number;
  colors?: string;
  noFocus?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function PixelCard({
  variant = 'default',
  gap,
  speed,
  colors,
  noFocus,
  className = '',
  children
}: PixelCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelsRef = useRef<Pixel[]>([]);
  const animationRef = useRef<number | null>(null);
  const timePreviousRef = useRef(performance.now());
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches).current;

  const variantCfg = VARIANTS[variant] || VARIANTS.default;
  const finalGap = gap ?? variantCfg.gap;
  const finalSpeed = speed ?? variantCfg.speed;
  const finalColors = colors ?? variantCfg.colors;
  const finalNoFocus = noFocus ?? variantCfg.noFocus;

  const initPixels = () => {
    if (!containerRef.current || !canvasRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);
    const ctx = canvasRef.current.getContext('2d');

    canvasRef.current.width = width;
    canvasRef.current.height = height;
    canvasRef.current.style.width = `${width}px`;
    canvasRef.current.style.height = `${height}px`;

    const colorsArray = finalColors.split(',');
    const pxs = [];
    for (let x = 0; x < width; x += parseInt(finalGap.toString(), 10)) {
      for (let y = 0; y < height; y += parseInt(finalGap.toString(), 10)) {
        const color = colorsArray[Math.floor(Math.random() * colorsArray.length)];
        const dx = x - width / 2;
        const dy = y - height / 2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const delay = reducedMotion ? 0 : distance;
        if (!ctx) return;
        pxs.push(new Pixel(canvasRef.current, ctx, x, y, color, getEffectiveSpeed(finalSpeed, reducedMotion), delay));
      }
    }
    pixelsRef.current = pxs;
  };

  const doAnimate = (fnName: 'appear' | 'disappear') => {
    animationRef.current = requestAnimationFrame(() => doAnimate(fnName));
    const timeNow = performance.now();
    const timePassed = timeNow - timePreviousRef.current;
    const timeInterval = 1000 / 60;

    if (timePassed < timeInterval) return;
    timePreviousRef.current = timeNow - (timePassed % timeInterval);

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    let allIdle = true;
    for (let i = 0; i < pixelsRef.current.length; i++) {
      const pixel = pixelsRef.current[i];
      (pixel as any)[fnName]();
      if (!pixel.isIdle) {
        allIdle = false;
      }
    }
    if (allIdle) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
  };

  const handleAnimation = (name: 'appear' | 'disappear') => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(() => doAnimate(name));
  };

  const onMouseEnter = () => handleAnimation('appear');
  const onMouseLeave = () => handleAnimation('disappear');
  const onFocus: React.FocusEventHandler<HTMLDivElement> = e => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    handleAnimation('appear');
  };
  const onBlur: React.FocusEventHandler<HTMLDivElement> = e => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    handleAnimation('disappear');
  };

  useEffect(() => {
    initPixels();
    const observer = new ResizeObserver(() => {
      initPixels();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => {
      observer.disconnect();
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalGap, finalSpeed, finalColors, finalNoFocus]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden inline-flex isolate select-none transition-colors duration-200 ease-[cubic-bezier(0.5,1,0.89,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-within:ring-2 focus-within:ring-white focus-within:ring-offset-2 focus-within:ring-offset-black ${className}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={finalNoFocus ? undefined : onFocus}
      onBlur={finalNoFocus ? undefined : onBlur}
      tabIndex={finalNoFocus ? -1 : undefined}
    >
      <canvas className="absolute inset-0 w-full h-full block z-0 pointer-events-none" ref={canvasRef} />
      <div className="relative z-10 w-full h-full flex items-center justify-center">{children}</div>
    </div>
  );
}

// --- UI COMPONENTS ---

const SectionHeading = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-12 md:mb-20">
    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 mb-6">
      <div className="h-[1px] w-8 md:w-12 bg-white text-white shrink-0 mt-4 md:mt-0"></div>
      <GradientText 
        colors={['#ffffff', '#777777', '#ffffff']} 
        animationSpeed={6} 
        className="!mx-0 !justify-start !max-w-full !block text-2xl md:text-3xl lg:text-4xl font-medium tracking-tight uppercase flex-1"
      >
        <span className="block leading-tight text-left break-words whitespace-normal">{title}</span>
      </GradientText>
    </div>
    {subtitle && <p className="text-neutral-400 max-w-2xl text-lg font-light tracking-wide">{subtitle}</p>}
  </div>
);

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="px-3 py-1 text-xs font-mono tracking-widest text-white bg-transparent rounded-none border border-white/20 uppercase">
    {children}
  </span>
);

// --- MAIN APPLICATION ---

export default function Portfolio() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isScrolled, setIsScrolled] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    setMousePosition({
      x: e.clientX,
      y: e.clientY,
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      setIsScrolled(offset > 50);
      setShowBackToTop(offset > 700);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const sectionRatios: Record<string, number> = Object.fromEntries(
      TRACKED_SECTION_IDS.map(id => [id, 0])
    );

    const resolveActiveSection = () => {
      const nextSection = [...TRACKED_SECTION_IDS].sort((leftId, rightId) => {
        const ratioDifference = sectionRatios[rightId] - sectionRatios[leftId];
        if (ratioDifference !== 0) return ratioDifference;

        const leftTop = document.getElementById(leftId)?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
        const rightTop = document.getElementById(rightId)?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
        const focusLine = window.innerHeight * 0.22;

        return Math.abs(leftTop - focusLine) - Math.abs(rightTop - focusLine);
      })[0];

      if (nextSection) {
        setActiveSection(nextSection);
      }
    };

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          sectionRatios[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
        });

        resolveActiveSection();
      },
      {
        rootMargin: '-12% 0px -58% 0px',
        threshold: [0.12, 0.24, 0.36, 0.48, 0.6],
      }
    );

    TRACKED_SECTION_IDS.forEach(id => {
      const section = document.getElementById(id);
      if (section) {
        observer.observe(section);
      }
    });

    resolveActiveSection();

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(PERSONAL_INFO.email)}`;
  const profileFallbackUrl = `${import.meta.env.BASE_URL}profile-fallback.svg`;

  return (
    <div 
      className="relative min-h-screen bg-black text-neutral-300 selection:bg-white selection:text-black font-sans overflow-x-hidden"
      onMouseMove={handleMouseMove}
    >
      <style>{`
        @keyframes glitch {
          0% { clip-path: inset(20% 0 50% 0); }
          5% { clip-path: inset(10% 0 60% 0); }
          10% { clip-path: inset(15% 0 55% 0); }
          15% { clip-path: inset(25% 0 35% 0); }
          20% { clip-path: inset(30% 0 40% 0); }
          25% { clip-path: inset(40% 0 20% 0); }
          30% { clip-path: inset(10% 0 60% 0); }
          35% { clip-path: inset(15% 0 55% 0); }
          40% { clip-path: inset(25% 0 35% 0); }
          45% { clip-path: inset(30% 0 40% 0); }
          50% { clip-path: inset(20% 0 50% 0); }
          55% { clip-path: inset(10% 0 60% 0); }
          60% { clip-path: inset(15% 0 55% 0); }
          65% { clip-path: inset(25% 0 35% 0); }
          70% { clip-path: inset(30% 0 40% 0); }
          75% { clip-path: inset(40% 0 20% 0); }
          80% { clip-path: inset(20% 0 50% 0); }
          85% { clip-path: inset(10% 0 60% 0); }
          90% { clip-path: inset(15% 0 55% 0); }
          95% { clip-path: inset(25% 0 35% 0); }
          100% { clip-path: inset(30% 0 40% 0); }
        }
        .glitch-wrapper {
          position: relative;
          display: inline-block;
          user-select: none;
        }
        .glitch-wrapper::before,
        .glitch-wrapper::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          color: inherit;
          background: #000000;
          overflow: hidden;
          clip-path: inset(0 0 0 0);
        }
        .glitch-wrapper::before {
          left: -3px;
          text-shadow: var(--before-shadow);
          animation: glitch var(--before-duration) infinite linear alternate-reverse;
        }
        .glitch-wrapper::after {
          left: 3px;
          text-shadow: var(--after-shadow);
          animation: glitch var(--after-duration) infinite linear alternate-reverse;
        }
        .glitch-wrapper.glitch-hover-only::before,
        .glitch-wrapper.glitch-hover-only::after {
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .glitch-wrapper.glitch-hover-only:hover::before,
        .glitch-wrapper.glitch-hover-only:hover::after {
          opacity: 1;
        }
        .glitch-wrapper.glitch-stop::before,
        .glitch-wrapper.glitch-stop::after {
          animation: none !important;
          opacity: 0 !important;
        }
      `}</style>
      
      {/* Subtle cursor spotlight */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300 mix-blend-screen opacity-60"
        style={{
          background: `radial-gradient(420px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255, 255, 255, 0.12), transparent 68%)`,
        }}
      />

      <LightRays
        raysOrigin="top-center"
        raysColor="#ffffff"
        raysSpeed={0.8}
        lightSpread={1.2}
        rayLength={2.5}
        pulsating={true}
        fadeDistance={1.0}
        saturation={0.0}
        followMouse={true}
        mouseInfluence={0.2}
        noiseAmount={0.02}
        distortion={0.3}
        className="!fixed !inset-0 !z-0 mix-blend-screen opacity-25"
      />

      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]" 
           style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '100px 100px' }} 
      />

      <header 
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled ? 'bg-black/80 backdrop-blur-md border-b border-white/10 py-4' : 'bg-transparent py-6 border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
          <button
            type="button"
            aria-label="Go to top of page"
            className="text-xl font-bold text-white tracking-tighter cursor-pointer flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            onClick={() => scrollTo('home')}
          >
            <div className="w-12 h-12 rounded-lg bg-[#050505] overflow-hidden flex items-center justify-center border border-white/20 relative group-hover:border-white/50 transition-colors">
              <img
                src={`${import.meta.env.BASE_URL}aj-logo.svg?v=20260413-1136`}
                alt="Aditya logo"
                className="w-full h-full object-contain p-1 grayscale group-hover:grayscale-0 transition-all"
              />
            </div>
            <span className="uppercase tracking-widest text-sm">Aditya<span className="text-neutral-500">.</span></span>
          </button>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <button
                type="button"
                key={link.name}
                onClick={() => scrollTo(link.id)}
                aria-label={`Jump to ${link.name}`}
                aria-current={activeSection === link.id ? 'page' : undefined}
                className={`text-xs font-mono tracking-widest uppercase transition-colors hover:text-white relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                  activeSection === link.id ? 'text-white' : 'text-neutral-400'
                }`}
              >
                {link.name}
              </button>
            ))}
            <PixelCard className="border border-white/20 rounded hover:border-white transition-colors px-6 py-2">
              <a 
                href={gmailComposeUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Open Gmail compose to contact Aditya"
                className="text-xs font-mono tracking-widest uppercase text-white block"
              >
                Contact Me
              </a>
            </PixelCard>
          </nav>

          <button 
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden text-neutral-300 hover:text-white z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        <div className={`md:hidden fixed inset-0 bg-black/95 backdrop-blur-xl z-40 transition-transform duration-300 flex flex-col justify-center items-center gap-8 ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="w-full max-w-sm px-8 flex flex-col gap-4">
            <p className="text-[10px] font-mono tracking-[0.35em] uppercase text-neutral-600">
              Navigation
            </p>
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.id;

              return (
                <button
                  type="button"
                  key={link.name}
                  onClick={() => scrollTo(link.id)}
                  aria-label={`Jump to ${link.name}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center justify-between border px-5 py-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                    isActive
                      ? 'border-white bg-white text-black'
                      : 'border-white/10 text-neutral-400 hover:border-white/40 hover:text-white'
                  }`}
                >
                  <span className="text-2xl font-light tracking-widest uppercase">{link.name}</span>
                  <span className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full transition-colors ${
                        isActive ? 'bg-black' : 'bg-white/20'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-mono tracking-[0.25em] uppercase ${
                        isActive ? 'text-black/70' : 'text-neutral-600'
                      }`}
                    >
                      {isActive ? 'Active' : 'Jump'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <PixelCard className="mt-4 border border-white px-8 py-4">
            <a 
              href={gmailComposeUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open Gmail compose to contact Aditya"
              className="text-sm font-mono tracking-widest uppercase text-white block"
            >
              Get in touch
            </a>
          </PixelCard>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 flex flex-col gap-32 pb-32">
        
        <section id="home" className="min-h-screen w-full flex items-center pt-20">
          <div className="w-full flex flex-col items-start justify-between relative z-10">
            <div className="space-y-6 w-full relative z-10 max-w-5xl">
              <div className="absolute -left-6 md:-left-12 top-0 bottom-0 w-[1px] bg-white/10 hidden md:block"></div>
              
              <div className="flex items-start justify-between w-full mb-8">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border border-white/20 overflow-hidden relative group shadow-2xl">
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500 z-10 pointer-events-none"></div>
                  <img 
                    src="https://avatars.githubusercontent.com/adityajayashankar" 
                    alt="Aditya Jayashankar" 
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = profileFallbackUrl;
                    }}
                  />
                </div>
                
                <div className="flex flex-shrink-0 justify-center items-center relative z-10">
                  <CircularText 
                    text="CODE IS JUST ANOTHER RIFF • ENGINEER • GUITARIST • THINKER • " 
                    spinDuration={20} 
                    onHover="speedUp"
                  />
                </div>
              </div>

              <div className="text-6xl md:text-8xl lg:text-[7rem] font-medium tracking-tighter leading-[1.05]">
                <GradientText colors={['#FF9933', '#FFD700', '#FF9933']} animationSpeed={8} className="!mx-0 !justify-start mb-2">
                  {PERSONAL_INFO.name}.
                </GradientText>
                <div className="mt-4 flex flex-col items-start gap-2">
                  <GlitchText speed={0.6} className="text-neutral-600 text-5xl md:text-6xl lg:text-7xl tracking-tighter">Every problem needs</GlitchText>
                  <GlitchText speed={0.8} className="text-neutral-400 text-5xl md:text-6xl lg:text-7xl tracking-tighter">a good riff.</GlitchText>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-8">
                <PixelCard className="border border-white/40 hover:border-white transition-colors">
                  <a 
                    href={gmailComposeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-8 py-4 font-mono text-sm tracking-widest uppercase text-white flex items-center gap-3"
                  >
                    <Mail className="w-4 h-4" /> Drop a message
                  </a>
                </PixelCard>
                <div className="flex items-center gap-4">
                  <a href={PERSONAL_INFO.github} target="_blank" rel="noreferrer" aria-label="Visit Aditya's GitHub profile" className="p-4 border border-white/10 text-neutral-300 hover:text-white hover:border-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black">
                    <Github className="w-5 h-5" />
                    <span className="sr-only">GitHub</span>
                  </a>
                  <a href={PERSONAL_INFO.linkedin} target="_blank" rel="noreferrer" aria-label="Visit Aditya's LinkedIn profile" className="p-4 border border-white/10 text-neutral-300 hover:text-white hover:border-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black">
                    <Linkedin className="w-5 h-5" />
                    <span className="sr-only">LinkedIn</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 hidden text-neutral-400 md:flex md:flex-col md:items-center md:gap-4">
            <span className="text-[10px] tracking-[0.3em] uppercase font-mono">Scroll Sequence</span>
            <div className="w-[1px] h-12 bg-gradient-to-b from-neutral-400 to-transparent"></div>
          </div>
        </section>

        <section id="about" className="scroll-mt-24 md:scroll-mt-28">
          <SectionHeading 
            title="Yes, I made my about page look like a system spec. No regrets."
          />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BorderGlow 
              className="md:col-span-3 w-full"
              glowColor="0 0 100" 
              colors={['#ffffff', '#a3a3a3', '#333333']} 
              backgroundColor="#050505" 
              borderRadius={0}
              edgeSensitivity={30}
            >
              <div className="p-8 md:p-12 relative z-10 w-full">
                <h3 className="text-xl font-mono tracking-widest text-white mb-8 flex items-center gap-4 uppercase">
                  <Terminal className="text-neutral-500 w-5 h-5" /> About Me
                </h3>
                <div className="space-y-6 text-neutral-400 font-light leading-relaxed text-lg">
                  <p>
                    I build systems that make machines think — and occasionally question their life choices. 
                  </p>
                  <p>
                    ML models, autonomous LLM agents, cloud deployments — if it's complex, distributed, and slightly chaotic, I'm probably already debugging it at 2am with lo-fi playing in the background.
                  </p>
                  <p>
                    Outside the terminal, I'm either lost in a guitar riff or throwing punches in the boxing ring. Turns out, engineering and combat sports have a lot in common — both punish sloppy form.
                  </p>
                </div>
              </div>
            </BorderGlow>

            <BorderGlow 
              className="md:col-span-3 w-full"
              glowColor="0 0 100" 
              colors={['#ffffff', '#a3a3a3', '#333333']} 
              backgroundColor="#050505" 
              borderRadius={0}
            >
              <div className="p-8 md:p-12 relative z-10 w-full">
                <h3 className="text-xl font-mono tracking-widest uppercase text-white mb-10 flex items-center gap-4">
                  <Database className="text-neutral-500 w-5 h-5" /> Technical Arsenal
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
                  {SKILL_GROUPS.map((group, index) => {
                    const Icon = group.icon;
                    return (
                    <div key={index} className="space-y-6">
                      <div className="flex items-center gap-3 text-white font-mono tracking-widest text-sm uppercase border-b border-white/10 pb-4">
                        <Icon className="w-5 h-5 text-white" />
                        {group.category}
                      </div>
                      <ul className="flex flex-wrap gap-2">
                        {group.skills.map((skill, sIdx) => (
                          <li key={sIdx}>
                            <Badge>{skill}</Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )})}
                </div>
              </div>
            </BorderGlow>
          </div>
        </section>

        <section id="journey" className="scroll-mt-24 md:scroll-mt-28">
          <SectionHeading 
            title="Journey"
            subtitle="Every collab, commit, and chord that got me here."
          />
          
          <div className="relative pl-6 md:pl-10 border-l border-white/20 space-y-20">
            {EXPERIENCES.map((exp, index) => (
              <div key={exp.id} className="relative group">
                <div className="absolute -left-[30px] md:-left-[46px] top-1 w-3 h-3 bg-black border border-white group-hover:bg-white transition-colors duration-300 z-10" />
                
                <div className="flex flex-col md:flex-row gap-6 md:gap-12 transition-all duration-300">
                  <div className="md:w-1/4 mt-1">
                    <span className="text-xs font-mono text-neutral-300 uppercase tracking-[0.2em]">{exp.period}</span>
                  </div>
                  <div className="md:w-3/4">
                    <BorderGlow 
                       className="w-full h-full"
                       glowColor="0 0 100" 
                       colors={['#ffffff', '#a3a3a3', '#333333']} 
                       backgroundColor="#050505" 
                       borderRadius={0}
                    >
                      <div className="p-8 h-full transition-colors group-hover:bg-white/[0.02]">
                        <h3 className="text-2xl font-medium text-white tracking-tight">
                          {exp.role} 
                        </h3>
                        <p className="text-neutral-300 font-mono uppercase tracking-widest text-xs mt-2 mb-6">
                          {exp.company}
                        </p>
                        <ul className="space-y-4 text-neutral-400 font-light">
                          {exp.description.map((item, i) => (
                            <li key={i} className="flex gap-4">
                              <span className="text-neutral-600 group-hover:text-white transition-colors duration-300 mt-1 font-mono text-sm tracking-tighter">
                                {`/>`}
                              </span>
                              <span className="leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </BorderGlow>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="projects" className="scroll-mt-24 md:scroll-mt-28">
          <SectionHeading 
            title="My Works" 
            subtitle="Selected applications built to solve complex problems."
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {PROJECTS.map((project) => (
              <a 
                href={project.githubUrl || project.liveUrl || '#'}
                target="_blank"
                rel="noreferrer"
                key={project.id} 
                className="group block cursor-pointer h-full"
              >
                <BorderGlow 
                   className="w-full h-full flex flex-col"
                   glowColor="0 0 100" 
                   colors={['#ffffff', '#a3a3a3', '#333333']} 
                   backgroundColor="#050505" 
                   borderRadius={0}
                >
                  <div className={`h-48 md:h-64 w-full bg-black relative overflow-hidden border-b border-white/10`}>
                    
                    <img 
                      src={project.imageUrl} 
                      alt={project.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700"
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-90 pointer-events-none" />
                    
                    <div className="absolute top-6 left-6 flex gap-2 pointer-events-none">
                       <div className="w-2 h-2 bg-white/50" />
                       <div className="w-2 h-2 bg-white/30" />
                       <div className="w-2 h-2 bg-white/10" />
                    </div>
                    <div className="absolute bottom-0 right-0 p-8 opacity-20 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 pointer-events-none">
                      <Code2 className="w-16 h-16 text-white" />
                    </div>
                  </div>

                  <div className="p-8 md:p-10 flex flex-col flex-grow relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <h3 className="text-2xl font-medium tracking-tight text-white group-hover:underline decoration-1 underline-offset-4">
                        {project.title}
                      </h3>
                      <div className="flex gap-4 opacity-40 group-hover:opacity-100 transition-opacity">
                        {project.githubUrl && (
                          <div className="text-neutral-300">
                            <Github className="w-6 h-6" />
                          </div>
                        )}
                        {project.liveUrl && (
                          <div className="text-neutral-300">
                            <ExternalLink className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-neutral-400 font-light leading-relaxed mb-10 flex-grow">
                      {project.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-auto pt-6 border-t border-white/10">
                      {project.technologies.map((tech, i) => (
                        <span key={i} className="text-[10px] font-mono tracking-[0.2em] uppercase text-neutral-300">
                          {tech} {i < project.technologies.length - 1 && <span className="text-neutral-700 ml-2">/</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                </BorderGlow>
              </a>
            ))}
          </div>
        </section>

        <section className="py-32 flex flex-col items-center text-center border-t border-white/10">
          <p className="text-neutral-400 font-mono tracking-[0.3em] uppercase text-xs mb-6">
            // What's Next?
          </p>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-medium tracking-tighter text-white mb-6 max-w-4xl leading-[1.1]">
            Got an idea that slaps harder than a dropped pick?
          </h2>
          <p className="text-neutral-400 max-w-xl mb-12 text-xl font-light leading-relaxed">
            Let's make some noise.
          </p>
          <PixelCard className="border border-white/40 hover:border-white transition-colors">
            <a 
              href={gmailComposeUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open Gmail compose to contact Aditya"
              className="px-10 py-5 font-mono tracking-widest text-sm uppercase text-white block"
            >
              DROP THE RIFF
            </a>
          </PixelCard>
        </section>

      </main>

      <button
        type="button"
        aria-label="Back to top"
        onClick={() => scrollTo('home')}
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 border border-white/20 bg-black/85 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.25em] text-white backdrop-blur-md transition-all md:bottom-8 md:right-8 ${
          showBackToTop && !mobileMenuOpen
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <ArrowUp className="h-4 w-4" />
        Top
      </button>

      <footer className="relative z-10 border-t border-white/10 bg-black py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-neutral-300 text-xs font-mono uppercase tracking-widest">
            © {new Date().getFullYear()} {PERSONAL_INFO.name}. All Rights Reserved.
          </p>
          <div className="flex items-center gap-8">
             <a href={PERSONAL_INFO.github} aria-label="Visit Aditya's GitHub profile" className="text-neutral-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black">
               <Github className="w-5 h-5" />
             </a>
             <a href={PERSONAL_INFO.linkedin} aria-label="Visit Aditya's LinkedIn profile" className="text-neutral-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black">
               <Linkedin className="w-5 h-5" />
             </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

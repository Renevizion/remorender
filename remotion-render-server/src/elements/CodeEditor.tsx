import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, interpolateColors } from 'remotion';
import type { PlannedElement, VideoPlan } from '../types/video';

interface CodeEditorProps {
  element: PlannedElement;
  style: React.CSSProperties;
  globalStyle?: VideoPlan['style'];
  colors: string[];
  sceneFrame: number;
}

// Syntax highlighting colors
const syntaxColors = {
  keyword: '#c678dd',    // Purple - const, return, function
  string: '#98c379',     // Green - strings
  function: '#61afef',   // Blue - function names
  variable: '#e5c07b',   // Yellow - variables
  comment: '#5c6370',    // Gray - comments
  tag: '#e06c75',        // Red - JSX tags
  attribute: '#d19a66',  // Orange - attributes
  punctuation: '#abb2bf', // Light gray - brackets
  text: '#abb2bf',       // Default text
};

const tokenize = (code: string): Array<{ text: string; color: string }> => {
  const tokens: Array<{ text: string; color: string }> = [];
  const patterns = [
    { regex: /(\/\/.*$)/gm, color: syntaxColors.comment },
    { regex: /\b(const|let|var|function|return|import|export|from|if|else|for|while|async|await|new)\b/g, color: syntaxColors.keyword },
    { regex: /(".*?"|'.*?'|\`.*?\`)/g, color: syntaxColors.string },
    { regex: /(<\/?[A-Z][a-zA-Z]*)/g, color: syntaxColors.tag },
    { regex: /\b([A-Z][a-zA-Z]*)\b/g, color: syntaxColors.function },
    { regex: /([a-z][a-zA-Z]*)\s*(?=\()/g, color: syntaxColors.function },
  ];
  
  // Simple character-by-character tokenization with color mapping
  let remaining = code;
  while (remaining.length > 0) {
    let matched = false;
    
    // Check keywords
    for (const kw of ['const', 'let', 'return', 'import', 'from', 'export', 'function', 'async', 'await', 'new']) {
      if (remaining.startsWith(kw) && !/[a-zA-Z]/.test(remaining[kw.length] || '')) {
        tokens.push({ text: kw, color: syntaxColors.keyword });
        remaining = remaining.slice(kw.length);
        matched = true;
        break;
      }
    }
    
    if (!matched && remaining.startsWith('//')) {
      const end = remaining.indexOf('\n');
      const comment = end === -1 ? remaining : remaining.slice(0, end);
      tokens.push({ text: comment, color: syntaxColors.comment });
      remaining = remaining.slice(comment.length);
      matched = true;
    }
    
    if (!matched && (remaining.startsWith('"') || remaining.startsWith("'") || remaining.startsWith('\`'))) {
      const quote = remaining[0];
      let end = 1;
      while (end < remaining.length && remaining[end] !== quote) end++;
      const str = remaining.slice(0, end + 1);
      tokens.push({ text: str, color: syntaxColors.string });
      remaining = remaining.slice(str.length);
      matched = true;
    }
    
    if (!matched && remaining.startsWith('<')) {
      let end = 1;
      while (end < remaining.length && /[a-zA-Z/]/.test(remaining[end])) end++;
      if (end > 1) {
        tokens.push({ text: remaining.slice(0, end), color: syntaxColors.tag });
        remaining = remaining.slice(end);
        matched = true;
      }
    }
    
    if (!matched) {
      // Check if it's a function call or component
      const funcMatch = remaining.match(/^[A-Z][a-zA-Z]*/);
      if (funcMatch) {
        tokens.push({ text: funcMatch[0], color: syntaxColors.function });
        remaining = remaining.slice(funcMatch[0].length);
        matched = true;
      }
    }
    
    if (!matched) {
      // Default: single character
      const char = remaining[0];
      const color = /[{}()[\];,<>]/.test(char) ? syntaxColors.punctuation : syntaxColors.text;
      tokens.push({ text: char, color });
      remaining = remaining.slice(1);
    }
  }
  
  return tokens;
};

export const CodeEditor: React.FC<CodeEditorProps> = ({ 
  element, 
  style, 
  colors, 
  sceneFrame 
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  
  const codeContent = element.content || `const MyVideo = () => {
  return (
    <AbsoluteFill>
      <Video
        src={staticFile('video.mp4')}
      />
    </AbsoluteFill>
  );
};`;

  const tokens = tokenize(codeContent);
  
  // Dynamic zoom effect
  const zoomProgress = spring({
    fps,
    frame: sceneFrame,
    config: { damping: 80, stiffness: 60, mass: 1 },
  });
  const scale = interpolate(zoomProgress, [0, 1], [0.92, 1]);
  
  // Camera movement - slight pan
  const panX = interpolate(
    sceneFrame,
    [0, fps * 5],
    [0, -5],
    { extrapolateRight: 'clamp' }
  );
  
  // Typing animation - reveal characters over time
  const typingSpeed = 3; // characters per frame
  const typingDelay = 15; // frames before typing starts
  const totalChars = codeContent.length;
  const charsVisible = Math.min(
    totalChars,
    Math.max(0, Math.floor((sceneFrame - typingDelay) * typingSpeed))
  );
  
  // Build visible text with syntax highlighting
  let charCount = 0;
  const visibleTokens: Array<{ text: string; color: string }> = [];
  
  for (const token of tokens) {
    if (charCount >= charsVisible) break;
    
    const remainingChars = charsVisible - charCount;
    if (token.text.length <= remainingChars) {
      visibleTokens.push(token);
      charCount += token.text.length;
    } else {
      visibleTokens.push({ 
        text: token.text.slice(0, remainingChars), 
        color: token.color 
      });
      charCount += remainingChars;
    }
  }
  
  // Cursor blink
  const cursorOpacity = Math.sin(frame * 0.2) > 0 ? 1 : 0;
  
  // 3D perspective animation
  const perspective3D = spring({
    fps,
    frame: sceneFrame,
    config: { damping: 50, stiffness: 80, mass: 1 },
  });
  
  const rotateY = interpolate(perspective3D, [0, 1], [-15, -8]);
  const rotateX = interpolate(perspective3D, [0, 1], [8, 4]);
  
  const width = element.size?.width || 600;
  const height = element.size?.height || 400;
  
  // Dynamic glow effect
  const glowIntensity = interpolate(
    sceneFrame,
    [0, fps * 2, fps * 4],
    [0, 1, 0.6],
    { extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        ...style,
        perspective: '1500px',
        transformStyle: 'preserve-3d',
        transform: `${style.transform} translateX(${panX}px) scale(${scale})`,
      }}
    >
      {/* Laptop/Editor container with 3D effect */}
      <div
        style={{
          width,
          height,
          background: 'linear-gradient(180deg, #21252b 0%, #1a1d21 100%)',
          borderRadius: 12,
          boxShadow: `
            0 60px 120px rgba(0,0,0,0.5),
            0 20px 60px rgba(0,0,0,0.3),
            0 0 ${50 * glowIntensity}px rgba(82, 139, 255, ${0.4 * glowIntensity}),
            inset 0 1px 0 rgba(255,255,255,0.05)
          `,
          transform: `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`,
          transformStyle: 'preserve-3d',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Title bar */}
        <div
          style={{
            height: 32,
            background: 'linear-gradient(180deg, #2d3139 0%, #282c34 100%)',
            borderBottom: '1px solid #1a1d21',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            gap: 8,
          }}
        >
          {/* Traffic lights */}
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
          
          <span style={{
            marginLeft: 16,
            color: '#6d737a',
            fontSize: 12,
            fontFamily: 'monospace',
          }}>
            Video.tsx
          </span>
        </div>
        
        {/* Code area */}
        <div
          style={{
            flex: 1,
            padding: 20,
            fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
            fontSize: 14,
            lineHeight: 1.6,
            overflow: 'hidden',
            display: 'flex',
          }}
        >
          {/* Line numbers */}
          <div
            style={{
              color: '#4b5263',
              paddingRight: 16,
              marginRight: 16,
              borderRight: '1px solid #2c313a',
              textAlign: 'right',
              userSelect: 'none',
            }}
          >
            {codeContent.split('\n').slice(0, Math.ceil(charsVisible / 20) + 1).map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          
          {/* Code content */}
          <div style={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {visibleTokens.map((token, i) => (
              <span key={i} style={{ color: token.color }}>
                {token.text}
              </span>
            ))}
            {/* Blinking cursor */}
            <span 
              style={{ 
                borderLeft: '2px solid #528bff', 
                marginLeft: 1,
                opacity: cursorOpacity,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;

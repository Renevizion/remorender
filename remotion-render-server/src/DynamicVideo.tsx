import React from 'react';
import { 
  AbsoluteFill, 
  useCurrentFrame, 
  useVideoConfig, 
  interpolate, 
  spring, 
  Sequence, 
  Series, 
  Easing, 
  Img, 
  delayRender, 
  continueRender, 
  random,
  Loop,
  Freeze,
} from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { noise3D } from '@remotion/noise';
import { Audio } from '@remotion/media';
import { OffthreadVideo } from 'remotion';
import { measureText } from '@remotion/layout-utils';
import { Trail } from '@remotion/motion-blur';
import { Circle, Rect, Triangle, Star, Polygon } from '@remotion/shapes';
import { getLength, getPointAtLength, evolvePath } from '@remotion/paths';
import type { VideoPlan, PlannedScene, PlannedElement, AnimationPattern } from './types/video';
import { CodeEditor, ProgressBar, AnimatedText, PhoneMockup, LogoGrid, DataVisualization } from './elements/index';
import { AudioVisualization } from './elements/AudioVisualization';
import { ColorGrading, FilmGrain, Vignette, Bloom } from './elements/ColorGrading';
import { ResponsiveContainer, type AspectRatio } from './elements/AspectRatioSupport';

interface DynamicVideoProps {
  plan: VideoPlan;
}

// ============================================================================
// RANDOMNESS UTILITIES - Deterministic and Non-Deterministic Random Values
// ============================================================================
// Following Remotion best practices for using randomness:
// - https://www.remotion.dev/docs/using-randomness
// - https://www.remotion.dev/docs/random#accessing-true-randomness

/**
 * Get a deterministic random value based on a seed.
 * Same seed always produces the same value - critical for consistent renders.
 * 
 * @example
 * const offset = random('particle-1') * 100; // Always same value for this seed
 * const color = colors[Math.floor(random('color-choice') * colors.length)];
 */
export const getSeededRandom = (seed: string): number => {
  return random(seed);
};

/**
 * Get a truly random value (non-deterministic).
 * Use this ONLY when you explicitly want different values on each render,
 * such as for the "Reevaluate" button in Remotion Studio.
 * 
 * @example
 * const truelyRandomValue = random(null); // Different every time
 */
export const getTrueRandom = (): number => {
  return random(null);
};

/**
 * NEVER use Math.random() in Remotion components!
 * It will cause flickering and non-deterministic renders.
 * 
 * ❌ BAD:  const x = Math.random() * 100;
 * ✅ GOOD: const x = random('seed') * 100;
 * ✅ GOOD: const x = noise3D('seed', frame, 0, 0) * 100;
 */

// ============================================================================
// ADVANCED EASING FUNCTIONS - From Remotion Easing module
// Provides more organic, natural-feeling animations
// ============================================================================

/**
 * Get an easing function by name
 * Supports: linear, ease, quad, cubic, elastic, bounce, back, bezier
 */
export const getEasingFunction = (name: string): ((t: number) => number) => {
  switch (name?.toLowerCase()) {
    case 'linear':
      return Easing.linear;
    case 'ease':
    case 'ease-out':
      return Easing.out(Easing.ease);
    case 'ease-in':
      return Easing.in(Easing.ease);
    case 'ease-in-out':
      return Easing.inOut(Easing.ease);
    case 'quad':
      return Easing.out(Easing.quad);
    case 'cubic':
      return Easing.out(Easing.cubic);
    case 'elastic':
      return Easing.out(Easing.elastic(1));
    case 'bounce':
      return Easing.out(Easing.bounce);
    case 'back':
      return Easing.out(Easing.back(1.5));
    case 'spring':
      // For spring, we return linear and let the spring() function handle it
      return Easing.linear;
    default:
      return Easing.out(Easing.ease);
  }
};

// ============================================================================
// PARTICLE SYSTEM - Looping animated particles for visual richness
// Uses <Loop> component for seamless repetition
// ============================================================================

interface ParticleProps {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  type: 'circle' | 'star' | 'dot';
}

const Particle: React.FC<ParticleProps> = React.memo(({ id, x, y, size, color, speed, type }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Organic floating motion using noise
  const floatX = noise3D(`particle-x-${id}`, frame * speed * 0.01, 0, 0) * 30;
  const floatY = noise3D(`particle-y-${id}`, 0, frame * speed * 0.01, 0) * 30;
  const opacity = 0.3 + noise3D(`particle-o-${id}`, frame * speed * 0.02, 0, 0) * 0.4;
  const scale = 0.8 + noise3D(`particle-s-${id}`, 0, 0, frame * speed * 0.01) * 0.4;
  
  if (type === 'star') {
    return (
      <div style={{
        position: 'absolute',
        left: `${x + floatX}%`,
        top: `${y + floatY}%`,
        opacity,
        transform: `translate(-50%, -50%) scale(${scale})`,
      }}>
        <Star
          points={4}
          innerRadius={size * 0.4}
          outerRadius={size}
          fill={color}
        />
      </div>
    );
  }
  
  return (
    <div style={{
      position: 'absolute',
      left: `${x + floatX}%`,
      top: `${y + floatY}%`,
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      opacity,
      transform: `translate(-50%, -50%) scale(${scale})`,
      filter: type === 'dot' ? undefined : 'blur(1px)',
    }} />
  );
});

/**
 * ParticleField - Creates a field of animated particles
 * Uses <Loop> for seamless infinite animation
 */
export const ParticleField: React.FC<{
  count: number;
  colors: string[];
  types?: ('circle' | 'star' | 'dot')[];
}> = React.memo(({ count, colors, types = ['circle', 'star', 'dot'] as const }) => {
  const { fps, durationInFrames } = useVideoConfig();
  
  // Generate deterministic particles
  const particles: ParticleProps[] = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const typeIndex = Math.floor(random(`pt-${i}`) * types.length);
      return {
        id: `p-${i}`,
        x: random(`px-${i}`) * 100,
        y: random(`py-${i}`) * 100,
        size: 4 + random(`ps-${i}`) * 12,
        color: colors[Math.floor(random(`pc-${i}`) * colors.length)] + '40',
        speed: 0.5 + random(`psp-${i}`) * 1.5,
        type: types[typeIndex],
      };
    });
  }, [count, colors, types]);
  
  // Wrap in Loop for seamless repetition
  const loopDuration = Math.min(durationInFrames, fps * 5); // 5 second loops
  
  return (
    <Loop durationInFrames={loopDuration}>
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        {particles.map(p => <Particle key={p.id} {...p} />)}
      </AbsoluteFill>
    </Loop>
  );
});

// ============================================================================
// SVG PATH ANIMATION - For morphing and path-following animations
// ============================================================================

/**
 * AnimatedPath - Draws an SVG path over time
 * Great for line reveals, signature effects, and path morphing
 */
export const AnimatedPath: React.FC<{
  d: string;
  stroke: string;
  strokeWidth?: number;
  duration?: number;
  delay?: number;
}> = React.memo(({ d, stroke, strokeWidth = 2, duration = 1, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const pathLength = React.useMemo(() => {
    try {
      return getLength(d);
    } catch {
      return 100;
    }
  }, [d]);
  
  const progress = interpolate(
    frame,
    [delay * fps, (delay + duration) * fps],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.ease) }
  );
  
  const evolvedPath = React.useMemo(() => {
    try {
      return evolvePath(progress, d);
    } catch {
      return { strokeDasharray: `${pathLength}`, strokeDashoffset: `${pathLength * (1 - progress)}` };
    }
  }, [progress, d, pathLength]);
  
  return (
    <svg style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'visible' }}>
      <path
        d={d}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...evolvedPath}
      />
    </svg>
  );
});

// ============================================================================
// FREEZE FRAME WRAPPER - For dramatic pauses
// ============================================================================

/**
 * DramaticPause - Freezes children at a specific frame for emphasis
 */
export const DramaticPause: React.FC<{
  children: React.ReactNode;
  freezeAtFrame: number;
  pauseDuration: number; // in seconds
}> = ({ children, freezeAtFrame, pauseDuration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const pauseStart = freezeAtFrame;
  const pauseEnd = freezeAtFrame + pauseDuration * fps;
  
  const shouldFreeze = frame >= pauseStart && frame < pauseEnd;
  
  if (shouldFreeze) {
    return <Freeze frame={pauseStart}>{children}</Freeze>;
  }
  
  return <>{children}</>;
};
export const DynamicVideo: React.FC<DynamicVideoProps> = ({ plan }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // Debug logging
  React.useEffect(() => {
    console.log('DynamicVideo plan:', plan);
    console.log('Scenes:', plan?.scenes?.length);
    console.log('Frame:', frame);
  }, [plan, frame]);

  // Extract global colors
  const colors = plan.style?.colorPalette || ['#ffffff', '#06b6d4', '#1e293b', '#0f172a'];
  const globalBg = colors[3] || colors[2] || '#0f172a';

  // NEW: Extract global video effects from plan.style
  const videoStyle = plan.style as any;
  const aspectRatio = videoStyle?.aspectRatio as AspectRatio | undefined;
  const colorGradingPreset = videoStyle?.colorGrading as 'cinematic' | 'vintage' | 'vibrant' | 'moody' | 'pastel' | 'noir' | 'sunset' | 'cool' | 'natural' | undefined;
  const filmGrainIntensity = videoStyle?.filmGrain as number | undefined;
  const vignetteIntensity = videoStyle?.vignette as number | undefined;
  const bloomIntensity = videoStyle?.bloom as number | undefined;
  const safeArea = videoStyle?.safeArea as boolean | undefined;

  // No scenes placeholder
  if (!plan?.scenes?.length) {
    return (
      <AbsoluteFill style={{ backgroundColor: globalBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', opacity: 0.5, fontSize: 18 }}>
          No scenes to preview
        </div>
      </AbsoluteFill>
    );
  }

  // Render function for the actual video content
  const renderVideoContent = () => (
    <AbsoluteFill style={{ backgroundColor: globalBg, overflow: 'hidden' }}>
      {/* Animated background gradient */}
      <AnimatedBackground colors={colors} />
      
      {/* Render scenes with simple Sequences */}
      {plan.scenes.map((scene, index) => {
        const startFrame = Math.round(scene.startTime * fps);
        const durationFrames = Math.round(scene.duration * fps);
        
        return (
          <Sequence
            key={scene.id}
            from={startFrame}
            durationInFrames={durationFrames}
          >
            <SceneRenderer 
              scene={scene} 
              globalStyle={plan.style} 
              sceneIndex={index}
              totalScenes={plan.scenes.length}
            />
          </Sequence>
        );
      })}
      
      {/* Subtle vignette overlay (always on by default) */}
      <Vignette intensity={vignetteIntensity !== undefined ? vignetteIntensity : 0.15} />
    </AbsoluteFill>
  );

  // Wrap with aspect ratio container if specified
  const withAspectRatio = (content: React.ReactNode) => {
    if (aspectRatio) {
      return (
        <ResponsiveContainer 
          aspectRatio={aspectRatio} 
          safeArea={safeArea}
          backgroundColor={globalBg}
        >
          {content}
        </ResponsiveContainer>
      );
    }
    return content;
  };

  // Wrap with color grading if specified
  const withColorGrading = (content: React.ReactNode) => {
    if (colorGradingPreset) {
      return (
        <ColorGrading preset={colorGradingPreset}>
          {content}
          {filmGrainIntensity !== undefined && filmGrainIntensity > 0 && (
            <FilmGrain intensity={filmGrainIntensity} />
          )}
          {vignetteIntensity !== undefined && vignetteIntensity > 0 && (
            <Vignette intensity={vignetteIntensity} />
          )}
          {bloomIntensity !== undefined && bloomIntensity > 0 && (
            <Bloom intensity={bloomIntensity} />
          )}
        </ColorGrading>
      );
    }
    return content;
  };

  // Apply all wrappers: aspectRatio -> colorGrading -> content
  return withAspectRatio(withColorGrading(renderVideoContent())) as React.ReactElement;

};

// ============================================================================
// ANIMATED BACKGROUND - Organic gradient with noise3D motion + particles
// ============================================================================
const AnimatedBackground: React.FC<{ colors: string[]; showParticles?: boolean }> = React.memo(({ colors, showParticles = true }) => {
  const frame = useCurrentFrame();
  const primary = colors[1] || '#06b6d4';
  const secondary = colors[2] || '#1e293b';
  
  // Use noise3D for smooth organic motion of orbs
  const orb1X = 60 + noise3D('orb1-x', frame * 0.01, 0, 0) * 20;
  const orb1Y = 20 + noise3D('orb1-y', 0, frame * 0.01, 0) * 15;
  const orb1Rotation = noise3D('orb1-rot', frame * 0.005, 0, 0) * 30;
  
  const orb2X = 30 + noise3D('orb2-x', frame * 0.008, 0, 0) * 15;
  const orb2Y = 70 + noise3D('orb2-y', 0, frame * 0.008, 0) * 20;
  const orb2Rotation = noise3D('orb2-rot', frame * 0.006, 0, 0) * 25;
  
  return (
    <AbsoluteFill>
      {/* Base gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${secondary} 0%, ${colors[3] || '#0f172a'} 100%)`,
        }}
      />
      
      {/* Animated orbs with noise3D motion */}
      <div
        style={{
          position: 'absolute',
          top: `${orb1Y}%`,
          left: `${orb1X}%`,
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${primary}20 0%, transparent 70%)`,
          transform: `translate(-50%, -50%) rotate(${orb1Rotation}deg)`,
          filter: 'blur(60px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: `${orb2Y}%`,
          left: `${orb2X}%`,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #8b5cf620 0%, transparent 70%)',
          transform: `translate(-50%, -50%) rotate(${orb2Rotation}deg)`,
          filter: 'blur(80px)',
        }}
      />
      
      {/* Optional particle field for extra visual richness */}
      {showParticles && (
        <ParticleField 
          count={15} 
          colors={[primary, colors[3] || '#8b5cf6', '#ffffff']} 
          types={['circle', 'star', 'dot']}
        />
      )}
    </AbsoluteFill>
  );
});

// Note: Using imported Vignette from ColorGrading instead of local duplicate

// ============================================================================
// SCENE RENDERER - Handles individual scenes with transitions
// ============================================================================
const SceneRenderer: React.FC<{
  scene: PlannedScene;
  globalStyle: VideoPlan['style'];
  sceneIndex: number;
  totalScenes: number;
}> = ({ scene, globalStyle, sceneIndex }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationFrames = Math.round(scene.duration * fps);

  // Scene entry animation
  const entryProgress = spring({
    fps,
    frame,
    config: { damping: 40, stiffness: 100, mass: 0.8 },
  });

  // Scene exit animation
  const exit = spring({
    fps,
    frame,
    config: { damping: 40, stiffness: 100, mass: 0.8 },
    durationInFrames: Math.round(fps * 0.5),
    delay: durationFrames - Math.round(fps * 0.5),
  });
  const combinedProgress = Math.min(entryProgress, 1 - exit);

  const combinedOpacity = combinedProgress;
  const entryScale = interpolate(entryProgress, [0, 1], [0.95, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        opacity: combinedOpacity,
        transform: `scale(${entryScale})`,
      }}
    >
      {/* Scene background effects based on description */}
      <SceneBackground description={scene.description} />
      
      {/* Render elements - each with its own staggered timing */}
      {scene.elements?.map((element, idx) => (
        <ElementRenderer
          key={element.id}
          element={element}
          globalStyle={globalStyle}
          sceneFrame={frame}
          elementIndex={idx}
          totalElements={scene.elements?.length || 1}
        />
      ))}
    </AbsoluteFill>
  );
};

// ============================================================================
// SCENE BACKGROUND - Contextual backgrounds based on scene description
// ============================================================================
const SceneBackground: React.FC<{ description: string }> = React.memo(({ description }) => {
  const frame = useCurrentFrame();
  const desc = description.toLowerCase();
  
  // Detect scene type from description
  const isIntro = desc.includes('intro') || desc.includes('opening') || desc.includes('hero');
  const isFeature = desc.includes('feature') || desc.includes('showcase') || desc.includes('demo');
  const isEnding = desc.includes('outro') || desc.includes('closing') || desc.includes('cta') || desc.includes('end');
  
  if (isIntro) {
    // Throttle rotation to every 4th frame for performance
    const throttledFrame = Math.floor(frame / 4) * 4;
    return (
      <AbsoluteFill>
        {/* Starburst effect for intros */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 1200,
            height: 1200,
            transform: `translate(-50%, -50%) rotate(${throttledFrame * 0.5}deg)`,
            background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.03) 10deg, transparent 20deg)',
            borderRadius: '50%',
          }}
        />
      </AbsoluteFill>
    );
  }
  
  if (isEnding) {
    // Static sparkle effect for endings (no per-frame animation)
    return (
      <AbsoluteFill>
        {[...Array(4)].map((_, i) => {
          const positions = [
            { x: 20, y: 25 },
            { x: 80, y: 20 },
            { x: 15, y: 70 },
            { x: 85, y: 65 },
          ];
          return (
            <Sparkle key={i} x={positions[i].x} y={positions[i].y} scale={0.8} />
          );
        })}
      </AbsoluteFill>
    );
  }
  
  return null;
});

// ============================================================================
// SPARKLE ELEMENT - For decorative stars
// ============================================================================
const Sparkle: React.FC<{ x: number; y: number; scale: number }> = React.memo(({ x, y, scale }) => (
  <div
    style={{
      position: 'absolute',
      left: `${x}%`,
      top: `${y}%`,
      transform: `translate(-50%, -50%) scale(${scale})`,
    }}
  >
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <path
        d="M20 0L22.5 17.5L40 20L22.5 22.5L20 40L17.5 22.5L0 20L17.5 17.5L20 0Z"
        fill="white"
        opacity="0.8"
      />
    </svg>
  </div>
));

// ============================================================================
// ELEMENT ANIMATION HOOK
// ============================================================================
const useElementAnimation = (
  element: PlannedElement,
  sceneFrame: number,
  fps: number,
  elementIndex: number
) => {
  const anim = element.animation as AnimationPattern | undefined;
  
  // Stagger delay based on element index
  const staggerDelay = elementIndex * 0.1;
  
  const baseDelay = ((anim?.delay || 0) + staggerDelay) * fps;
  const duration = (anim?.duration || 0.6) * fps;
  
  // Spring-based entry for smoother motion
  const springProgress = spring({
    fps,
    frame: Math.max(0, sceneFrame - baseDelay),
    config: { damping: 30, stiffness: 120, mass: 0.5 },
  });
  
  // Linear progress for specific animations
  const linearProgress = interpolate(
    sceneFrame,
    [baseDelay, baseDelay + duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const opacity = springProgress;
  let translateX = 0;
  let translateY = interpolate(springProgress, [0, 1], [30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  let scale = interpolate(springProgress, [0, 1], [0.9, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  let rotate = 0;
  const blur = interpolate(springProgress, [0, 0.3], [4, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const animType = anim?.type || anim?.name || 'fade';
  const props = anim?.properties || {};

  switch (animType) {
    case 'fade':
    case 'fadeIn':
      translateY = 0;
      scale = 1;
      break;
      
    case 'slide':
    case 'slideIn':
    case 'slideUp':
      if (props.y) {
        const [fromY, toY] = Array.isArray(props.y) ? props.y : [60, 0];
        translateY = interpolate(springProgress, [0, 1], [fromY as number, toY as number], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      }
      if (props.x) {
        const [fromX, toX] = Array.isArray(props.x) ? props.x : [0, 0];
        translateX = interpolate(springProgress, [0, 1], [fromX as number, toX as number], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      }
      break;
      
    case 'scale':
    case 'popIn':
    case 'zoomIn':
    case 'pop':
      if (props.scale) {
        const [fromScale, toScale] = Array.isArray(props.scale) ? props.scale : [0.5, 1];
        scale = interpolate(springProgress, [0, 1], [fromScale as number, toScale as number], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      } else {
        scale = interpolate(springProgress, [0, 1], [0.5, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      }
      translateY = interpolate(springProgress, [0, 1], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      break;
      
    case 'rotate':
    case 'spin':
      rotate = interpolate(linearProgress, [0, 1], [0, 360], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      break;
      
    case 'pulse': {
      const pulseScale = 1 + noise3D('pulse-' + element.id, sceneFrame * 0.15, 0, 0) * 0.05;
      scale = pulseScale;
      break;
    }
      
    case 'float':
      translateY = noise3D('float-' + element.id, 0, 0, sceneFrame * 0.02) * 15;
      break;
      
    case 'glow':
      // Handled in element rendering
      break;
    
    // NEW: Advanced easing animations
    case 'bounce':
    case 'bounceIn': {
      const bounceProgress = interpolate(
        sceneFrame,
        [baseDelay, baseDelay + duration],
        [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.bounce) }
      );
      scale = interpolate(bounceProgress, [0, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      translateY = interpolate(bounceProgress, [0, 1], [-50, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      break;
    }
    
    case 'elastic':
    case 'elasticIn': {
      const elasticProgress = interpolate(
        sceneFrame,
        [baseDelay, baseDelay + duration],
        [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.elastic(1)) }
      );
      scale = interpolate(elasticProgress, [0, 1], [0.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      break;
    }
    
    case 'back':
    case 'backIn': {
      const backProgress = interpolate(
        sceneFrame,
        [baseDelay, baseDelay + duration],
        [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.5)) }
      );
      scale = interpolate(backProgress, [0, 1], [0.7, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      translateY = interpolate(backProgress, [0, 1], [30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      break;
    }
    
    case 'slideLeft':
    case 'slideInLeft': {
      translateX = interpolate(springProgress, [0, 1], [-100, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      translateY = 0;
      break;
    }
    
    case 'slideRight':
    case 'slideInRight': {
      translateX = interpolate(springProgress, [0, 1], [100, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      translateY = 0;
      break;
    }
    
    case 'slideDown':
    case 'slideInDown': {
      translateY = interpolate(springProgress, [0, 1], [-60, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      break;
    }
    
    case 'flipIn': {
      rotate = interpolate(springProgress, [0, 1], [90, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      scale = interpolate(springProgress, [0, 0.5, 1], [0.5, 1.1, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      break;
    }
  }

  return { opacity, translateX, translateY, scale, rotate, blur };
};

// ============================================================================
// ELEMENT RENDERER - Renders individual elements with proper styling
// ============================================================================
const ElementRenderer: React.FC<{
  element: PlannedElement;
  globalStyle: VideoPlan['style'];
  sceneFrame: number;
  elementIndex: number;
  totalElements: number;
}> = ({ element, globalStyle, sceneFrame, elementIndex }) => {
  const { fps } = useVideoConfig();
  
  const { opacity, translateX, translateY, scale, rotate, blur } = useElementAnimation(
    element,
    sceneFrame,
    fps,
    elementIndex
  );

  const colors = globalStyle?.colorPalette || ['#ffffff', '#06b6d4', '#1e293b'];
  
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${element.position?.x ?? 50}%`,
    top: `${element.position?.y ?? 50}%`,
    transform: `translate(-50%, -50%) translateX(${translateX}px) translateY(${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
    opacity,
    zIndex: element.position?.z || 1,
    filter: blur > 0 ? `blur(${blur}px)` : undefined,
  };

  // Determine if element needs motion blur (fast animations)
  const animation = element.animation;
  const needsMotionBlur = animation && [
    'slideInLeft', 'slideInRight', 'slideInUp', 'slideInDown',
    'rotate', 'spin'
  ].includes(animation.name || '');
  
  // Wrapper function to optionally add motion blur
  // Trail requires: layers (number of ghost layers), lagInFrames (delay between layers), trailOpacity (0-1)
  const wrapWithMotionBlur = (content: React.ReactNode) => {
    if (needsMotionBlur) {
      return <Trail layers={5} lagInFrames={2} trailOpacity={0.5}>{content}</Trail>;
    }
    return content;
  };

  // Check for advanced element types in content/style
  const content = element.content?.toLowerCase() || '';
  const styleType = (element.style as Record<string, unknown>)?.elementType as string;

  // Heuristics: some plans use shape placeholders like "Cursor" or "Arrow".
  // Treat those as real elements to avoid giant blocks + label text.
  if (element.type === 'shape' && content.includes('cursor')) {
    return wrapWithMotionBlur(<CursorElement element={element} style={baseStyle} sceneFrame={sceneFrame} fps={fps} />);
  }

  if (element.type === 'shape' && content.includes('arrow')) {
    return wrapWithMotionBlur(<ArrowElement element={element} style={baseStyle} colors={colors} />);
  }
  
  // Route to advanced elements based on content keywords or explicit type
  if (styleType === 'code-editor' || content.includes('code') || content.includes('editor') || content.includes('syntax')) {
    return wrapWithMotionBlur(<CodeEditor element={element} style={baseStyle} globalStyle={globalStyle} colors={colors} sceneFrame={sceneFrame} />);
  }
  
  if (styleType === 'progress' || content.includes('progress') || content.includes('render') || content.includes('loading')) {
    return wrapWithMotionBlur(<ProgressBar element={element} style={baseStyle} globalStyle={globalStyle} colors={colors} sceneFrame={sceneFrame} />);
  }
  
  // Terminal: Simple implementation using Rect shape
  if (styleType === 'terminal' || content.includes('terminal') || content.includes('command') || content.includes('cli')) {
    const entrySpring = spring({ fps, frame: sceneFrame, config: { damping: 30, stiffness: 100 } });
    const width = (element.size?.width || 600);
    const height = (element.size?.height || 400);
    
    return wrapWithMotionBlur(
      <div style={{ ...baseStyle, opacity: entrySpring, transform: `${baseStyle.transform} scale(${entrySpring})` }}>
        <Rect width={width} height={height} fill="#1e1e2e" cornerRadius={16} />
        <div style={{
          position: 'absolute',
          padding: 20,
          fontFamily: 'monospace',
          fontSize: 14,
          color: '#4ade80',
          width: width - 40,
          height: height - 40,
          overflow: 'hidden',
        }}>
          <pre style={{ margin: 0 }}>{element.content || '$ command...'}</pre>
        </div>
      </div>
    );
  }
  
  // Laptop: Simple implementation using Rect shapes
  if (styleType === 'laptop' || content.includes('laptop') || content.includes('macbook')) {
    const entrySpring = spring({ fps, frame: sceneFrame, config: { damping: 40, stiffness: 60 } });
    const screenWidth = (element.size?.width || 800);
    const rotateY = interpolate(entrySpring, [0, 1], [-20, -10]);
    
    return wrapWithMotionBlur(
      <div style={{ 
        ...baseStyle, 
        perspective: '2000px',
        transform: `${baseStyle.transform} rotateY(${rotateY}deg)`,
      }}>
        <Rect width={screenWidth} height={screenWidth * 0.625} fill="#1a1a1a" cornerRadius={20} />
        <div style={{
          position: 'absolute',
          width: screenWidth - 30,
          height: screenWidth * 0.625 - 30,
          margin: 15,
          background: '#0f172a',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
        }}>
          {element.content || 'Screen Content'}
        </div>
      </div>
    );
  }
  
  // 3D Card: Implementation with proper style support (backgroundImage, etc.)
  if (styleType === '3d-card' || content.includes('3d card') || content.includes('perspective card')) {
    const entrySpring = spring({ fps, frame: sceneFrame, config: { damping: 25, stiffness: 70 } });
    const floatY = noise3D('float-' + element.id, 0, 0, sceneFrame * 0.02) * 10;
    const rotateY = interpolate(entrySpring, [0, 1], [-15, 5]);
    const width = (element.size?.width || 400);
    const height = (element.size?.height || 280);
    const cardStyle = element.style as Record<string, unknown>;
    
    // Extract style properties
    const background = cardStyle?.background as string || 'rgba(255,255,255,0.1)';
    const backgroundImage = cardStyle?.backgroundImage as string;
    const backgroundSize = cardStyle?.backgroundSize as string || 'cover';
    const backgroundPosition = cardStyle?.backgroundPosition as string || 'center';
    const borderRadius = cardStyle?.borderRadius as number || 24;
    const boxShadow = cardStyle?.boxShadow as string || '0 10px 30px rgba(0,0,0,0.1)';
    
    return wrapWithMotionBlur(
      <div style={{
        ...baseStyle,
        perspective: '1500px',
        transform: `${baseStyle.transform} translateY(${floatY}px)`,
      }}>
        <div style={{
          transform: `rotateY(${rotateY}deg) scale(${entrySpring})`,
          transformStyle: 'preserve-3d',
          width,
          height,
          position: 'relative',
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            background,
            backgroundImage,
            backgroundSize,
            backgroundPosition,
            borderRadius,
            boxShadow,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 20,
            color: '#fff',
            fontSize: 28,
            fontWeight: 700,
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          }}>
            {element.content || ''}
          </div>
        </div>
      </div>
    );
  }
  
  // Phone mockup / device frame
  if (element.type === 'phone-mockup' || styleType === 'phone' || styleType === 'iphone' || content.includes('phone') || content.includes('iphone') || content.includes('device mockup')) {
    return wrapWithMotionBlur(<PhoneMockup element={element} style={baseStyle} globalStyle={globalStyle} colors={colors} sceneFrame={sceneFrame} />);
  }
  
  // Logo grid with scrolling/alignment
  if (element.type === 'logo-grid' || styleType === 'logos' || content.includes('logo grid') || content.includes('company logos')) {
    return wrapWithMotionBlur(<LogoGrid element={element} style={baseStyle} globalStyle={globalStyle} colors={colors} sceneFrame={sceneFrame} />);
  }
  
  // Data visualization (charts)
  if (element.type === 'data-viz' || element.type === 'chart' || styleType === 'chart' || content.includes('bar chart') || content.includes('line chart') || content.includes('pie chart')) {
    return wrapWithMotionBlur(<DataVisualization element={element} style={baseStyle} globalStyle={globalStyle} colors={colors} sceneFrame={sceneFrame} />);
  }
  
  // Check for animated text (character-by-character reveal)
  const animTextStyle = element.style as Record<string, unknown> | undefined;
  if (element.type === 'text' && (styleType === 'animated-text' || content.toLowerCase().includes('animated') || animTextStyle?.animated === true)) {
    return wrapWithMotionBlur(<AnimatedText element={element} style={baseStyle} globalStyle={globalStyle} colors={colors} sceneFrame={sceneFrame} />);
  }
  
  // NEW: Showcase element support for reusable components
  // These can be used directly in video plans by setting element.type or keywords in content
  
  // REAL Audio Visualization using @remotion/media-utils
  if (element.type === 'audio-visualization' || element.type === 'real-audio-viz' || styleType === 'real-audio' || content.includes('real audio visualization')) {
    const elStyle = element.style as Record<string, unknown> | undefined;
    const audioSrc = elStyle?.audioSrc as string || elStyle?.src as string || '';
    const visualizationType = elStyle?.visualizationType as 'bars' | 'waveform' | 'circular' | 'spectrum' || 'bars';
    const numberOfSamples = elStyle?.numberOfSamples as number || 64;
    const color = elStyle?.color as string || colors[1] || '#3b82f6';
    
    if (audioSrc) {
      return (
        <div style={baseStyle}>
          <AudioVisualization
            audioSrc={audioSrc}
            visualizationType={visualizationType}
            numberOfSamples={numberOfSamples}
            color={color}
          />
        </div>
      );
    }
  }
  
  // Music Visualization bars (simulated)
  if (element.type === 'music-visualization' || styleType === 'music-bars' || content.includes('music visualization') || content.includes('audio bars')) {
    // Render audio visualization bars
    const bars = 64;
    const barWidth = (element.size?.width || 1920) / bars - 8;
    return (
      <div style={{ ...baseStyle, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, height: element.size?.height || 300 }}>
        {Array.from({ length: bars }).map((_, i) => {
          const barProgress = spring({ fps, frame: sceneFrame - i * 0.5, config: { damping: 20, stiffness: 100 } });
          const frequency = 0.05 + (i / bars) * 0.1;
          const amplitude = Math.sin(sceneFrame * frequency) * 0.5 + 0.5;
          const barHeight = interpolate(amplitude, [0, 1], [20, (element.size?.height || 300) - 50]) * barProgress;
          const hue = interpolate(i, [0, bars], [240, 320]);
          const lightness = interpolate(barHeight, [20, 250], [40, 70]);
          return (
            <div key={i} style={{ width: barWidth, height: barHeight, background: `hsl(${hue}, 80%, ${lightness}%)`, borderRadius: 4, boxShadow: `0 0 20px hsla(${hue}, 80%, ${lightness}%, 0.5)` }} />
          );
        })}
      </div>
    );
  }
  
  // TikTok-style captions with word highlighting
  if (element.type === 'tiktok-captions' || styleType === 'word-captions' || content.includes('caption') && content.includes('highlight')) {
    const captionStyle = element.style as Record<string, unknown> | undefined;
    const words = (element.content || '').split(' ');
    return (
      <div style={{ ...baseStyle, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 20 }}>
        {words.map((word, i) => {
          const wordDelay = i * 5;
          const wordProgress = spring({ fps, frame: Math.max(0, sceneFrame - wordDelay), config: { damping: 20, stiffness: 100 } });
          const scale = interpolate(wordProgress, [0, 1], [0.5, 1]);
          const opacity = interpolate(wordProgress, [0, 1], [0, 1]);
          const highlightProgress = interpolate(sceneFrame, [wordDelay, wordDelay + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const isHighlighted = highlightProgress > 0.5;
          return (
            <span key={i} style={{ fontSize: captionStyle?.fontSize as number || 48, fontWeight: 700, color: isHighlighted ? '#fbbf24' : 'white', opacity, transform: `scale(${scale})`, display: 'inline-block', fontFamily: 'Inter, system-ui, sans-serif', textShadow: isHighlighted ? '0 0 30px rgba(251, 191, 36, 0.8), 0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.5)' }}>
              {word}
            </span>
          );
        })}
      </div>
    );
  }
  
  // Year in Review stats counter
  if (element.type === 'stats-counter' || styleType === 'year-review' || content.includes('stats') || content.includes('counter')) {
    const statsStyle = element.style as Record<string, unknown> | undefined;
    const statValue = statsStyle?.value as number || 100;
    const statLabel = statsStyle?.label as string || element.content || 'Count';
    const statSuffix = statsStyle?.suffix as string || '';
    const statDelay = statsStyle?.delay as number || 30;
    
    const statProgress = spring({ fps, frame: Math.max(0, sceneFrame - statDelay), config: { damping: 25, stiffness: 80 } });
    const countProgress = interpolate(statProgress, [0, 1], [0, statValue], { easing: Easing.out(Easing.cubic) });
    const displayValue = Math.floor(countProgress);
    const statScale = interpolate(statProgress, [0, 1], [0.8, 1]);
    const statOpacity = interpolate(statProgress, [0, 1], [0, 1]);
    
    return (
      <div style={{ ...baseStyle, background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', padding: 40, borderRadius: 20, border: '1px solid rgba(255, 255, 255, 0.1)', transform: `${baseStyle.transform} scale(${statScale})`, opacity: statOpacity, boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)' }}>
        <div style={{ fontSize: 72, fontWeight: 900, background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 12, fontFamily: "'SF Mono', monospace" }}>
          {displayValue}{statSuffix}
        </div>
        <div style={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500, fontFamily: 'Inter, system-ui, sans-serif' }}>
          {statLabel}
        </div>
      </div>
    );
  }

  // Render based on element type
  switch (element.type) {
    case 'text':
      return wrapWithMotionBlur(<TextElement element={element} style={baseStyle} globalStyle={globalStyle} colors={colors} />);
    case 'shape':
      return wrapWithMotionBlur(<ShapeElement element={element} style={baseStyle} globalStyle={globalStyle} colors={colors} sceneFrame={sceneFrame} />);
    case 'image':
      return wrapWithMotionBlur(<ImageElement element={element} style={baseStyle} globalStyle={globalStyle} colors={colors} />);
    case 'audio':
      return <AudioElement element={element} />;
    case 'video':
      return wrapWithMotionBlur(<VideoElement element={element} style={baseStyle} />);
    case 'cursor':
      return wrapWithMotionBlur(<CursorElement element={element} style={baseStyle} sceneFrame={sceneFrame} fps={fps} />);
    case 'particle-field':
      // Render a field of animated particles
      const particleStyle = element.style as { count?: number; types?: ('circle' | 'star' | 'dot')[] };
      return (
        <ParticleField 
          count={particleStyle.count || 20} 
          colors={colors} 
          types={particleStyle.types}
        />
      );
    case 'path':
      // Render an animated SVG path
      const pathStyle = element.style as { stroke?: string; strokeWidth?: number; duration?: number; delay?: number };
      return (
        <AnimatedPath
          d={element.content}
          stroke={pathStyle.stroke || colors[1]}
          strokeWidth={pathStyle.strokeWidth || 2}
          duration={pathStyle.duration || 1}
          delay={pathStyle.delay || 0}
        />
      );
    default:
      return null;
  }
};

// ============================================================================
// AUDIO ELEMENT - Renders audio with volume control
// ============================================================================
const AudioElement: React.FC<{
  element: PlannedElement;
}> = ({ element }) => {
  const audioStyle = element.style as Record<string, unknown>;
  const content = element.content || '';
  
  // Get audio source from content or style
  const audioSrc = content.startsWith('http') || content.startsWith('data:') 
    ? content 
    : (audioStyle?.src as string) || '';
  
  if (!audioSrc) return null;
  
  return (
    <Audio 
      src={audioSrc} 
      volume={typeof audioStyle?.volume === 'number' ? audioStyle.volume : 1}
    />
  );
};

// ============================================================================
// VIDEO ELEMENT - Renders video using OffthreadVideo
// ============================================================================
const VideoElement: React.FC<{
  element: PlannedElement;
  style: React.CSSProperties;
}> = ({ element, style }) => {
  const videoStyle = element.style as Record<string, unknown>;
  const content = element.content || '';
  
  // Get video source from content or style
  const videoSrc = content.startsWith('http') || content.startsWith('data:') 
    ? content 
    : (videoStyle?.src as string) || '';
  
  if (!videoSrc) return null;
  
  const width = element.size?.width ? (element.size.width <= 100 ? `${element.size.width}%` : `${element.size.width}px`) : '640px';
  const height = element.size?.height ? (element.size.height <= 100 ? `${element.size.height}%` : `${element.size.height}px`) : '360px';
  
  return (
    <div
      style={{
        ...style,
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <OffthreadVideo
        src={videoSrc}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: (videoStyle?.borderRadius as number) || 12,
        }}
      />
    </div>
  );
};

// ============================================================================
// TEXT ELEMENT - Kinetic typography with gradients and font loading
// ============================================================================
const TextElement: React.FC<{
  element: PlannedElement;
  style: React.CSSProperties;
  globalStyle: VideoPlan['style'];
  colors: string[];
}> = React.memo(({ element, style, globalStyle, colors }) => {
  const textStyle = element.style as Record<string, unknown>;
  const content = element.content || '';
  
  // Use system fonts as fallback - don't block rendering for Google Fonts
  const fontFamily = (textStyle.fontFamily as string) || 'system-ui, -apple-system, sans-serif';
  
  // Detect if this is a headline or subtext
  const fontSize = (textStyle.fontSize as number) || 48;
  const isHeadline = fontSize >= 48;
  
  // Calculate text dimensions if size constraints exist
  const maxWidth = element.size?.width 
    ? (element.size.width <= 100 ? window.innerWidth * (element.size.width / 100) : element.size.width)
    : window.innerWidth * 0.8;
  
  let adjustedFontSize = fontSize;
  
  // Try to measure text, but don't block if it fails
  if (content) {
    try {
      const measurement = measureText({
        text: content,
        fontFamily,
        fontSize,
        fontWeight: String((textStyle.fontWeight as number) || (isHeadline ? 800 : 500)),
      });
      
      // Scale down if text is too wide
      if (measurement.width > maxWidth) {
        adjustedFontSize = fontSize * (maxWidth / measurement.width) * 0.95;
      }
    } catch (e) {
      // Fallback if measureText fails - just use original fontSize
      console.warn('measureText failed, using original fontSize:', e);
    }
  }
  
  // Gradient text for headlines
  const useGradient = isHeadline && !textStyle.color;
  
  return (
    <div
      style={{
        ...style,
        fontFamily: (textStyle.fontFamily as string) || fontFamily || globalStyle?.typography?.primary || 'Inter, system-ui, sans-serif',
        fontSize: adjustedFontSize,
        fontWeight: (textStyle.fontWeight as number) || (isHeadline ? 800 : 500),
        letterSpacing: isHeadline ? '-0.02em' : '0',
        lineHeight: 1.1,
        textAlign: 'center',
        maxWidth: `${maxWidth}px`,
        ...(useGradient
          ? {
              background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }
          : {
              color: (textStyle.color as string) || colors[0] || '#ffffff',
              textShadow: isHeadline ? '0 4px 30px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.2)',
            }),
      }}
    >
      {content}
    </div>
  );
});

// ============================================================================
// SHAPE ELEMENT - Glassmorphic cards and UI elements
// ============================================================================
const ShapeElement: React.FC<{
  element: PlannedElement;
  style: React.CSSProperties;
  globalStyle: VideoPlan['style'];
  colors: string[];
  sceneFrame: number;
}> = React.memo(({ element, style, globalStyle, colors, sceneFrame }) => {
  const shapeStyle = element.style as Record<string, unknown>;
  // NOTE: We intentionally do NOT render element.content as visible text for shapes.
  // Many plans use content as a semantic label (e.g. "Background", "Arrow", "UI Card")
  // which should not appear in the final video.
  const content = element.content || '';
  
  // Detect shape type from content/description
  const isCard = content.toLowerCase().includes('card') || content.toLowerCase().includes('ui');
  const isButton = content.toLowerCase().includes('button') || content.toLowerCase().includes('cta');
  const isDevice = content.toLowerCase().includes('phone') || content.toLowerCase().includes('device') || content.toLowerCase().includes('mockup');
  const isGlobe = content.toLowerCase().includes('globe') || content.toLowerCase().includes('world');
  
  // New: Detect @remotion/shapes types
  const isCircle = content.toLowerCase().includes('circle') || content.toLowerCase().includes('dot');
  const isRect = content.toLowerCase().includes('rect') || content.toLowerCase().includes('square');
  const isTriangle = content.toLowerCase().includes('triangle') || content.toLowerCase().includes('arrow');
  const isStar = content.toLowerCase().includes('star');
  const isPolygon = content.toLowerCase().includes('polygon') || content.toLowerCase().includes('hexagon');
  
  const width = element.size?.width ? (element.size.width <= 100 ? `${element.size.width}%` : `${element.size.width}px`) : '300px';
  const height = element.size?.height ? (element.size.height <= 100 ? `${element.size.height}%` : `${element.size.height}px`) : '200px';
  const borderRadius = (shapeStyle.borderRadius as number) || (globalStyle?.borderRadius) || 24;
  const shapeSize = typeof element.size?.width === 'number' ? element.size.width : 200;
  const shapeColor = (shapeStyle.color as string) || colors[1] || '#06b6d4';
  
  // Render using @remotion/shapes for geometric shapes with MOTION GRAPHICS FLOW
  // Using noise3D for organic, choreographed motion like prompt-to-motion-graphics template
  
  if (isCircle) {
    // Motion graphics: Add organic pulse and drift for "flow"
    const pulse = 1 + noise3D('circle-pulse-' + element.id, sceneFrame * 0.08, 0, 0) * 0.15;
    const driftX = noise3D('circle-drift-x-' + element.id, sceneFrame * 0.02, 0, 0) * 20;
    const driftY = noise3D('circle-drift-y-' + element.id, 0, sceneFrame * 0.02, 0) * 15;
    const rotateZ = noise3D('circle-rot-' + element.id, sceneFrame * 0.01, 0, 0) * 10;
    
    return (
      <div style={{
        ...style,
        transform: `${style.transform} translateX(${driftX}px) translateY(${driftY}px) scale(${pulse}) rotate(${rotateZ}deg)`,
      }}>
        <Circle
          radius={shapeSize / 2}
          fill={shapeColor}
          stroke={colors[0] || '#ffffff'}
          strokeWidth={2}
        />
      </div>
    );
  }
  
  if (isRect) {
    // Motion graphics: Rotating and scaling with organic feel
    const pulse = 1 + noise3D('rect-pulse-' + element.id, sceneFrame * 0.06, 0, 0) * 0.1;
    const rotateZ = noise3D('rect-rot-' + element.id, sceneFrame * 0.015, 0, 0) * 15;
    
    return (
      <div style={{
        ...style,
        transform: `${style.transform} scale(${pulse}) rotate(${rotateZ}deg)`,
      }}>
        <Rect
          width={shapeSize}
          height={shapeSize}
          fill={shapeColor}
          stroke={colors[0] || '#ffffff'}
          strokeWidth={2}
          cornerRadius={borderRadius}
        />
      </div>
    );
  }
  
  if (isTriangle) {
    // Motion graphics: Floating triangle with rotation
    const floatY = noise3D('tri-float-' + element.id, 0, 0, sceneFrame * 0.025) * 25;
    const rotateZ = noise3D('tri-rot-' + element.id, sceneFrame * 0.02, 0, 0) * 20;
    
    return (
      <div style={{
        ...style,
        transform: `${style.transform} translateY(${floatY}px) rotate(${rotateZ}deg)`,
      }}>
        <Triangle
          length={shapeSize}
          fill={shapeColor}
          stroke={colors[0] || '#ffffff'}
          strokeWidth={2}
          direction="up"
        />
      </div>
    );
  }
  
  if (isStar) {
    // Motion graphics: Pulsing, spinning star
    const pulse = 1 + noise3D('star-pulse-' + element.id, sceneFrame * 0.1, 0, 0) * 0.2;
    const spin = (sceneFrame * 0.5) % 360; // Continuous slow spin
    const glow = 0.5 + noise3D('star-glow-' + element.id, sceneFrame * 0.05, 0, 0) * 0.3;
    
    return (
      <div style={{
        ...style,
        transform: `${style.transform} scale(${pulse}) rotate(${spin}deg)`,
        filter: `drop-shadow(0 0 ${20 * glow}px ${shapeColor})`,
      }}>
        <Star
          points={5}
          innerRadius={shapeSize * 0.4}
          outerRadius={shapeSize}
          fill={shapeColor}
          stroke={colors[0] || '#ffffff'}
          strokeWidth={2}
        />
      </div>
    );
  }
  
  if (isPolygon) {
    // Motion graphics: Slow rotating polygon with breathing effect
    const breathe = 1 + noise3D('poly-breathe-' + element.id, sceneFrame * 0.04, 0, 0) * 0.12;
    const rotateZ = (sceneFrame * 0.3) % 360;
    
    return (
      <div style={{
        ...style,
        transform: `${style.transform} scale(${breathe}) rotate(${rotateZ}deg)`,
      }}>
        <Polygon
          points={6}
          radius={shapeSize / 2}
          fill={shapeColor}
          stroke={colors[0] || '#ffffff'}
          strokeWidth={2}
        />
      </div>
    );
  }
  
  // Glassmorphic card
  if (isCard) {
    return (
      <div
        style={{
          ...style,
          width,
          height,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius,
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        {/* intentionally no label text */}
      </div>
    );
  }
  
  // Button element
  if (isButton) {
    return (
      <div
        style={{
          ...style,
          padding: '16px 40px',
          background: `linear-gradient(135deg, ${colors[1]} 0%, ${colors[1]}dd 100%)`,
          borderRadius: 50,
          boxShadow: `0 10px 40px ${colors[1]}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{
          color: '#fff',
          fontSize: 18,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 600,
          letterSpacing: '-0.01em',
        }}>
          {content || 'Get Started'}
        </span>
      </div>
    );
  }
  
  // Device mockup (phone)
  if (isDevice) {
    return (
      <div
        style={{
          ...style,
          width: 280,
          height: 560,
          background: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)',
          borderRadius: 40,
          border: '3px solid #3a3a3a',
          boxShadow: '0 40px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          padding: 8,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Screen */}
        <div style={{
          flex: 1,
          background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 14,
            fontFamily: 'monospace',
          }}>
            App Screen
          </span>
        </div>
      </div>
    );
  }
  
  // Globe/World element
  if (isGlobe) {
    // Throttle rotation to every 4th frame for performance
    const throttledFrame = Math.floor(sceneFrame / 4) * 4;
    const rotation = throttledFrame * 0.5;
    return (
      <div
        style={{
          ...style,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `
            radial-gradient(circle at 30% 30%, ${colors[1]}40 0%, transparent 50%),
            radial-gradient(circle at 70% 70%, ${colors[1]}20 0%, transparent 50%),
            linear-gradient(135deg, #1e40af 0%, #0f172a 50%, #1e3a5f 100%)
          `,
          boxShadow: `
            0 0 100px ${colors[1]}30,
            inset -20px -20px 60px rgba(0,0,0,0.4),
            inset 20px 20px 60px rgba(255,255,255,0.1)
          `,
          transform: `${style.transform} rotateY(${rotation}deg)`,
        }}
      >
        {/* Grid lines */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.1)',
          background: `
            repeating-linear-gradient(0deg, transparent 0px, transparent 39px, rgba(255,255,255,0.05) 40px),
            repeating-linear-gradient(90deg, transparent 0px, transparent 39px, rgba(255,255,255,0.05) 40px)
          `,
        }} />
      </div>
    );
  }
  
  // Default shape - gradient filled
  const background = (shapeStyle.background as string) || 
    `linear-gradient(135deg, ${colors[1]}20 0%, ${colors[1]}10 100%)`;
  
  return (
    <div
      style={{
        ...style,
        width,
        height,
        background,
        borderRadius,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* intentionally no label text */}
    </div>
  );
});

// ============================================================================
// ARROW ELEMENT - Render a proper arrow icon instead of a label block
// ============================================================================
const ArrowElement: React.FC<{
  element: PlannedElement;
  style: React.CSSProperties;
  colors: string[];
}> = React.memo(({ element, style, colors }) => {
  const width = element.size?.width
    ? element.size.width <= 100
      ? `${element.size.width}%`
      : `${element.size.width}px`
    : '120px';
  const height = element.size?.height
    ? element.size.height <= 100
      ? `${element.size.height}%`
      : `${element.size.height}px`
    : '120px';

  const fill = ((element.style as Record<string, unknown>)?.background as string) || colors[1] || '#06b6d4';

  return (
    <div
      style={{
        ...style,
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 12h13"
          stroke={fill}
          strokeWidth={2.6}
          strokeLinecap="round"
        />
        <path
          d="M13 6l6 6-6 6"
          stroke={fill}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});

// ============================================================================
// IMAGE ELEMENT - Renders actual images with cinematic effects
// Ken Burns effect, parallax, and depth for cinematic feel
// ============================================================================
const ImageElement: React.FC<{
  element: PlannedElement;
  style: React.CSSProperties;
  globalStyle: VideoPlan['style'];
  colors: string[];
}> = React.memo(({ element, style, colors }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const content = element.content || '';
  const imageStyle = element.style as Record<string, unknown>;
  
  // Detect if content is a URL
  const isUrl = content.startsWith('http') || content.startsWith('data:');
  const imageUrl = isUrl ? content : (imageStyle?.src as string) || '';
  
  const width = element.size?.width ? (element.size.width <= 100 ? `${element.size.width}%` : `${element.size.width}px`) : '300px';
  const height = element.size?.height ? (element.size.height <= 100 ? `${element.size.height}%` : `${element.size.height}px`) : '200px';
  
  // Ken Burns effect - subtle zoom and pan for cinematic feel
  const enableKenBurns = imageStyle?.kenBurns === true;
  const kenBurnsProgress = interpolate(
    frame,
    [0, durationInFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Use deterministic seed for consistent random values
  const panDirection = random(`kb-pan-${element.id}`) > 0.5 ? 1 : -1;
  const zoomStart = 1 + random(`kb-zoom-start-${element.id}`) * 0.05;
  const zoomEnd = zoomStart + 0.08 + random(`kb-zoom-end-${element.id}`) * 0.04;
  
  const kenBurnsScale = enableKenBurns 
    ? interpolate(kenBurnsProgress, [0, 1], [zoomStart, zoomEnd], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1;
  const kenBurnsPanX = enableKenBurns 
    ? interpolate(kenBurnsProgress, [0, 1], [0, panDirection * 3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;
  const kenBurnsPanY = enableKenBurns 
    ? interpolate(kenBurnsProgress, [0, 1], [0, random(`kb-pan-y-${element.id}`) * 2 - 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;
  
  // Floating effect using noise for organic motion
  const floatY = noise3D(`img-float-${element.id}`, 0, frame * 0.008, 0) * 4;
  const floatRotate = noise3D(`img-rot-${element.id}`, frame * 0.005, 0, 0) * 1.5;
  
  // Depth-based parallax (elements with higher z move more)
  const zIndex = element.position?.z || 1;
  const parallaxMultiplier = 1 + (zIndex * 0.02);
  
  // If we have a valid image URL, render the actual image with cinematic effects
  if (imageUrl) {
    return (
      <div
        style={{
          ...style,
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          transform: `${style.transform} translateY(${floatY}px) rotate(${floatRotate}deg)`,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            borderRadius: (imageStyle?.borderRadius as number) || 16,
            boxShadow: (imageStyle?.boxShadow as string) || '0 25px 50px rgba(0,0,0,0.35)',
          }}
        >
          <Img
            src={imageUrl}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: (imageStyle?.filter as string) || 'brightness(1.05) contrast(1.02)',
              transform: `scale(${kenBurnsScale * parallaxMultiplier}) translate(${kenBurnsPanX}%, ${kenBurnsPanY}%)`,
            }}
          />
        </div>
        
        {/* Subtle vignette overlay on image */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: (imageStyle?.borderRadius as number) || 16,
            background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.15) 100%)',
            pointerEvents: 'none',
          }}
        />
      </div>
    );
  }
  
  // Fallback: placeholder if no URL - show loading state or content description
  return (
    <div
      style={{
        ...style,
        width,
        height,
        background: `linear-gradient(135deg, ${colors[1]}20 0%, ${colors[2]}40 100%)`,
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transform: `${style.transform} translateY(${floatY}px)`,
      }}
    >
      {/* Animated loading shimmer */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(90deg, transparent 0%, ${colors[1]}10 50%, transparent 100%)`,
          animation: 'shimmer 2s infinite',
          transform: `translateX(${(frame % 120) / 120 * 200 - 100}%)`,
        }}
      />
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" opacity="0.4">
        <rect x="3" y="3" width="18" height="18" rx="3" stroke="white" strokeWidth="1.5" />
        <circle cx="8.5" cy="8.5" r="1.5" fill="white" />
        <path d="M3 16l5-5 3 3 5-5 5 5v3a3 3 0 01-3 3H6a3 3 0 01-3-3v-1z" fill="white" opacity="0.5" />
      </svg>
    </div>
  );
});

// ============================================================================
// CURSOR ELEMENT - Animated cursor with click effect
// ============================================================================
const CursorElement: React.FC<{
  element: PlannedElement;
  style: React.CSSProperties;
  sceneFrame: number;
  fps: number;
}> = React.memo(({ element, style, sceneFrame, fps }) => {
  const anim = element.animation as AnimationPattern | undefined;
  
  // Smooth cursor movement using spring
  const moveProgress = spring({
    fps,
    frame: sceneFrame,
    config: { damping: 40, stiffness: 80, mass: 0.6 },
  });
  
  let cursorX = element.position?.x ?? 50;
  let cursorY = element.position?.y ?? 50;
  
  if (anim?.properties) {
    if (anim.properties.x && Array.isArray(anim.properties.x)) {
      const xValues = anim.properties.x as number[];
      // Ensure we only use 2 values for interpolation (start and end)
      const xRange = xValues.length >= 2 ? [xValues[0], xValues[xValues.length - 1]] : xValues;
      cursorX = interpolate(moveProgress, [0, 1], xRange);
    }
    if (anim.properties.y && Array.isArray(anim.properties.y)) {
      const yValues = anim.properties.y as number[];
      // Ensure we only use 2 values for interpolation (start and end)
      const yRange = yValues.length >= 2 ? [yValues[0], yValues[yValues.length - 1]] : yValues;
      cursorY = interpolate(moveProgress, [0, 1], yRange);
    }
  }
  
  // Click animation
  const clickFrame = fps * 1.5;
  const clickScale = interpolate(
    sceneFrame,
    [clickFrame, clickFrame + 5, clickFrame + 10],
    [1, 0.85, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const clickRipple = interpolate(
    sceneFrame,
    [clickFrame, clickFrame + 20],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <>
      {/* Click ripple effect */}
      {clickRipple > 0 && clickRipple < 1 && (
        <div
          style={{
            position: 'absolute',
            left: `${cursorX}%`,
            top: `${cursorY}%`,
            width: 60 * clickRipple,
            height: 60 * clickRipple,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.5)',
            transform: 'translate(-50%, -50%)',
            opacity: 1 - clickRipple,
            zIndex: 99,
          }}
        />
      )}
      
      {/* Cursor */}
      <div
        style={{
          position: 'absolute',
          left: `${cursorX}%`,
          top: `${cursorY}%`,
          transform: `translate(-30%, -10%) scale(${clickScale})`,
          zIndex: 100,
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path
            d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.86a.5.5 0 0 0-.85.35Z"
            fill="#fff"
            stroke="#000"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </>
  );
});

export default DynamicVideo;

// Core video generation types

export interface VideoPattern {
  id: string;
  name: string;
  duration: number;
  fps: 30 | 60;
  resolution: { width: number; height: number };
  scenes: ScenePattern[];
  globalStyles: GlobalStyles;
}

export interface ScenePattern {
  id: string;
  startTime: number;
  duration: number;
  description: string;
  composition: {
    layout: 'center' | 'split' | 'grid' | 'full';
    layers: Layer[];
  };
  animations: AnimationPattern[];
  transition: TransitionPattern | null;
}

export interface Layer {
  type: 'text' | 'image' | 'shape' | 'video' | 'audio' | 'cursor';
  position: { x: number; y: number; z: number };
  size: { width: number; height: number };
  style: Record<string, unknown>;
  animation?: string;
}

export interface AnimationPattern {
  name: string;
  type: 'fade' | 'slide' | 'scale' | 'rotate' | 'custom';
  duration: number;
  easing: string;
  delay: number;
  properties: Record<string, unknown>;
}

export interface TransitionPattern {
  type: 'cut' | 'fade' | 'slide' | 'wipe' | 'zoom';
  duration: number;
}

export interface GlobalStyles {
  colorPalette: string[];
  typography: {
    primary: string;
    secondary: string;
    sizes: Record<string, number>;
  };
  spacing: number;
  borderRadius: number;
}

export interface VideoPlan {
  id: string;
  duration: number;
  fps: 30;
  resolution: { width: number; height: number };
  aspectRatio?: 'landscape' | 'portrait' | 'square'; // NEW: Support for different aspect ratios
  scenes: PlannedScene[];
  requiredAssets: AssetRequirement[];
  style: GlobalStyles;
  captions?: CaptionData[]; // NEW: Support for captions
}

export interface PlannedScene {
  id: string;
  startTime: number;
  duration: number;
  description: string;
  elements: PlannedElement[];
  animations: AnimationPattern[];
  transition: TransitionPattern | null;
  voiceover?: string; // NEW: Support for voiceover text
}

export interface PlannedElement {
  id: string;
  type: 
    | 'text' 
    | 'image' 
    | 'shape' 
    | 'cursor' 
    | 'video' 
    | 'audio' 
    | 'code-editor' 
    | 'progress-bar' 
    | 'terminal' 
    | 'laptop' 
    | '3d-card' 
    | 'caption'
    | 'particle-field'
    | 'path'
    | 'lottie'
    | 'phone-mockup'
    | 'logo-grid'
    | 'data-viz'
    | 'chart'
    | 'audio-visualization'
    | 'real-audio-viz'
    | 'music-visualization'
    | 'tiktok-captions'
    | 'stats-counter'
    | 'progress';
  content: string;
  position: { x: number; y: number; z: number };
  size: { width: number; height: number };
  style: Record<string, unknown>;
  animation?: AnimationPattern;
}

// NEW: Caption data structure
export interface CaptionData {
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
  style?: 'tiktok' | 'simple' | 'minimal'; // Caption style
}

export interface AssetRequirement {
  id: string;
  type: 'image' | 'icon' | 'background' | 'video' | 'audio';
  description: string;
  specifications: {
    width: number;
    height: number;
    style: string;
  };
  providedByUser: boolean;
  userAssetUrl?: string;
}

export interface UserRequest {
  prompt: string;
  duration?: number;
  referencePatternId?: string;
  assets?: Record<string, string>;
}

export type VideoStatus = 'pending' | 'analyzing' | 'generating_assets' | 'generating_code' | 'rendering' | 'completed' | 'failed';

export interface VideoProject {
  id: string;
  prompt: string;
  plan: VideoPlan | null;
  generated_code: string | null;
  status: VideoStatus;
  reference_pattern_id: string | null;
  preview_url: string | null;
  final_video_url: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface StoredPattern {
  id: string;
  name: string;
  pattern: VideoPattern;
  thumbnail_url: string | null;
  created_at: string;
}

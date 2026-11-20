export type EmitterShape = 'point' | 'circle' | 'ring' | 'line' | 'box';
export type ParticleShape = 'circle' | 'square' | 'spark' | 'ring' | 'star' | 'triangle';
export type EmissionMode = 'continuous' | 'burst';
export type ColorMode = 'gradient' | 'palette';
export type BlendMode = 'source-over' | 'lighter';

export type CodeOutputFormat = 'class' | 'function' | 'html';
export type CanvasBackground = 'obsidian' | 'slate' | 'light' | 'checker';
export type InteractionMode = 'cursor' | 'center' | 'drag' | 'playtest';

export interface ParticleConfig {
  emitterShape: EmitterShape;
  emitterRadius: number;
  emissionMode: EmissionMode;
  rate: number;
  burstCount: number;
  angle: number;
  spread: number;
  speedMin: number;
  speedMax: number;
  lifeMin: number;
  lifeMax: number;
  sizeStart: number;
  sizeEnd: number;
  sizeVariance: number;
  opacityStart: number;
  opacityEnd: number;
  gravityX: number;
  gravityY: number;
  drag: number;
  turbulence: number;
  rotationSpeed: number;
  shape: ParticleShape;
  blendMode: BlendMode;
  colorMode: ColorMode;
  colorStart: string;
  colorMid: string;
  colorEnd: string;
  palette: string[];
}

export interface ParticlePreset {
  id: string;
  name: string;
  category: string;
  config: ParticleConfig;
}

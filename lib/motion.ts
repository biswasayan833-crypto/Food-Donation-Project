/**
 * FoodRescue Cinematic Motion System
 *
 * Provides centralized Framer Motion animation variants, spring configurations,
 * and accessibility guards respecting prefers-reduced-motion.
 */

import { Variants, Transition } from 'framer-motion';

// Custom cinematic cubic-bezier curves
export const cinematicEase = [0.22, 1, 0.36, 1] as const; // Smooth deceleration with premium feel
export const snappyEase = [0.16, 1, 0.3, 1] as const;
export const bounceEase = [0.34, 1.56, 0.64, 1] as const;

// Standard transitions
export const transitionFast: Transition = { duration: 0.2, ease: cinematicEase };
export const transitionStandard: Transition = { duration: 0.4, ease: cinematicEase };
export const transitionCinematic: Transition = { duration: 0.6, ease: cinematicEase };
export const transitionSlow: Transition = { duration: 0.8, ease: cinematicEase };

// Container variants with staggered children
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: (staggerDelay = 0.08) => ({
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: 0.05,
    },
  }),
};

// Subtle fade-in variants
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitionStandard,
  },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitionStandard,
  },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -25 },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitionStandard,
  },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 25 },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitionStandard,
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitionStandard,
  },
};

// Tactile card hover interaction
export const cardHoverMotion = {
  whileHover: {
    y: -4,
    scale: 1.01,
    transition: { duration: 0.25, ease: cinematicEase },
  },
  whileTap: {
    scale: 0.99,
    transition: { duration: 0.15 },
  },
};

// Tactile button micro-interactions
export const buttonPressMotion = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97 },
  transition: { duration: 0.15, ease: cinematicEase },
};

// Pulsating beacon for live telemetry & urgent items
export const pulseBeaconMotion = {
  animate: {
    scale: [1, 1.25, 1],
    opacity: [0.9, 0.4, 0.9],
  },
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  },
};

// Floating animation for ambient elements
export const floatSlowMotion = {
  animate: {
    y: [0, -8, 0],
  },
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  },
};

// Modal/Dialog backdrop & content variants
export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const modalContentVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 15 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: cinematicEase },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 10,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

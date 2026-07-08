// Delta Gold - Image Pool for Command Responses
// 12 images with random rotation across all 335 commands
// © 2025 Mcamara

const DELTA_GOLD_IMAGES = [
  'https://cdn.jsdelivr.net/gh/voirrien4-arch/goldcrew-images@main/images/1783104006949-1000046777.jpg',
  'https://cdn.jsdelivr.net/gh/voirrien4-arch/goldcrew-images@main/images/1783104783748-1000046785.jpg',
  'https://cdn.jsdelivr.net/gh/voirrien4-arch/goldcrew-images@main/images/1783104783927-1000046786.jpg',
  'https://raw.githubusercontent.com/voirrien4-arch/goldcrew-images/main/images/1783104783823-1000046788.jpg',
  'https://raw.githubusercontent.com/voirrien4-arch/goldcrew-images/main/images/1783104783876-1000046789.jpg',
  'https://raw.githubusercontent.com/voirrien4-arch/goldcrew-images/main/images/1783104783860-1000046790.jpg',
  'https://raw.githubusercontent.com/voirrien4-arch/goldcrew-images/main/images/1783104784003-1000046791.jpg',
  'https://raw.githubusercontent.com/voirrien4-arch/goldcrew-images/main/images/1783104783991-1000046792.jpg',
  'https://raw.githubusercontent.com/voirrien4-arch/goldcrew-images/main/images/1783104784019-1000046025.png',
  'https://cdn.jsdelivr.net/gh/voirrien4-arch/goldcrew-images@main/images/1783104784019-1000046025.png',
  'https://raw.githubusercontent.com/voirrien4-arch/goldcrew-images/main/images/1783105289638-1000038508.jpg',
  'https://raw.githubusercontent.com/voirrien4-arch/goldcrew-images/main/images/1783105323258-1000038507.jpg',
  'https://raw.githubusercontent.com/voirrien4-arch/goldcrew-images/main/images/1783105357135-1000039999.jpg',
];

/**
 * Get a random image URL from the pool.
 * Each call returns a different random image.
 */
export function getRandomImage() {
  return DELTA_GOLD_IMAGES[Math.floor(Math.random() * DELTA_GOLD_IMAGES.length)];
}

/**
 * Get all image URLs (for client-side usage).
 */
export function getAllImages() {
  return [...DELTA_GOLD_IMAGES];
}

/**
 * Total number of images in the pool.
 */
export const IMAGE_COUNT = DELTA_GOLD_IMAGES.length;

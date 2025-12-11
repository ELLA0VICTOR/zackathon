/**
 * General utility helpers for Zackathon
 * Date formatting, validation, data transformation, etc.
 */

import { ethers } from 'ethers';

/**
 * Format date for display
 * @param {number | Date} timestamp - Unix timestamp or Date object
 * @returns {string} Formatted date string
 */
export function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  
  const date = typeof timestamp === 'number' 
    ? new Date(timestamp * 1000) 
    : new Date(timestamp);
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format date and time separately
 * @param {number | Date} timestamp - Unix timestamp or Date object
 * @returns {{date: string, time: string}}
 */
export function formatDateTime(timestamp) {
  if (!timestamp) return { date: 'N/A', time: 'N/A' };
  
  const date = typeof timestamp === 'number' 
    ? new Date(timestamp * 1000) 
    : new Date(timestamp);
  
  return {
    date: date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }),
    time: date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  };
}

/**
 * Get time remaining until deadline
 * @param {number} deadline - Unix timestamp
 * @returns {string} Human-readable time remaining
 */
export function getTimeRemaining(deadline) {
  if (!deadline) return 'Unknown';
  
  const now = Math.floor(Date.now() / 1000);
  const deadlineTimestamp = typeof deadline === 'bigint' ? Number(deadline) : deadline;
  const diff = deadlineTimestamp - now;
  
  if (diff <= 0) return 'Ended';
  
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Check if deadline has passed
 * @param {number} deadline - Unix timestamp
 * @returns {boolean} True if deadline passed
 */
export function hasDeadlinePassed(deadline) {
  if (!deadline) return false;
  
  const now = Math.floor(Date.now() / 1000);
  const deadlineTimestamp = typeof deadline === 'bigint' ? Number(deadline) : deadline;
  
  return now >= deadlineTimestamp;
}

/**
 * Get deadline status
 * @param {number} deadline - Unix timestamp
 * @returns {{passed: boolean, remaining: string, color: string}}
 */
export function getDeadlineStatus(deadline) {
  const passed = hasDeadlinePassed(deadline);
  const remaining = getTimeRemaining(deadline);
  
  let color = 'green';
  if (passed) {
    color = 'red';
  } else {
    const now = Math.floor(Date.now() / 1000);
    const deadlineTimestamp = typeof deadline === 'bigint' ? Number(deadline) : deadline;
    const diff = deadlineTimestamp - now;
    
    if (diff < 3600) color = 'red';
    else if (diff < 86400) color = 'yellow';
  }
  
  return { passed, remaining, color };
}

/**
 * Format address for display (0x1234...5678)
 * @param {string} address - Full Ethereum address
 * @param {number} chars - Number of chars to show on each side
 * @returns {string} Formatted address
 */
export function formatAddress(address, chars = 4) {
  if (!address) return '';
  if (!ethers.isAddress(address)) return address;
  return `${address.substring(0, chars + 2)}...${address.substring(42 - chars)}`;
}

/**
 * Validate Ethereum address
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid
 */
export function isValidAddress(address) {
  if (!address) return false;
  return ethers.isAddress(address);
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
export function isValidUrl(url) {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format hackathon status for display
 * @param {number} status - Status enum value (0-3)
 * @returns {{label: string, color: string}}
 */
export function formatHackathonStatus(status) {
  const statusMap = {
    0: { label: 'Registration Open', color: 'blue' },
    1: { label: 'Submissions Open', color: 'green' },
    2: { label: 'Judging', color: 'yellow' },
    3: { label: 'Completed', color: 'gray' }
  };
  
  return statusMap[status] || { label: 'Unknown', color: 'gray' };
}

/**
 * Calculate score percentage
 * @param {number} score - Raw score
 * @param {number} maxScore - Maximum possible score (default: 50)
 * @returns {number} Percentage (0-100)
 */
export function scoreToPercentage(score, maxScore = 50) {
  if (!score || score === 0) return 0;
  return Math.round((score / maxScore) * 100);
}

/**
 * Calculate average score from judges
 * @param {number[]} scores - Array of judge scores
 * @returns {number} Average score
 */
export function calculateAverageScore(scores) {
  if (!Array.isArray(scores) || scores.length === 0) return 0;
  const sum = scores.reduce((acc, score) => acc + score, 0);
  return Math.round(sum / scores.length);
}

/**
 * Sort submissions by score (descending)
 * @param {Array} submissions - Array of submission objects with score property
 * @returns {Array} Sorted submissions
 */
export function sortByScore(submissions) {
  if (!Array.isArray(submissions)) return [];
  return [...submissions].sort((a, b) => (b.score || 0) - (a.score || 0));
}

/**
 * Get ranking badge for position
 * @param {number} position - Position (1, 2, 3)
 * @returns {{emoji: string, label: string, color: string}}
 */
export function getRankingBadge(position) {
  const badges = {
    1: { emoji: '🥇', label: '1st Place', color: 'gold' },
    2: { emoji: '🥈', label: '2nd Place', color: 'silver' },
    3: { emoji: '🥉', label: '3rd Place', color: 'bronze' }
  };
  
  return badges[position] || { emoji: '🏆', label: `${position}th Place`, color: 'gray' };
}

/**
 * Format ETH amount for display
 * @param {string | bigint} wei - Amount in wei
 * @param {number} decimals - Number of decimal places (default: 4)
 * @returns {string} Formatted ETH amount
 */
export function formatEth(wei, decimals = 4) {
  if (!wei) return '0 ETH';
  try {
    const eth = ethers.formatEther(wei);
    return `${parseFloat(eth).toFixed(decimals)} ETH`;
  } catch {
    return '0 ETH';
  }
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @param {number} baseDelay - Base delay in ms (default: 1000)
 * @returns {Promise<any>} Result of function
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, i);
      console.warn(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
      await sleep(delay);
    }
  }
}

/**
 * Parse BigInt safely
 * @param {any} value - Value to parse
 * @returns {bigint | null} Parsed BigInt or null
 */
export function parseBigInt(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return value;
  
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

/**
 * Convert timestamp to Date object
 * @param {number | bigint} timestamp - Unix timestamp
 * @returns {Date | null} Date object or null
 */
export function timestampToDate(timestamp) {
  if (!timestamp) return null;
  
  const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
  
  if (ts > 10000000000) {
    return new Date(ts);
  } else {
    return new Date(ts * 1000);
  }
}

/**
 * Check if browser supports required features
 * @returns {{supported: boolean, missing: string[]}}
 */
export function checkBrowserSupport() {
  const missing = [];
  
  if (!window.ethereum) missing.push('MetaMask');
  if (!window.crypto) missing.push('Web Crypto API');
  if (!navigator.clipboard) missing.push('Clipboard API');
  if (!window.TextEncoder) missing.push('TextEncoder');
  
  return {
    supported: missing.length === 0,
    missing
  };
}

/**
 * Generate random ID
 * @param {number} length - Length of ID (default: 8)
 * @returns {string} Random ID
 */
export function generateId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
import { MessageCircle, Send, Search, ThumbsUp, Music2, Camera, Bird, Mail } from 'lucide-react';

export const countries = [
  { name: 'USA', flag: '🇺🇸', price: '$2.99' },
  { name: 'United Kingdom', flag: '🇬🇧', price: '$3.49' },
  { name: 'Canada', flag: '🇨🇦', price: '$2.99' },
  { name: 'Nigeria', flag: '🇳🇬', price: '$1.99' },
  { name: 'Ghana', flag: '🇬🇭', price: '$1.99' },
  { name: 'India', flag: '🇮🇳', price: '$0.99' },
  { name: 'Germany', flag: '🇩🇪', price: '$3.29' },
  { name: 'France', flag: '🇫🇷', price: '$3.29' },
  { name: 'Australia', flag: '🇦🇺', price: '$2.99' },
  { name: 'UAE', flag: '🇦🇪', price: '$4.99' },
  { name: 'Sweden', flag: '🇸🇪', price: '$3.49' },
  { name: 'Japan', flag: '🇯🇵', price: '$4.99' }
];

export const services = [
  { name: 'WhatsApp', icon: MessageCircle, desc: 'WhatsApp verification' },
  { name: 'Telegram', icon: Send, desc: 'Telegram verification' },
  { name: 'Google', icon: Search, desc: 'Google verification' },
  { name: 'Facebook', icon: ThumbsUp, desc: 'Facebook verification' },
  { name: 'TikTok', icon: Music2, desc: 'TikTok verification' }
];

export const socialAccounts = [
  { platform: 'Instagram', icon: Camera, price: '$8.99', desc: 'Aged Instagram account, ready to use' },
  { platform: 'Twitter / X', icon: Bird, price: '$7.49', desc: 'Aged X (Twitter) account' },
  { platform: 'Facebook', icon: ThumbsUp, price: '$6.99', desc: 'Verified-ready Facebook profile' },
  { platform: 'TikTok', icon: Music2, price: '$9.99', desc: 'TikTok account with starter followers' },
  { platform: 'Gmail', icon: Mail, price: '$4.99', desc: 'Verified Gmail account' }
];

export function generateOrderId() {
  return 'SBM-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
}

// Placeholder virtual number — swap for the real number from the order API after payment integration
function generateVirtualNumber() {
  const number = '+' + Math.floor(100 + Math.random() * 800) + Math.floor(1000000000 + Math.random() * 8999999999);
  return { purchasedNumber: number, status: 'Active' };
}

// Placeholder account credentials — swap for real delivered credentials after payment integration
function generateAccountCredentials(platform) {
  const handle = platform.toLowerCase().replace(/[^a-z]/g, '') + Math.floor(1000 + Math.random() * 9000);
  return {
    username: handle + '@demoinbox.com',
    password: 'Demo#' + Math.random().toString(36).slice(-8),
    recoveryInfo: 'recovery-' + handle + '@demoinbox.com (placeholder)',
    status: 'Delivered'
  };
}

export function buildOrderData(product, email) {
  const now = new Date();
  const base = {
    orderId: generateOrderId(),
    productName: product.productName,
    platformService: product.platformService,
    country: product.country,
    purchaseDate: now.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    email,
    type: product.type
  };

  if (product.type === 'virtual_number') {
    return { ...base, ...generateVirtualNumber() };
  }
  return { ...base, ...generateAccountCredentials(product.platformService) };
}

export function buildReceiptText(order) {
  const lines = [
    'SPENCERSBM — ORDER RECEIPT',
    '================================',
    `Order ID: ${order.orderId}`,
    `Product Name: ${order.productName}`,
    `Platform/Service: ${order.platformService}`,
    order.country ? `Country: ${order.country}` : null,
    `Purchase Date & Time: ${order.purchaseDate}`,
    `Customer Email: ${order.email}`,
    '',
    'YOUR PURCHASE',
    '--------------------------------'
  ].filter(Boolean);

  if (order.type === 'virtual_number') {
    lines.push(
      `Purchased Number: ${order.purchasedNumber}`,
      `Country: ${order.country}`,
      `Service: ${order.platformService}`,
      `Status: ${order.status}`
    );
  } else {
    lines.push(
      `Platform: ${order.platformService}`,
      `Username/Email: ${order.username}`,
      `Password: ${order.password}`,
      `Recovery Information: ${order.recoveryInfo}`,
      `Status: ${order.status}`
    );
  }

  lines.push('', 'Thank you for your purchase!', 'support@spencersbm.com');
  return lines.join('\n');
}
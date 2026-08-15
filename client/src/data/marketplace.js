import { ThumbsUp, Music2, Camera, Bird, Mail, UserRound } from 'lucide-react';

export const countries = [
  { name: 'USA', flag: '🇺🇸' },
  { name: 'United Kingdom', flag: '🇬🇧' },
  { name: 'Canada', flag: '🇨🇦' },
  { name: 'Nigeria', flag: '🇳🇬' },
  { name: 'Ghana', flag: '🇬🇭' },
  { name: 'India', flag: '🇮🇳' },
  { name: 'Germany', flag: '🇩🇪' },
  { name: 'France', flag: '🇫🇷' },
  { name: 'Netherlands', flag: '🇳🇱' },
  { name: 'Spain', flag: '🇪🇸' },
  { name: 'Austria', flag: '🇦🇹' },
  { name: 'Belgium', flag: '🇧🇪' },
  { name: 'Australia', flag: '🇦🇺' },
  { name: 'UAE', flag: '🇦🇪' },
  { name: 'Sweden', flag: '🇸🇪' },
  { name: 'Japan', flag: '🇯🇵' }
];

// Reference icon map for known social platforms (used in the dashboard + admin).
export const socialAccounts = [
  { platform: 'Instagram', icon: Camera },
  { platform: 'Twitter / X', icon: Bird },
  { platform: 'Facebook', icon: ThumbsUp },
  { platform: 'TikTok', icon: Music2 },
  { platform: 'Gmail', icon: Mail }
];

export function platformIcon(platform) {
  const match = socialAccounts.find(
    (a) => platform.toLowerCase().includes(a.platform.toLowerCase())
  );
  return match ? match.icon : UserRound;
}
import atlanticFoodCenterLogo from '@/assets/atlantic_food_center.jpeg';
import atlanticStationLogo from '@/assets/atlantic_station.jpeg';

export const BRAND_LOGOS = {
  default: atlanticFoodCenterLogo,
  foodCenter: atlanticFoodCenterLogo,
  station: atlanticStationLogo,
} as const;

export type BrandLogoVariant = keyof typeof BRAND_LOGOS;

export function getSubsidiaryLogo(slug: string): string {
  if (slug === 'station') return BRAND_LOGOS.station;
  return BRAND_LOGOS.default;
}

export function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/jpeg';
  link.href = href;
}

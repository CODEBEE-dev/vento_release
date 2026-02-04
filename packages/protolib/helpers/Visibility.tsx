export const shouldShowInArea = (item: any, area: string): boolean => {
  const visibility = item?.visibility;
  if (!visibility) return true;
  const arr = Array.isArray(visibility)
    ? visibility
    : String(visibility).split(',').map(v => v.trim());
  const vis = arr.map(v => v.toLowerCase());

  if (vis.includes('*')) return true;
  if (vis.includes(area.toLowerCase())) return true;
  return false;
};

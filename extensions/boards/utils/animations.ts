export function scrollToAndHighlight(
    element,
    {
        duration = 1200,
        block = 'center',
        color = 'rgba(250, 204, 21, 0.5)', // amber
        ring = 10, // width of the halo ring
    }: {
        duration?: number;
        block?: ScrollLogicalPosition;
        color?: string;
        ring?: number;
    } = {}
) {
    if (!element) return;

    // Respect reduced motion preference
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Scroll to the target
    element.scrollIntoView({ behavior: 'smooth', block, inline: 'nearest' });

    // Cancel previous animations
    element.getAnimations?.().forEach(a => a.cancel());

    if (reduce) return; // 

    // Optimize rendering during the animation
    const prevWillChange = element.style.willChange;
    element.style.willChange = 'transform, box-shadow, background-color';

    const bg = getComputedStyle(element).backgroundColor || 'transparent';

    // 1) Pop + halo (box-shadow) — appear and disappear
    const halo = element.animate(
        [
            { transform: 'scale(0.98)', boxShadow: `0 0 0 0 ${color}`, offset: 0 },
            { transform: 'scale(1)', boxShadow: `0 0 0 ${ring}px ${color}`, offset: 0.35 },
            { transform: 'scale(1)', boxShadow: 'none', offset: 1 }
        ],
        { duration, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'none' }
    );

    // 2) Wash background subtly (tint and return to original color)
    const wash = element.animate(
        [
            { backgroundColor: mixWithAlpha(bg, color, 0.25) },
            { backgroundColor: bg }
        ],
        { duration, easing: 'ease-out', fill: 'none' }
    );

    const cleanup = () => { element.style.willChange = prevWillChange; };
    halo.addEventListener('finish', cleanup);
    halo.addEventListener('cancel', cleanup);
    wash.addEventListener('finish', cleanup);
    wash.addEventListener('cancel', cleanup);
}

// Utility to mix two colors with a given alpha for the overlay
function mixWithAlpha(base: string, overlay: string, alpha = 0.25) {
    // Assume base is in rgb/rgba(...) and overlay is in rgba(...) or rgb(...).
    // If something fails, we return overlay with the desired alpha.
    try {
        const toRGBA = (c: string) => {
            const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
            if (!m) return null;
            return { r: +m[1], g: +m[2], b: +m[3], a: m[4] ? +m[4] : 1 };
        };
        const b = toRGBA(base);
        const o = toRGBA(overlay) || toRGBA(colorToRgba(overlay));
        if (!b || !o) return overlay.replace(/rgba?\(/, 'rgba(').replace(/\)$/, `, ${alpha})`);
        const a = alpha;
        const r = Math.round(o.r * a + b.r * (1 - a));
        const g = Math.round(o.g * a + b.g * (1 - a));
        const h = Math.round(o.b * a + b.b * (1 - a));
        return `rgba(${r}, ${g}, ${h}, 1)`;
    } catch {
        return overlay.replace(/rgba?\(/, 'rgba(').replace(/\)$/, `, ${alpha})`);
    }
}

// Convert hex color to rgba format
function colorToRgba(c: string) {
    if (c.startsWith('#')) {
        const hex = c.length === 4
            ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`
            : c;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, 1)`;
    }
    return c; // if already rgb/rgba/hsl supported by browser
}
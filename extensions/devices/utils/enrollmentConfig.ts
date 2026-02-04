/**
 * Enrollment Configuration Utilities
 *
 * Determines whether devices should auto-enroll based on platform-specific
 * and global environment variable configuration.
 */

/**
 * Checks if a device platform should auto-enroll or require manual approval
 *
 * Resolution order:
 * 1. Check DEVICE_AUTO_ENROLL (global override)
 * 2. Check {PLATFORM}_AUTO_ENROLL (platform-specific)
 * 3. Default: false (manual approval required)
 *
 * @param platform - Device platform name (e.g., 'esphome', 'arduino', 'desktop')
 * @returns true if devices should auto-enroll, false if manual approval required
 *
 * @example
 * // .env configuration:
 * // ESPHOME_AUTO_ENROLL=false
 * // DESKTOP_AUTO_ENROLL=true
 * // DEVICE_AUTO_ENROLL=false  # Global override
 *
 * shouldAutoEnroll('esphome')  // false (from DEVICE_AUTO_ENROLL)
 * shouldAutoEnroll('desktop')  // false (from DEVICE_AUTO_ENROLL)
 *
 * // Without global override:
 * shouldAutoEnroll('esphome')  // false (from ESPHOME_AUTO_ENROLL)
 * shouldAutoEnroll('desktop')  // true (from DESKTOP_AUTO_ENROLL)
 * shouldAutoEnroll('arduino')  // false (default)
 */
export function shouldAutoEnroll(platform: string): boolean {
  // 1. Check global override
  const global = process.env.DEVICE_AUTO_ENROLL
  if (global !== undefined) {
    return global === 'true'
  }

  // 2. Check platform-specific
  const envVar = `${platform.toUpperCase()}_AUTO_ENROLL`
  const platformConfig = process.env[envVar]
  if (platformConfig !== undefined) {
    return platformConfig === 'true'
  }

  // 3. Default: manual approval required
  return false
}

/**
 * Illustration — re-export of the design-system contour illustration set so
 * page code can import every primitive from `components/ui`.
 *
 *   <Illustration name="cleared" size={128} />
 *   <ContourField className="absolute inset-0" animate />
 */
export { default, ILLUSTRATION_NAMES } from '../../design-system/illustrations/Illustration'
export type { IllustrationName, IllustrationProps } from '../../design-system/illustrations/Illustration'
export { ContourField } from '../../design-system/illustrations/ContourField'
export type { ContourFieldProps } from '../../design-system/illustrations/ContourField'

/**
 * Destructive row actions in admin tables: revealed on row hover / keyboard
 * focus, always visible on touch screens (no hover there).
 *   <tr className="group"> … <button className={`${ROW_ACTION} …`}>Revoke</button>
 */
export const ROW_ACTION =
  'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-micro ease-out'

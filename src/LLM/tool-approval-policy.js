/**
 * Determine whether a gated tool must wait for an explicit owner confirmation.
 * @param {string} name
 * @param {{isAdmin?: boolean}|null} context
 * @param {boolean} confirmed
 * @param {string[]} gatedTools
 * @param {string[]} adminConfirmTools
 * @returns {boolean}
 */
export function requiresAdminConfirmation(name, context, confirmed, gatedTools, adminConfirmTools) {
    if (confirmed || !gatedTools.includes(name)) return false;
    return !context?.isAdmin || adminConfirmTools.includes(name);
}

/**
 * Copy text to clipboard with fallback for mobile/older browsers.
 *
 * `navigator.clipboard.writeText()` requires a secure context and can fail
 * on mobile browsers when the async call loses the user-gesture context.
 * The fallback uses a temporary `<textarea>` + `document.execCommand('copy')`,
 * which has broader support and stays within the synchronous event handler.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for browsers that don't support the Clipboard API
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'
  document.body.appendChild(textarea)
  textarea.select()

  try {
    const success = document.execCommand('copy')
    return success
  } catch {
    return false
  } finally {
    document.body.removeChild(textarea)
  }
}

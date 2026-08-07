/**
 * Yields control back to the main thread, allowing the browser to render frames
 * and process user input before continuing execution.
 */
export function yieldToMain(): Promise<void> {
    return new Promise(resolve => {
        if (typeof window.requestIdleCallback !== "undefined") {
            window.requestIdleCallback(() => resolve());
        } else {
            setTimeout(resolve, 0);
        }
    });
}

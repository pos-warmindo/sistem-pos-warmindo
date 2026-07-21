/**
 * Helper to safely extract an error message from a caught unknown error
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  
  if (typeof err === "string") {
    return err;
  }
  
  return "Terjadi kesalahan internal";
}

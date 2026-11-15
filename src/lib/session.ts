// Session boundary: auth is an httpOnly cookie the backend owns; the frontend's one
// duty is wiping the react-query cache so one account's data never renders for the next.
import { clearSaved, queryClient } from "./queryClient";
import { apiPost } from "./api";

// Call after every successful login/signup.
export function beginSession(): void {
  queryClient.clear();
  clearSaved();
}

// Call from every sign-out control; the hard redirect resets all in-memory state.
export async function endSession(redirectTo: string = "/login"): Promise<void> {
  try {
    await apiPost("/auth/logout");
  } finally {
    queryClient.clear();
    clearSaved();
    window.location.assign(redirectTo);
  }
}

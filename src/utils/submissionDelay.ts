import { ApiError, sessionVersion } from '../api/client';

/** Show the loading state before submitting within the current session. */
export async function waitForSubmissionFeedback(): Promise<void> {
  const version = sessionVersion();
  await new Promise<void>(resolve => setTimeout(resolve, 350));
  if (sessionVersion() !== version) throw new ApiError(409, 'Workspace changed');
}

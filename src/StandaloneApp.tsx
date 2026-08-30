import App from "./App";
import { getSession, restoreSession } from "./solid/solidSession";

export default function StandaloneApp() {
  return (
    <App
      standaloneSession={getSession()}
      restoreStandaloneSession={restoreSession}
    />
  );
}

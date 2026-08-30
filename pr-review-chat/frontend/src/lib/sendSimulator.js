// Fake "send to backend" flow for Module 1.
//
// Cycles through the placeholder status messages on a timer, then resolves
// with the next canned reply. No network — this stands in for the real
// request that a later module will wire up.

const STEP_MS = 800;

export function runSendSimulation({ statusMessages, reply, onStatusStep, onComplete }) {
  let step = 0;
  const timers = [];

  // Advance the status line every STEP_MS. Stop on the last message and hold
  // it until the reply "arrives".
  for (let i = 1; i < statusMessages.length; i += 1) {
    timers.push(
      setTimeout(() => {
        step = i;
        onStatusStep(step);
      }, STEP_MS * i)
    );
  }

  const totalMs = STEP_MS * statusMessages.length;

  timers.push(
    setTimeout(() => {
      onComplete(reply);
    }, totalMs)
  );

  // Caller can abort (e.g. on unmount) to avoid setting state after teardown.
  return function cancel() {
    timers.forEach(clearTimeout);
  };
}

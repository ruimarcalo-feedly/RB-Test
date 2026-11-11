/**
 * What the report page shows while the flow is waiting on the person rather
 * than writing (versions C and D).
 *
 * A grey-scale skeleton of the elicitation card, laid out like Figma's
 * `ElicitationComponent` (badge, question and helper, three single-choice
 * options, Continue), plays out answering a question on a loop: the first
 * option is selected, Continue is pressed and turns into a check, and the card
 * settles back to start again. It points at the chat, where the question
 * actually is, without looking like a loader.
 */
const OPTIONS = [128, 172, 92];

export function WaitAnimation() {
  return (
    /* Laid over the page; the inner part stays centred in view as it scrolls. */
    <div className="wait-overlay">
      <div className="wait-anim" role="status">
        <div className="wa-card" aria-hidden="true">
          <div className="wa-head">
            <div className="wa-top">
              <span className="wa-bar wa-badge" />
            </div>
            <div className="wa-label">
              <span className="wa-line l24">
                <span className="wa-bar wa-title" />
              </span>
              <span className="wa-line l16">
                <span className="wa-bar wa-help" />
              </span>
            </div>
          </div>
          <div className="wa-inputs">
            {OPTIONS.map((w, i) => (
              <div className={`wa-opt ${i === 0 ? "pick" : ""}`} key={i}>
                <span className="wa-radio" />
                <span className="wa-line l20">
                  <span className="wa-bar wa-opt-text" style={{ width: w }} />
                </span>
              </div>
            ))}
          </div>
          <div className="wa-foot">
            <div className="wa-btn">
              <span className="wa-bar wa-btn-label" />
              <svg viewBox="0 0 16 16" className="wa-btn-check">
                <path d="M3.5 8.4 6.6 11.4 12.5 4.8" />
              </svg>
            </div>
          </div>
        </div>
        <div className="wa-msg">
          Waiting for your answers
          <span className="wa-dots" aria-hidden="true">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </div>
      </div>
    </div>
  );
}

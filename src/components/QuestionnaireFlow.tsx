import { useEffect, useRef, useState } from "react";
import { CATEGORY_META, QUESTIONS } from "../data/questionnaire";
import { questionnaireComplete } from "../domain/scoring";
import { UI_COPY } from "../i18n";
import type { AnswerMap, AppLanguage } from "../types";
import Icon from "./Icon";

export default function QuestionnaireFlow({
  language,
  onCancel,
  onComplete,
}: {
  language: AppLanguage;
  onCancel: () => void;
  onComplete: (answers: AnswerMap) => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [showHint, setShowHint] = useState(false);
  const [validationVisible, setValidationVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const question = QUESTIONS[index];
  const category = CATEGORY_META[question.category];
  const selected = answers[question.id];
  const finalQuestion = index === QUESTIONS.length - 1;
  const answeredCount = QUESTIONS.filter((item) => Boolean(answers[item.id])).length;
  const complete = questionnaireComplete(answers);
  const sharedCopy = UI_COPY[language];

  useEffect(() => {
    headingRef.current?.focus();
    const navigation = navigationRef.current;
    const activeQuestionButton = navigation
      ? navigation.querySelector<HTMLElement>(`[data-question-index="${index}"]`)
      : null;
    if (navigation && activeQuestionButton) {
      navigation.scrollLeft = Math.max(
        0,
        activeQuestionButton.offsetLeft - (navigation.clientWidth - activeQuestionButton.offsetWidth) / 2
      );
    }
    setShowHint(false);
    setValidationVisible(false);
  }, [index]);

  const advance = () => {
    if (!selected) {
      setValidationVisible(true);
      return;
    }
    if (complete) {
      if (submitted) return;
      setSubmitted(true);
      try {
        onComplete(answers);
      } catch (error) {
        setSubmitted(false);
        throw error;
      }
      return;
    }

    if (finalQuestion) {
      const firstUnansweredIndex = QUESTIONS.findIndex((item) => !answers[item.id]);
      if (firstUnansweredIndex >= 0) setIndex(firstUnansweredIndex);
      return;
    }

    setIndex((current) => current + 1);
  };

  const copy = language === "de"
    ? {
        progress: `Frage ${index + 1} von ${QUESTIONS.length}`,
        info: "Warum wird das gefragt?",
        infoText: "Diese Antwort fließt ausschließlich mit 0 bis 3 Punkten in die angezeigte Kategorie ein. Sie ist keine medizinische Diagnose.",
        back: "Zurück",
        next: "Weiter",
        finish: "Auswerten",
        required: "Wähle eine Antwort aus, um fortzufahren.",
        cancel: "Fragebogen schließen",
        answeredCount: `${answeredCount} von ${QUESTIONS.length} beantwortet`,
        navigation: "Fragen auswählen",
        answered: "beantwortet",
        unanswered: "noch nicht beantwortet",
        goToQuestion: (questionNumber: number) => `Zu Frage ${questionNumber} von ${QUESTIONS.length}`,
      }
    : {
        progress: `Question ${index + 1} of ${QUESTIONS.length}`,
        info: "Why is this asked?",
        infoText: "This answer only contributes 0 to 3 points to the displayed category. It is not a medical diagnosis.",
        back: "Back",
        next: "Continue",
        finish: "Evaluate",
        required: "Choose an answer to continue.",
        cancel: "Close questionnaire",
        answeredCount: `${answeredCount} of ${QUESTIONS.length} answered`,
        navigation: "Choose a question",
        answered: "answered",
        unanswered: "not answered yet",
        goToQuestion: (questionNumber: number) => `Go to question ${questionNumber} of ${QUESTIONS.length}`,
      };

  return (
    <section
      className="shq-questionnaire"
      style={{ "--category-accent": category.accent } as React.CSSProperties}
      aria-labelledby="shq-question-title"
    >
      <header className="shq-questionnaire__header">
        <div>
          <span className="shq-questionnaire__brand">{sharedCopy.shortName}</span>
          <span className="shq-questionnaire__progress-copy">{copy.progress}</span>
        </div>
        <button type="button" className="shq-icon-button" onClick={onCancel} aria-label={copy.cancel}><Icon name="close" /></button>
      </header>
      <div className="shq-questionnaire__progress" role="progressbar" aria-label={copy.progress} aria-valuemin={1} aria-valuemax={QUESTIONS.length} aria-valuenow={index + 1}>
        <span style={{ width: `${((index + 1) / QUESTIONS.length) * 100}%` }} />
      </div>

      <div className="shq-questionnaire__body">
        <div className={`shq-questionnaire__content${question.id === "movement-active-days" ? " shq-questionnaire__content--wide" : ""}`}>
          <div className="shq-questionnaire__category">
            <span><Icon name={category.icon} /></span>
            <strong>{category.label[language]}</strong>
            <button type="button" onClick={() => setShowHint((current) => !current)} aria-expanded={showHint} aria-label={copy.info}><Icon name="info" /></button>
          </div>
          {showHint && <p className="shq-questionnaire__hint" role="note">{copy.infoText}</p>}
          <h1 id="shq-question-title" ref={headingRef} tabIndex={-1}>{question.prompt[language]}</h1>
          <fieldset className="shq-answers">
            <legend className="shq-sr-only">{question.prompt[language]}</legend>
            {question.options.map((answer) => (
              <label key={answer.id} className={selected === answer.id ? "is-selected" : ""}>
                <input
                  type="radio"
                  name={question.id}
                  value={answer.id}
                  checked={selected === answer.id}
                  onChange={() => {
                    setAnswers((current) => ({ ...current, [question.id]: answer.id }));
                    setValidationVisible(false);
                  }}
                />
                <span className="shq-answers__control" aria-hidden="true"><Icon name="check" /></span>
                <span>{answer.label[language]}</span>
              </label>
            ))}
          </fieldset>
          {validationVisible && <p className="shq-form-error" role="alert">{copy.required}</p>}
        </div>
      </div>

      <footer className="shq-questionnaire__footer">
        <div className="shq-questionnaire__actions">
          <button
            className="shq-button shq-button--ghost"
            type="button"
            disabled={index === 0}
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
          >
            <Icon name="arrow-left" /> {copy.back}
          </button>
          <button className="shq-button shq-button--primary" type="button" disabled={!selected || submitted} onClick={advance}>
            {complete ? copy.finish : copy.next} <Icon name="arrow-right" />
          </button>
        </div>
        <div className="shq-questionnaire__navigation">
          <span className="shq-questionnaire__answered-count" aria-live="polite">{copy.answeredCount}</span>
          <nav ref={navigationRef} className="shq-questionnaire__dots" aria-label={copy.navigation}>
            {QUESTIONS.map((item, itemIndex) => {
              const answered = Boolean(answers[item.id]);
              const active = itemIndex === index;

              return (
                <button
                  key={item.id}
                  type="button"
                  data-question-index={itemIndex}
                  className={`${active ? "is-active" : ""}${answered ? " is-complete" : ""}`.trim()}
                  style={{ "--question-accent": CATEGORY_META[item.category].accent } as React.CSSProperties}
                  aria-current={active ? "step" : undefined}
                  aria-label={`${copy.goToQuestion(itemIndex + 1)}, ${answered ? copy.answered : copy.unanswered}`}
                  onClick={() => setIndex(itemIndex)}
                />
              );
            })}
          </nav>
        </div>
      </footer>
    </section>
  );
}

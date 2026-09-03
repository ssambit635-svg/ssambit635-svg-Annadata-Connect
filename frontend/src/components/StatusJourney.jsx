import { useI18n } from '../i18n/I18nContext.jsx';
import Icon from './Icon.jsx';
import { JOURNEY, formatDate } from '../utils/format.js';

// Visual "procurement journey": Request Submitted → Token → Waiting → Called → Processing → Completed.
export function StatusJourney({ request }) {
  const { t, lang } = useI18n();
  const labels = t('farmer.journeySteps');
  const doneSet = new Set((request.timeline || []).map((x) => x.status));
  const terminal = ['CANCELLED', 'REJECTED'].includes(request.status);

  return (
    <ol className="journey">
      {JOURNEY.map((step, i) => {
        const entry = (request.timeline || []).find((x) => x.status === step);
        const done = doneSet.has(step) || (step === 'COMPLETED' && request.status === 'COMPLETED');
        const isCurrent = !done && !terminal && currentStepIndex(request) === i;
        return (
          <li key={step} className={done ? 'done' : isCurrent ? 'current' : 'pending'}>
            <span className="node" aria-hidden>{done ? <Icon name="check" size={13} strokeWidth={3} /> : i + 1}</span>
            <div>
              <div className="name">{labels[i]}</div>
              {entry && <div className="at">{formatDate(entry.at, lang)}</div>}
            </div>
          </li>
        );
      })}
      {terminal && (
        <li className="done">
          <span className="node" style={{ background: 'var(--c-danger)', borderColor: 'var(--c-danger)', color: '#fff' }}><Icon name="x" size={13} strokeWidth={3} /></span>
          <div>
            <div className="name">{t(`status.${request.status}`)}</div>
            {request.note && <div className="at">{request.note}</div>}
          </div>
        </li>
      )}
    </ol>
  );
}

function currentStepIndex(request) {
  const order = { WAITING: 2, CALLED: 3, PROCESSING: 4 };
  if (request.status in order) return order[request.status];
  if (request.status === 'PENDING') return 1;
  return 1;
}

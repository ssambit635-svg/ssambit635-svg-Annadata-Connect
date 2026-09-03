import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { answer } from '../assistant/brain.js';

// Controlled FAQ assistant — rule-based, answers only intent questions
// present in the approved FAQ dictionary. See src/assistant/brain.js.
export function AssistantWidget() {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ from: 'bot', text: t('assistant.greeting') }]);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages, open]);

  function send(text) {
    const q = (text ?? input).trim();
    if (!q) return;
    const reply = answer(q, lang) || t('assistant.fallback');
    setMessages((m) => [...m, { from: 'user', text: q }, { from: 'bot', text: reply }]);
    setInput('');
  }

  if (!open) {
    return (
      <button className="assistant-fab" onClick={() => setOpen(true)} aria-label={t('assistant.title')}>
        <Icon name="chat" size={16} /> {t('assistant.fab')}
      </button>
    );
  }

  const chips = t('assistant.chips');
  return (
    <div className="assistant-panel" role="dialog" aria-label={t('assistant.title')}>
      <div className="assistant-head">
        <div>
          <div style={{ fontWeight: 700 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}><Icon name="wheat" size={18} /> {t('assistant.title')}</span></div>
          <div className="sub">{t('assistant.subtitle')}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label={t('common.close')}aria-hidden="true">
          <Icon name="x" size={16} />
        </button>
      </div>
      <div className="assistant-body" ref={bodyRef}>
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.from}`}>
            {m.text}
          </div>
        ))}
        <div className="chips">
          {Array.isArray(chips) &&
            chips.map((c) => (
              <button key={c} onClick={() => send(c)}>
                {c}
              </button>
            ))}
        </div>
      </div>
      <form
        className="assistant-input"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('assistant.placeholder')}
          aria-label={t('assistant.placeholder')}
        />
        <button className="btn btn-primary" type="submit">
          {t('assistant.send')}
        </button>
      </form>
    </div>
  );
}

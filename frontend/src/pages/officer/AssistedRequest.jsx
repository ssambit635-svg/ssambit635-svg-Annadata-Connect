import { useEffect, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { officerService, referenceService } from '../../services/api/farmerService.js';
import { formatInr } from '../../utils/format.js';

// Assisted mode: staff creates a token for a farmer who walked in without a smartphone.
export default function AssistedRequest() {
  const { t, pick } = useI18n();
  const [crops, setCrops] = useState([]);
  const [form, setForm] = useState({ farmerPhone: '', farmerName: '', cropId: '', quantity: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    referenceService.crops().then((d) => setCrops(d.crops)).catch(() => {});
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!/^[6-9]\d{9}$/.test(form.farmerPhone.trim())) return setError({ message: t('auth.phonePlaceholder') });
    if (form.farmerName.trim().length < 2) return setError({ message: t('auth.name') });
    const q = Number(form.quantity);
    if (!form.cropId || !q || q < 1 || q > 500) return setError({ message: t('farmer.quantityHint') });
    setBusy(true);
    try {
      const data = await officerService.assistedRequest({
        farmerPhone: form.farmerPhone.trim(),
        farmerName: form.farmerName.trim(),
        cropId: form.cropId,
        quantityQuintals: q,
      });
      setDone(data.request);
      setForm({ farmerPhone: '', farmerName: '', cropId: '', quantity: '' });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page narrow" style={{ margin: '0 auto', padding: 0 }}>
      <h1>{t('officer.assistedTitle')}</h1>
      <p style={{ color: 'var(--c-text-soft)' }}>{t('officer.assistedHint')}</p>

      {done && (
        <div className="card" style={{ borderColor: 'var(--c-primary)', textAlign: 'center' }}>
          <div className="big-check" aria-hidden><Icon name="checkCircle" size={44} strokeWidth={1.5} /></div>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.2rem 0' }} className="mono">{done.tokenNumber}</p>
          <p style={{ margin: 0 }}>{done.farmer?.name} · {pick(done.crop, 'name')} · {done.quantityQuintals} {t('common.quintalShort')}</p>
        </div>
      )}

      <form className="card" onSubmit={onSubmit} noValidate>
        {error && <div className="form-banner error">{error.message}</div>}
        <div className="field">
          <label htmlFor="fp">{t('officer.assistedPhone')}</label>
          <input id="fp" className="input" inputMode="numeric" maxLength={10} value={form.farmerPhone}
            onChange={(e) => setForm((f) => ({ ...f, farmerPhone: e.target.value.replace(/\D/g, '') }))} />
        </div>
        <div className="field">
          <label htmlFor="fn">{t('officer.assistedName')}</label>
          <input id="fn" className="input" value={form.farmerName} onChange={(e) => setForm((f) => ({ ...f, farmerName: e.target.value }))} />
        </div>
        <div className="field">
          <label htmlFor="ac">{t('farmer.selectCrop')}</label>
          <select id="ac" className="select" value={form.cropId} onChange={(e) => setForm((f) => ({ ...f, cropId: e.target.value }))}>
            <option value="">{t('farmer.selectCrop')}</option>
            {crops.map((c) => (
              <option key={c.id} value={c.id}>{pick(c, 'name')} — {formatInr(c.mspPerQuintal)}/{t('common.quintalShort')}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="aq">{t('farmer.enterQuantity')}</label>
          <input id="aq" className="input" type="number" min="1" max="500" value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? t('farmer.generatingToken') : (<><Icon name="ticket" size={16} /> {t('officer.assistedSubmit')}</>)}
        </button>
        <p className="hint" style={{ fontSize: '0.85rem', marginTop: '0.75rem' }}>{t('officer.assistedNote')}</p>
      </form>
    </div>
  );
}

// Assisted entry — the officer creates a token on behalf of a farmer
// who walked in without a smartphone.
import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { referenceService, officerService } from '../../services/api/farmerService.js';
import { formatInr } from '../../utils/format.js';
import Icon from '../../components/Icon.jsx';
import { ArtFarmer, ArtSuccess } from '../art.jsx';
import { MCard, MBtn, MField, MInput, MSelect, MOption, MStepper, MLoader } from '../ui.jsx';

export default function OfficerAssisted() {
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
    <div className="m-stagger">
      <MCard plain className="gold">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <ArtFarmer size={84} className="m-anim-bob" />
          <div>
            <h2 style={{ fontSize: 18, fontFamily: 'var(--m-f-display)' }}>{t('officer.assistedTitle')}</h2>
            <p style={{ fontSize: 13, color: 'var(--m-ink-soft)' }}>{t('officer.assistedHint')}</p>
          </div>
        </div>
      </MCard>

      {done && (
        <MCard plain className="green" style={{ textAlign: 'center' }}>
          <ArtSuccess size={86} className="m-anim-pop" style={{ margin: '0 auto 4px' }} />
          <div className="m-display" style={{ fontSize: 42, fontWeight: 800, color: '#fff' }}>{done.tokenNumber}</div>
          <p style={{ color: '#cfe2cd', fontSize: 14 }}>
            {done.farmer?.name} · {pick(done.crop, 'name')} · {done.quantityQuintals} {t('common.quintalShort')}
          </p>
        </MCard>
      )}

      <MCard plain>
        {error && <div className="m-banner error" role="alert" style={{ marginBottom: 12 }}><Icon name="alertTriangle" size={17} />{error.message}</div>}
        <form onSubmit={onSubmit}>
          <MField label={t('officer.assistedPhone')} htmlFor="as-phone">
            <MInput
              id="as-phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.farmerPhone}
              onChange={(e) => setForm((f) => ({ ...f, farmerPhone: e.target.value.replace(/\D/g, '') }))}
            />
          </MField>
          <MField label={t('officer.assistedName')} htmlFor="as-name">
            <MInput id="as-name" value={form.farmerName} onChange={(e) => setForm((f) => ({ ...f, farmerName: e.target.value }))} />
          </MField>
          <MField label={t('farmer.selectCrop')}>
            {crops.length === 0 ? (
              <MLoader />
            ) : (
              <div className="m-crop-grid">
                {crops.map((c) => (
                  <MOption
                    key={c.id}
                    selected={form.cropId === c.id}
                    onSelect={() => setForm((f) => ({ ...f, cropId: c.id }))}
                    title={pick(c, 'name')}
                    sub={`${formatInr(c.mspPerQuintal)} / ${t('common.quintalShort')} MSP`}
                  />
                ))}
              </div>
            )}
          </MField>
          <MField label={t('farmer.enterQuantity')}>
            <MStepper value={form.quantity} onChange={(v) => setForm((f) => ({ ...f, quantity: v }))} />
          </MField>
          <MBtn block type="submit" disabled={busy} icon={<Icon name="ticket" size={18} />}>
            {busy ? t('farmer.generatingToken') : t('officer.assistedSubmit')}
          </MBtn>
          <p style={{ fontSize: 12, color: 'var(--m-ink-faint)', marginTop: 10, textAlign: 'center' }}>{t('officer.assistedNote')}</p>
        </form>
      </MCard>
    </div>
  );
}

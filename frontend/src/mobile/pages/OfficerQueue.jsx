// Live queue — the counter view: call, start, complete, reject.
import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { officerService } from '../../services/api/farmerService.js';
import Icon from '../../components/Icon.jsx';
import { ArtQueue } from '../art.jsx';
import { MCard, MLoader, MError, MEmpty, MBadge, MBtn } from '../ui.jsx';

export default function OfficerQueue() {
  const { t, pick } = useI18n();
  const { data, error, loading, reload, refreshing } = usePoll(() => officerService.queue(), { intervalMs: 10000 });
  const [busyId, setBusyId] = useState(null);

  if (loading) return <MLoader />;
  if (error) return <MError error={error} onRetry={reload} />;

  async function act(id, action) {
    setBusyId(id);
    try {
      await officerService.updateStatus(id, action);
      await reload();
    } catch (e) {
      window.alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="m-stagger">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="m-live">{t('officer.currentQueue')}</span>
        <button type="button" className="m-chip" onClick={reload} disabled={refreshing}>
          <Icon name="refresh" size={14} /> {t('common.refresh')}
        </button>
      </div>
      <p style={{ fontSize: 13.5, color: 'var(--m-ink-soft)', marginTop: -6 }}>{pick(data.centre, 'name')}</p>

      {data.queue.length === 0 ? (
        <MEmpty art={<ArtQueue size={110} className="m-anim-bob" />} title={t('officer.noPending')} />
      ) : (
        data.queue.map((r) => (
          <MCard key={r.id} plain tight>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className={`m-row-ico ${r.status === 'WAITING' ? 'gold' : 'blue'}`}>#{r.position}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong style={{ fontFamily: 'var(--m-f-display)', fontSize: 16.5, color: 'var(--m-green-forest)' }}>{r.tokenNumber}</strong>
                  <MBadge status={r.status} />
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--m-ink-soft)', marginTop: 2 }}>
                  {r.farmer?.name} · {r.farmer?.phone}
                </div>
                <div style={{ fontSize: 13, color: 'var(--m-ink-soft)' }}>
                  {pick(r.crop, 'name')} · {r.quantityQuintals} {t('common.quintalShort')}
                </div>
              </div>
            </div>
            <div className="m-btn-row" style={{ marginTop: 10 }}>
              {r.status === 'WAITING' && (
                <MBtn size="sm" variant="primary" disabled={busyId === r.id} onClick={() => act(r.id, 'CALL')} icon={<Icon name="megaphone" size={15} />}>
                  {t('officer.call')}
                </MBtn>
              )}
              {r.status === 'CALLED' && (
                <>
                  <MBtn size="sm" variant="primary" disabled={busyId === r.id} onClick={() => act(r.id, 'START')}>{t('officer.start')}</MBtn>
                  <MBtn size="sm" variant="danger" disabled={busyId === r.id} onClick={() => act(r.id, 'REJECT')}>{t('officer.reject')}</MBtn>
                </>
              )}
              {r.status === 'PROCESSING' && (
                <MBtn size="sm" variant="gold" disabled={busyId === r.id} onClick={() => act(r.id, 'COMPLETE')} icon={<Icon name="check" size={15} strokeWidth={2.8} />}>
                  {t('officer.complete')}
                </MBtn>
              )}
            </div>
          </MCard>
        ))
      )}
    </div>
  );
}

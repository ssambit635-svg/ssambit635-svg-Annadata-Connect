import { useI18n } from '../../i18n/I18nContext.jsx';
import { usePoll } from '../../hooks/usePoll.js';
import { farmerService } from '../../services/api/farmerService.js';
import { Loading, ErrorState } from '../../components/States.jsx';
import Icon from '../../components/Icon.jsx';
import { formatDate } from '../../utils/format.js';

export default function IdCardPage() {
  const { t, lang } = useI18n();
  const { data, error, reload } = usePoll(() => farmerService.idCard());

  if (error) return <ErrorState error={error} onRetry={reload} />;
  const card = data;
  if (!card) return <Loading label={t('common.loading')} />;

  const cropName = (c) => (lang === 'hi' ? c.nameHi : c.nameEn);

  return (
    <div className="idcard-page">
      <div className="page-head no-print">
        <h1><Icon name="idCard" size={24} /> {t('idCard.title')}</h1>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Icon name="print" size={17} /> {t('idCard.print')}
        </button>
      </div>
      <p className="no-print" style={{ color: 'var(--c-text-soft)', marginTop: '-0.6rem', marginBottom: '1.2rem' }}>
        {t('idCard.hint')}
      </p>

      {/* The printable card (CR80-style landscape) */}
      <div className="idcard-sheet">
        <div className="idcard">
          <div className="idc-strip" aria-hidden="true"><span /><span /><span /></div>
          <div className="idc-head">
            <span className="idc-mark" aria-hidden="true"><Icon name="wheat" size={22} strokeWidth={2} /></span>
            <div className="idc-title">
              <strong>{lang === 'hi' ? 'अन्नदाता कनेक्ट' : 'Annadata Connect'}</strong>
              <span>{lang === 'hi' ? 'किसान पहचान पत्र' : 'Farmer ID Card'}</span>
            </div>
            <div className="idc-gov">{t('idCard.govLine')}</div>
          </div>

          <div className="idc-body">
            <div className="idc-photo" aria-hidden="true">
              <Icon name="user" size={40} strokeWidth={1.4} />
            </div>
            <div className="idc-fields">
              <div className="idc-name">{card.name}</div>
              <div className="idc-row"><span>{t('idCard.farmerId')}</span><strong className="mono">{card.farmerId}</strong></div>
              <div className="idc-row"><span>{t('idCard.mobile')}</span><strong>{card.phone}</strong></div>
              <div className="idc-row">
                <span>{t('idCard.village')}</span>
                <strong>{card.village ? cropName(card.village) : '—'} · {card.district}</strong>
              </div>
              <div className="idc-crops">
                <span>{t('idCard.crops')}</span>
                <div className="idc-chips">
                  {card.crops.length === 0 && <em>{t('idCard.noCrops')}</em>}
                  {card.crops.map((c) => <span className="idc-chip" key={c.id}>{cropName(c)}</span>)}
                </div>
              </div>
            </div>
            <div className="idc-qr">
              <img src={card.qrDataUrl} alt={t('idCard.qrAlt')} />
              <small>{t('idCard.qrCaption')}</small>
            </div>
          </div>

          <div className="idc-foot">
            <span>{t('landing.helpline')} 155266</span>
            <span>{t('idCard.issued')} {card.registeredAt ? formatDate(card.registeredAt, lang) : '—'}</span>
          </div>
        </div>
      </div>

      <p className="fine-print no-print" style={{ marginTop: '1rem', maxWidth: 640 }}>
        {t('idCard.printNote')}
      </p>
    </div>
  );
}

import { Component } from 'react';
import Icon from './Icon.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

function CrashScreen() {
  const { t } = useI18n();
  return (
    <div className="crash-screen">
      <div className="crash-card">
        <span className="crash-mark" aria-hidden="true">
          <Icon name="wheat" size={30} strokeWidth={2} />
        </span>
        <h1>{t('common.crashTitle')}</h1>
        <p>{t('common.crashBody')}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          <Icon name="refresh" size={16} /> {t('common.reload')}
        </button>
      </div>
    </div>
  );
}

// Last-resort guard: any render error anywhere in the app shows a branded
// recovery screen instead of a white page.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[annadata-connect] render error:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) return <CrashScreen />;
    return this.props.children;
  }
}

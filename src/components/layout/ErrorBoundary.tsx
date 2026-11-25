import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('KupiKM greška:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="login-screen">
          <div className="login-panel" style={{ textAlign: 'center' }}>
            <div className="login-brand">
              Kupi<span>KM</span>
            </div>
            <p style={{ margin: 0 }}>Došlo je do greške u prikazu.</p>
            <p className="muted" style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem' }}>
              {this.state.error.message}
            </p>
            <button
              type="button"
              className="btn btn-action"
              onClick={() => {
                this.setState({ error: null });
                window.location.assign('/');
              }}
            >
              Vrati se na početnu
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

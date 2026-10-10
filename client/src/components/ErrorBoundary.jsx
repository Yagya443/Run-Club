import { Component } from 'react';
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e) { console.error(e); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="mx-auto max-w-md p-8"><h1 className="text-2xl font-bold">Something broke on this screen</h1><p className="mt-2 text-stone">Your saved runs are safe. Reload to try again.</p><button className="btn-primary mt-4" onClick={() => window.location.assign('/')}>Reload</button></main>;
  }
}

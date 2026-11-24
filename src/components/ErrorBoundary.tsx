import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'अप्रत्याशित त्रुटि हुई।' };
  }

  render() {
    if (this.state.hasError) {
      let readableMessage = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message) as { error?: string; path?: string };
        if (parsed.error) {
          readableMessage = `${parsed.error}${parsed.path ? ` (${parsed.path})` : ''}`;
        }
      } catch {
        // Not JSON
      }

      return (
        <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-amber-200 rounded-2xl p-8 shadow-sm text-center">
            <h2 className="text-2xl font-bold text-[#7A1212] mb-3">सेवा में अस्थायी व्यवधान</h2>
            <p className="text-sm text-[#5C4033] mb-6 leading-relaxed break-words">
              {readableMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#F59E0B] text-white font-semibold text-sm shadow-sm hover:brightness-105 transition-all cursor-pointer"
            >
              पृष्ठ पुनः लोड करें
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

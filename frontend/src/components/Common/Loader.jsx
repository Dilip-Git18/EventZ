import React from 'react';

const Loader = ({ fullPage = false }) => {
  const spinner = (
    <div className="spinner-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div className="spinner" />
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.05em' }}>
        LOADING ENGINE...
      </p>

      <style>{`
        .spinner {
          width: 50px;
          height: 50px;
          border: 3px dashed var(--accent-purple);
          border-radius: 50%;
          animation: spin 1.2s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  if (fullPage) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'var(--bg-primary)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}
      >
        {spinner}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem 0' }}>
      {spinner}
    </div>
  );
};

export default Loader;

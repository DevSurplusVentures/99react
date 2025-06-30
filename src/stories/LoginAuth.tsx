import React from 'react';

export interface LoginAuthProps {
  className?: string;
  style?: React.CSSProperties;
}

const LoginAuth: React.FC<LoginAuthProps> = ({ className = '', style = {} }) => (
  <section className={className} style={{ minWidth: 340, border: '1px solid #bbb', borderRadius: 8, padding: 28, background: '#f9f9f9', display: 'flex', flexDirection: 'column', gap: 16, ...style }}>
    <h3>Sign In</h3>
    <button style={{ padding: 10, background: '#ececec', borderRadius: 4, border: 'none', marginBottom: 8 }}>Sign in with ICP</button>
    <button style={{ padding: 10, background: '#ececec', borderRadius: 4, border: 'none', marginBottom: 8 }}>Sign in with EVM</button>
    <button style={{ padding: 10, background: '#ececec', borderRadius: 4, border: 'none' }}>Sign in with Email</button>
  </section>
);

export default LoginAuth;

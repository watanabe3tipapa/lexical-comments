import { useState, useEffect } from 'react';
import LexicalEditorComponent, { CommentList } from './components/LexicalEditorComponent';
import { auth, type User } from './lib/api';
import './index.css'

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = auth.getUser();
    if (savedUser) {
      setUser(savedUser);
    }
    setLoading(false);
  }, []);

  const handleLogin = async () => {
    if (nameInput.trim()) {
      const { user: newUser } = await auth.login(nameInput.trim());
      setUser(newUser);
      setShowLogin(false);
      setNameInput('');
    }
  };

  const handleGitHubLogin = async () => {
    try {
      const url = await auth.getGitHubAuthUrl();
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        url,
        'GitHub OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      const checkInterval = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkInterval);
          auth.onGitHubCallback();
          const newUser = auth.getUser();
          if (newUser) {
            setUser(newUser);
          }
        }
      }, 500);
    } catch (error) {
      console.error('GitHub login error:', error);
      alert('GitHub OAuthが設定されていません。.envファイルにGITHUB_IDを設定してください。');
    }
  };

  const handleLogout = () => {
    auth.logout();
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: 'var(--text)',
      }}>
        読み込み中...
      </div>
    );
  }

  return (
    <div>
      <header className="Header">
        <h1>Lexical Comments</h1>
        <div className="UserInfo">
          {user ? (
            <>
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                  }}
                />
              ) : (
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: '14px' }}>{user.name}</span>
              <button
                className="AuthButton logout"
                onClick={handleLogout}
              >
                ログアウト
              </button>
            </>
          ) : (
            <button
              className="AuthButton login"
              onClick={() => setShowLogin(true)}
            >
              ログイン
            </button>
          )}
        </div>
      </header>

      <main style={{ padding: '24px' }}>
        {user ? (
          <LexicalEditorComponent 
            onShowComments={() => setShowComments(true)}
            user={user}
          />
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            maxWidth: '600px',
            margin: '0 auto',
          }}>
            <div style={{
              background: 'var(--social-bg)',
              padding: '40px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
            }}>
              <h2 style={{ marginBottom: '16px' }}>Lexical Commentsへようこそ</h2>
              <p style={{ marginBottom: '24px', color: 'var(--text)', lineHeight: 1.6 }}>
                ログインして、文章にコメントを追加しましょう。
              </p>
              <button
                className="AuthButton login"
                onClick={() => setShowLogin(true)}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  marginBottom: '12px',
                  display: 'block',
                  width: '100%',
                }}
              >
                名前でログイン
              </button>
              <div style={{ margin: '16px 0', color: 'var(--text)', opacity: 0.5 }}>または</div>
              <button
                onClick={handleGitHubLogin}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: '#24292e',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHubでログイン
              </button>
            </div>
          </div>
        )}
      </main>

      {showComments && user && (
        <CommentList 
          onClose={() => setShowComments(false)}
          user={user}
        />
      )}

      {showLogin && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 2000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <div style={{
            background: 'var(--bg)',
            borderRadius: '12px',
            padding: '32px',
            width: '100%',
            maxWidth: '400px',
          }}>
            <h2 style={{ marginBottom: '16px' }}>ログイン</h2>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="名前を入力"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '16px',
                marginBottom: '16px',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                className="CommentButton secondary"
                onClick={() => setShowLogin(false)}
              >
                キャンセル
              </button>
              <button
                className="CommentButton primary"
                onClick={handleLogin}
              >
                ログイン
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

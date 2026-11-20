// import { useState } from 'react';
// import { Link } from 'react-router-dom';
// import { useSession } from '../context/SessionContext';
// import { signIn } from '../services/authService';
// import { useToast } from '../components/Toast';
// import { IconEmail, IconEye, IconEyeOff, IconLock, IconPersonAdd } from '../icons';

// export default function LoginScreen() {
//   const { setUser } = useSession();
//   const toast = useToast();
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [showPass, setShowPass] = useState(false);
//   const [errors, setErrors] = useState({});
//   const [loading, setLoading] = useState(false);
//   const [shake, setShake] = useState(false);

//   const triggerShake = () => {
//     setShake(true);
//     setTimeout(() => setShake(false), 500);
//   };

//   async function onSubmit(e) {
//     e.preventDefault();
//     const errs = {};
//     if (!email) errs.email = 'Enter email';
//     if (!password) errs.password = 'Enter password';
//     setErrors(errs);
//     if (Object.keys(errs).length) return triggerShake();

//     setLoading(true);
//     try {
//       setUser(await signIn(email, password));
//     } catch (err) {
//       triggerShake();
//       toast(err.message.replace('Exception: ', ''), { error: true });
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="login-page">
//       <div className="login-orb o1" /><div className="login-orb o2" />
//       <div className="login-orb o3" /><div className="login-orb o4" />

//       <div className={`login-content ${shake ? 'shake' : ''}`}>
//         <div className="logo-badge pop-in">
//           <img src="/assets/lotus_logo_gold.jpg" alt="Lotus logo" />
//         </div>

//         <div className="login-brand fade-down">
//           <div className="brand-name">lotusvencon</div>
//           <div className="brand-pill">Real Estate Management</div>
//         </div>

//         <form className="login-card fade-up" onSubmit={onSubmit} noValidate>
//           <div className="login-card-head">
//             <div className="login-card-icon"><IconLock size={22} /></div>
//             <div>
//               <div className="login-card-title">Sign In</div>
//               <div className="login-card-sub">Welcome back! Please login.</div>
//             </div>
//           </div>

//           <label className={`login-field ${errors.email ? 'has-error' : ''}`}>
//             <IconEmail size={20} />
//             <input
//               type="email" autoComplete="username" placeholder="Email Address"
//               value={email} onChange={(e) => setEmail(e.target.value)}
//             />
//           </label>
//           {errors.email && <div className="field-error">{errors.email}</div>}

//           <label className={`login-field ${errors.password ? 'has-error' : ''}`}>
//             <IconLock size={20} />
//             <input
//               type={showPass ? 'text' : 'password'} autoComplete="current-password" placeholder="Password"
//               value={password} onChange={(e) => setPassword(e.target.value)}
//             />
//             <button type="button" className="field-suffix" onClick={() => setShowPass((v) => !v)} aria-label="Toggle password">
//               {showPass ? <IconEyeOff size={20} /> : <IconEye size={20} />}
//             </button>
//           </label>
//           {errors.password && <div className="field-error">{errors.password}</div>}

//           <button className="login-btn" type="submit" disabled={loading}>
//             {loading ? <span className="btn-spinner" /> : 'Sign In'}
//           </button>
//         </form>

//         <Link to="/register" className="register-link fade-in">
//           <IconPersonAdd size={15} /> New employee? Register here
//         </Link>
//       </div>
//     </div>
//   );
// }




import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { signIn } from '../services/authService';
import { useToast } from '../components/Toast';
import { IconEmail, IconEye, IconEyeOff, IconLock, IconPersonAdd } from '../icons';

const BANNER_SRC = '/banner.png';
const LOGO_SRC = '/assets/lotus_logo_gold.jpg';

export default function LoginScreen() {
  const { setUser } = useSession();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [bannerError, setBannerError] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  async function onSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!email) errs.email = 'Enter your email address';
    if (!password) errs.password = 'Enter your password';
    setErrors(errs);
    if (Object.keys(errs).length) return triggerShake();

    setLoading(true);
    try {
      setUser(await signIn(email, password));
    } catch (err) {
      triggerShake();
      toast(err.message.replace('Exception: ', ''), { error: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="li-login-page">
      {/* ============ BANNER STAGE (left on desktop, top on mobile) ============ */}
      <section className="li-login-hero" aria-hidden="true">
        {!bannerError ? (
          <img
            src={BANNER_SRC}
            alt=""
            className="li-login-banner"
            onError={() => setBannerError(true)}
          />
        ) : (
          <div className="li-login-fallback">
            <h2>LOTUS INFRA</h2>
          </div>
        )}
        <div className="li-login-blend" />

        <div className="li-login-brand">
          <div className="li-brand-pill">
            <span className="li-brand-name">LOTUS INFRA</span>
            <span className="li-brand-sep">|</span>
            <span className="li-portal-tag">Associate Portal</span>
          </div>
        </div>
      </section>

      {/* ============ SIGN-IN PANEL ============ */}
      <main className="li-login-panel">
        <div className={`li-login-stack ${shake ? 'shake' : ''}`}>
          <form className="li-login-card" onSubmit={onSubmit} noValidate>
            <div className="li-login-head">
              <div className="li-login-logo pop-in">
                <img src={LOGO_SRC} alt="Lotus logo" />
              </div>
              <div>
                <h1 className="li-login-title">Sign in</h1>
                <p className="li-login-sub">Use your associate account to open layout maps, quotations and site visits.</p>
              </div>
            </div>

            <div className="li-login-fields">
              <div>
                <label className={`li-login-field ${errors.email ? 'has-error' : ''}`}>
                  <IconEmail size={20} />
                  <input
                    type="email"
                    autoComplete="username"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'login-email-err' : undefined}
                  />
                </label>
                {errors.email && (
                  <div className="field-error" id="login-email-err" role="alert">{errors.email}</div>
                )}
              </div>

              <div>
                <label className={`li-login-field ${errors.password ? 'has-error' : ''}`}>
                  <IconLock size={20} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'login-pass-err' : undefined}
                  />
                  <button
                    type="button"
                    className="field-suffix"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                  </button>
                </label>
                {errors.password && (
                  <div className="field-error" id="login-pass-err" role="alert">{errors.password}</div>
                )}
              </div>
            </div>

            <button className="li-login-btn" type="submit" disabled={loading}>
              {loading ? <span className="btn-spinner" aria-label="Signing in" /> : 'Sign in'}
            </button>
          </form>

          <Link to="/register" className="li-register-link">
            <IconPersonAdd size={16} />
            <span>New employee? <strong>Register here</strong></span>
          </Link>
        </div>
      </main>
    </div>
  );
}
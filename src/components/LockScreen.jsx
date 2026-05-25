import { useState } from 'react';
import PropTypes from 'prop-types';
import { Fingerprint, Delete, Lock, Unlock } from 'lucide-react';
import { verifyPIN } from '../security';

export default function LockScreen({ onUnlock, securitySettings }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  const targetPinHash = securitySettings?.pinHash || '';

  const handleNumberPress = (num) => {
    if (pin.length < 4) {
      setError(false);
      const newPin = pin + num;
      setPin(newPin);
      
      // Auto submit on 4th digit
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setError(false);
      setPin(pin.slice(0, -1));
    }
  };

  const verifyPin = (enteredPin) => {
    if (verifyPIN(enteredPin, targetPinHash)) {
      setTimeout(() => {
        onUnlock();
      }, 300);
    } else {
      setTimeout(() => {
        setError(true);
        setShake(true);
        setPin('');
        setTimeout(() => setShake(false), 500);
      }, 250);
    }
  };

  const handleBiometricClick = () => {
    if (isScanning || scanSuccess) return;
    setIsScanning(true);
    setError(false);

    // Simulate native scanning
    setTimeout(() => {
      setIsScanning(false);
      setScanSuccess(true);
      setTimeout(() => {
        onUnlock();
      }, 500);
    }, 1500);
  };

  return (
    <div style={styles.container}>
      {/* Top Graphic */}
      <div style={styles.header}>
        <div className="neo-raised-sm" style={styles.logoIcon}>
          {scanSuccess ? (
            <Unlock size={24} style={{ color: 'var(--color-income)' }} />
          ) : (
            <Lock size={24} style={{ color: 'var(--accent-color)' }} />
          )}
        </div>
        <h2 style={styles.title}>Pocket Khata</h2>
        <p style={styles.subtitle}>Secure Financial Vault</p>
      </div>

      {/* PIN Indicators */}
      <div style={{ ...styles.pinContainer, transform: shake ? 'translateX(10px)' : 'none', transition: 'transform 0.1s' }} className={shake ? 'shake-anim' : ''}>
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={pin.length > index ? 'neo-raised-sm' : 'neo-pressed-sm'}
            style={{
              ...styles.pinDot,
              backgroundColor: error 
                ? 'var(--color-expense)' 
                : pin.length > index 
                  ? 'var(--accent-light)' 
                  : 'var(--bg-color)',
              boxShadow: pin.length > index 
                ? '0 0 10px var(--accent-light), var(--neomorphic-raised-sm)' 
                : 'var(--neomorphic-pressed-sm)',
            }}
          />
        ))}
      </div>

      {error && <p style={styles.errorText}>Incorrect PIN. Try again.</p>}

      {/* Biometric Area */}
      {securitySettings?.isBiometricEnabled && (
        <div style={styles.biometricSection}>
          <button
            onClick={handleBiometricClick}
            className={`neo-raised ${isScanning ? 'pulse-animation' : ''}`}
            style={{
              ...styles.biometricBtn,
              borderColor: scanSuccess 
                ? 'var(--color-income)' 
                : isScanning 
                  ? 'var(--accent-light)' 
                  : 'rgba(255,255,255,0.4)',
              boxShadow: scanSuccess
                ? '0 0 20px rgba(38,222,129,0.4), var(--neomorphic-pressed)'
                : isScanning
                  ? 'var(--neomorphic-pressed)'
                  : 'var(--neomorphic-raised)',
            }}
          >
            <Fingerprint
              size={48}
              style={{
                color: scanSuccess
                  ? 'var(--color-income)'
                  : isScanning
                    ? 'var(--accent-light)'
                    : 'var(--text-secondary)',
                transition: 'color 0.3s ease',
              }}
            />
          </button>
          <p style={styles.biometricLabel}>
            {isScanning 
              ? 'Scanning fingerprint...' 
              : scanSuccess 
                ? 'Identity Verified!' 
                : 'Tap to scan biometric'}
          </p>
        </div>
      )}

      {/* Keypad */}
      <div style={styles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberPress(num.toString())}
            className="neo-btn neo-btn-round"
            style={styles.key}
          >
            {num}
          </button>
        ))}
        
        {/* Placeholder for alignment */}
        <div style={styles.keyPlaceholder} />
        
        <button
          onClick={() => handleNumberPress('0')}
          className="neo-btn neo-btn-round"
          style={styles.key}
        >
          0
        </button>

        <button
          onClick={handleBackspace}
          className="neo-btn neo-btn-round"
          style={{ ...styles.key, color: 'var(--color-expense)' }}
        >
          <Delete size={20} />
        </button>
      </div>
    </div>
  );
}

LockScreen.propTypes = {
  onUnlock: PropTypes.func,
  securitySettings: PropTypes.object,
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    padding: '40px 10px 20px 10px',
    backgroundColor: 'var(--bg-color)',
    transition: 'background-color 0.4s ease',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: '20px',
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
    fontWeight: '500',
  },
  pinContainer: {
    display: 'flex',
    gap: '20px',
    margin: '30px 0 10px 0',
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  errorText: {
    color: 'var(--color-expense)',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '10px',
  },
  biometricSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    margin: '10px 0',
  },
  biometricBtn: {
    width: 84,
    height: 84,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255,255,255,0.4)',
    cursor: 'pointer',
    backgroundColor: 'var(--bg-color)',
    outline: 'none',
    transition: 'all 0.3s ease',
  },
  biometricLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '10px',
    fontWeight: '500',
  },
  keypad: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px 30px',
    width: '100%',
    maxWidth: '280px',
    marginBottom: '10px',
  },
  key: {
    width: '56px',
    height: '56px',
    fontSize: '20px',
    fontWeight: '600',
    justifySelf: 'center',
  },
  keyPlaceholder: {
    width: '56px',
    height: '56px',
  },
};

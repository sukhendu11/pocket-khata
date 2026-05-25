import { useState, useMemo } from 'react';
import { ArrowLeft, Plus, X, AlertCircle, Target, Wallet, Trash2, Edit3, TrendingUp } from 'lucide-react';
import PropTypes from 'prop-types';
import { formatNumber, formatPercent } from '../utils';

const COLORS = ['#22C55E', '#54a0ff', '#ff5a79', '#f7b731', '#8e44ad', '#00c9db', '#ff7b54', '#16a085'];

export default function SavingsTracker({
  savingsGoals,
  accounts,
  onAddSavingsGoal,
  onUpdateSavingsGoal,
  onDeleteSavingsGoal,
  onContributeToSavingsGoal,
  onNavigate,
  lang,
}) {
  const [showForm, setShowForm] = useState(false);
  const [showContribute, setShowContribute] = useState(null);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState('#22C55E');
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributeAccountId, setContributeAccountId] = useState('');
  const [formError, setFormError] = useState('');

  const goalsWithProgress = useMemo(() => {
    return savingsGoals.map(g => ({
      ...g,
      percentage: g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0,
      remaining: Math.max(g.targetAmount - g.currentAmount, 0),
      isCompleted: g.currentAmount >= g.targetAmount,
    })).sort((a, b) => b.percentage - a.percentage);
  }, [savingsGoals]);

  const totalStats = useMemo(() => {
    const totalTarget = savingsGoals.reduce((s, g) => s + g.targetAmount, 0);
    const totalCurrent = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
    return {
      totalTarget,
      totalCurrent,
      totalPct: totalTarget > 0 ? Math.min((totalCurrent / totalTarget) * 100, 100) : 0,
      completedCount: goalsWithProgress.filter(g => g.isCompleted).length,
      goalCount: savingsGoals.length,
    };
  }, [savingsGoals, goalsWithProgress]);

  const openNew = () => {
    setEditing(null);
    setName('');
    setTargetAmount('');
    setDeadline('');
    setColor('#22C55E');
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (goal) => {
    setEditing(goal);
    setName(goal.name);
    setTargetAmount(goal.targetAmount.toString());
    setDeadline(goal.deadline || '');
    setColor(goal.color || '#22C55E');
    setFormError('');
    setShowForm(true);
  };

  const handleSave = () => {
    setFormError('');
    if (!name.trim()) { setFormError('Please enter a goal name'); return; }
    const parsed = Number(targetAmount);
    if (!targetAmount || isNaN(parsed) || parsed <= 0) { setFormError('Please enter a valid target amount'); return; }

    const payload = { name: name.trim(), targetAmount: parsed, deadline, color };
    if (editing) {
      onUpdateSavingsGoal({ ...editing, ...payload, currentAmount: editing.currentAmount || 0 });
    } else {
      onAddSavingsGoal({ ...payload, currentAmount: 0 });
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleContribute = () => {
    if (!showContribute) return;
    const parsed = Number(contributeAmount);
    if (!contributeAmount || isNaN(parsed) || parsed <= 0) {
      setFormError('Enter a valid contribution amount');
      return;
    }
    if (!contributeAccountId) {
      setFormError('Select an account');
      return;
    }
    onContributeToSavingsGoal(showContribute.id, parsed, contributeAccountId);
    setShowContribute(null);
    setContributeAmount('');
    setContributeAccountId('');
    setFormError('');
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button className="neo-btn neo-btn-round" style={styles.backBtn} onClick={() => onNavigate('dashboard')}>
          <ArrowLeft size={18} />
        </button>
        <h2 style={styles.title}>Savings Goals</h2>
        <button className="neo-btn neo-btn-round" style={styles.addBtn} onClick={openNew}>
          <Plus size={18} />
        </button>
      </div>

      {/* Summary */}
      {savingsGoals.length > 0 && (
        <div className="neo-raised" style={styles.summaryCard}>
          <div style={styles.summaryTop}>
            <span style={styles.summaryLabel}>Total Saved</span>
            <span style={styles.summaryValue}>৳{formatNumber(totalStats.totalCurrent, lang)}</span>
          </div>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${totalStats.totalPct}%` }} />
          </div>
          <div style={styles.summaryBottom}>
            <span style={styles.summarySub}>Target: ৳{formatNumber(totalStats.totalTarget, lang)}</span>
            <span style={styles.summarySub}>{formatPercent(totalStats.totalPct, lang)}</span>
          </div>
          {totalStats.completedCount > 0 && (
            <span style={styles.completedBadge}>
              {totalStats.completedCount} of {totalStats.goalCount} goals completed
            </span>
          )}
        </div>
      )}

      {/* Goals List */}
      <div style={styles.listContainer}>
        {goalsWithProgress.length === 0 ? (
          <div className="neo-pressed-sm" style={styles.emptyState}>
            <Target size={28} style={{ color: 'var(--text-secondary)', opacity: 0.5, marginBottom: '8px' }} />
            <p>No savings goals yet</p>
            <p style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>Start saving towards something big!</p>
          </div>
        ) : (
          goalsWithProgress.map(g => (
            <div key={g.id} className="neo-raised-sm" style={{
              ...styles.goalCard,
              borderLeft: `4px solid ${g.color}`,
              opacity: g.isCompleted ? 0.8 : 1,
            }}>
              <div style={styles.cardTop}>
                <div style={styles.cardLeft}>
                  <span style={styles.goalName}>{g.name}</span>
                  {g.deadline && <span style={styles.goalDeadline}>by {g.deadline}</span>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={styles.goalCurrent}>৳{formatNumber(g.currentAmount, lang)}</span>
                  <span style={styles.goalTarget}> / ৳{formatNumber(g.targetAmount, lang)}</span>
                </div>
              </div>

              <div style={styles.progressTrack}>
                <div style={{
                  ...styles.progressFill,
                  width: `${g.percentage}%`,
                  backgroundColor: g.isCompleted ? 'var(--color-income)' : g.color,
                }} />
              </div>

              <div style={styles.cardBottom}>
                <span style={styles.remainingText}>
                  {g.isCompleted ? 'Goal achieved! 🎉' : `৳${formatNumber(g.remaining, lang)} remaining`}
                </span>
                <span style={styles.pctText}>{formatPercent(g.percentage, lang)}</span>
              </div>

              <div style={styles.actionRow}>
                {!g.isCompleted && (
                  <button className="neo-btn neo-btn-primary" style={styles.contributeBtn}
                    onClick={() => { setShowContribute(g); setContributeAmount(''); setContributeAccountId(''); setFormError(''); }}>
                    <TrendingUp size={12} /> Contribute
                  </button>
                )}
                <button className="neo-btn" style={styles.editBtn} onClick={() => openEdit(g)}>
                  <Edit3 size={10} /> Edit
                </button>
                <button className="neo-btn" style={styles.deleteBtn} onClick={() => onDeleteSavingsGoal(g.id)}>
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Form Drawer */}
      {showForm && (
        <>
          <div className="drawer-overlay" onClick={() => setShowForm(false)} />
          <div className="bottom-drawer" style={styles.formDrawer}>
            <div style={styles.formHeader}>
              <h3 style={styles.formTitle}>{editing ? 'Edit Goal' : 'New Savings Goal'}</h3>
              <button className="neo-btn neo-btn-round" style={styles.closeFormBtn} onClick={() => setShowForm(false)}>
                <X size={16} />
              </button>
            </div>
            {formError && (
              <div className="neo-pressed-sm" style={styles.errorBox}><AlertCircle size={14} style={{ color: 'var(--color-expense)' }} /><span style={styles.errorText}>{formError}</span></div>
            )}
            <div style={styles.formBody}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>GOAL NAME</label>
                <input type="text" placeholder="e.g. New Laptop" value={name} onChange={(e) => setName(e.target.value)} className="neo-input" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>TARGET AMOUNT (৳)</label>
                <input type="number" placeholder="e.g. 50000" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} className="neo-input" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>DEADLINE (optional)</label>
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="neo-input" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>THEME COLOR</label>
                <div style={styles.colorRow}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)}
                      className={color === c ? 'neo-pressed-sm' : 'neo-raised-sm'}
                      style={{ ...styles.colorCircle, backgroundColor: c, border: color === c ? '2px solid var(--text-primary)' : '1px solid transparent' }} />
                  ))}
                </div>
              </div>
              <button className="neo-btn neo-btn-primary" style={styles.saveBtn} onClick={handleSave}>
                {editing ? 'Save Changes' : 'Create Goal'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Contribute Drawer */}
      {showContribute && (
        <>
          <div className="drawer-overlay" onClick={() => setShowContribute(null)} />
          <div className="bottom-drawer" style={styles.formDrawer}>
            <div style={styles.formHeader}>
              <h3 style={styles.formTitle}>Contribute to {showContribute.name}</h3>
              <button className="neo-btn neo-btn-round" style={styles.closeFormBtn} onClick={() => setShowContribute(null)}><X size={16} /></button>
            </div>
            {formError && (
              <div className="neo-pressed-sm" style={styles.errorBox}><AlertCircle size={14} style={{ color: 'var(--color-expense)' }} /><span style={styles.errorText}>{formError}</span></div>
            )}
            <div style={styles.formBody}>
              <div className="neo-pressed-sm" style={styles.currentProgress}>
                <span>Progress: ৳{formatNumber(showContribute.currentAmount, lang)} / ৳{formatNumber(showContribute.targetAmount, lang)}</span>
                <span style={{ fontWeight: 700 }}>{formatPercent(showContribute.targetAmount > 0 ? Math.min((showContribute.currentAmount / showContribute.targetAmount) * 100, 100) : 0, lang)}</span>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>AMOUNT (৳)</label>
                <input type="number" placeholder="e.g. 5000" value={contributeAmount} onChange={(e) => setContributeAmount(e.target.value)} className="neo-input" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>FROM ACCOUNT</label>
                <select value={contributeAccountId} onChange={(e) => setContributeAccountId(e.target.value)} className="neo-input" style={styles.formSelect}>
                  <option value="" disabled>Select Account</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} (৳{formatNumber(a.balance, lang)})</option>
                  ))}
                </select>
              </div>
              <button className="neo-btn neo-btn-primary" style={styles.saveBtn} onClick={handleContribute}>
                <Wallet size={14} /> Add Contribution
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

SavingsTracker.propTypes = {
  savingsGoals: PropTypes.array,
  accounts: PropTypes.array,
  onAddSavingsGoal: PropTypes.func,
  onUpdateSavingsGoal: PropTypes.func,
  onDeleteSavingsGoal: PropTypes.func,
  onContributeToSavingsGoal: PropTypes.func,
  onNavigate: PropTypes.func,
  lang: PropTypes.string,
};

const styles = {
  container: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  backBtn: { width: '36px', height: '36px', borderRadius: '50%', padding: 0 },
  addBtn: { width: '36px', height: '36px', borderRadius: '50%', padding: 0 },
  title: { fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' },
  summaryCard: { padding: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column' },
  summaryTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  summaryLabel: { fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' },
  summaryValue: { fontSize: '22px', fontWeight: '800', color: 'var(--color-income)' },
  progressTrack: { height: '10px', borderRadius: '5px', backgroundColor: 'var(--bg-color)', boxShadow: 'var(--neomorphic-pressed-sm)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '5px', transition: 'width 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)', backgroundColor: 'var(--color-income)' },
  summaryBottom: { display: 'flex', justifyContent: 'space-between', marginTop: '6px' },
  summarySub: { fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '500' },
  completedBadge: { fontSize: '10px', color: 'var(--color-income)', fontWeight: '600', marginTop: '8px', textAlign: 'center' },
  listContainer: { flex: 1, overflowY: 'auto', paddingRight: '2px', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '10px' },
  emptyState: { padding: '40px 20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' },
  goalCard: { padding: '14px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { display: 'flex', flexDirection: 'column' },
  goalName: { fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' },
  goalDeadline: { fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '500', marginTop: '2px' },
  goalCurrent: { fontSize: '14px', fontWeight: '700', color: 'var(--color-income)' },
  goalTarget: { fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' },
  cardBottom: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  remainingText: { fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' },
  pctText: { fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' },
  actionRow: { display: 'flex', gap: '8px', marginTop: '4px' },
  contributeBtn: { padding: '5px 12px', fontSize: '10px', borderRadius: '6px', height: '28px' },
  editBtn: { padding: '5px 10px', fontSize: '9px', borderRadius: '6px', height: '28px', border: '1px solid var(--accent-color)', color: 'var(--accent-color)' },
  deleteBtn: { width: '28px', height: '28px', borderRadius: '6px', padding: 0, border: '1px solid var(--color-expense)', color: 'var(--color-expense)' },
  formDrawer: { paddingBottom: '30px' },
  formHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  formTitle: { fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' },
  closeFormBtn: { width: '32px', height: '32px', borderRadius: '50%', padding: 0 },
  formBody: { display: 'flex', flexDirection: 'column', gap: '14px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
  formLabel: { fontSize: '9px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.5px' },
  formSelect: { appearance: 'none', cursor: 'pointer', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%237f8c8d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '16px', paddingRight: '40px' },
  colorRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  colorCircle: { width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', padding: 0 },
  currentProgress: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', padding: '10px 12px', borderRadius: '10px', color: 'var(--text-primary)' },
  saveBtn: { height: '42px', marginTop: '6px' },
  errorBox: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '10px', marginBottom: '10px' },
  errorText: { fontSize: '11px', fontWeight: '600', color: 'var(--color-expense)' },
};

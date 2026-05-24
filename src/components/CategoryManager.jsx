import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Plus, Trash2, X, AlertCircle, Info,
  Briefcase, Globe, TrendingUp, Utensils, ShoppingBag, 
  Home, Lightbulb, Car, Tv, HeartPulse, Plane, GraduationCap, Sparkles
} from 'lucide-react';
import { t } from '../i18n';

// Dictionary mapping icon names to Lucide components
const ICON_COMPONENTS = {
  Briefcase: Briefcase,
  Globe: Globe,
  TrendingUp: TrendingUp,
  Utensils: Utensils,
  ShoppingBag: ShoppingBag,
  Home: Home,
  Lightbulb: Lightbulb,
  Car: Car,
  Tv: Tv,
  HeartPulse: HeartPulse,
  Plane: Plane,
  GraduationCap: GraduationCap,
  Sparkles: Sparkles,
};

export default function CategoryManager({
  categories,
  transactions,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onNavigate,
  lang
}) {
  const [activeTab, setActiveTab] = useState('expense'); // 'expense', 'income'
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('expense'); // 'expense', 'income'
  const [icon, setIcon] = useState('Utensils');
  const [color, setColor] = useState('#ff7b54');
  const [formError, setFormError] = useState('');

  const colors = ['#ff7b54', '#e84393', '#16a085', '#f1c40f', '#0984e3', '#a29bfe', '#e74c3c', '#3cd070', '#00c9db', '#8e44ad'];
  const iconList = Object.keys(ICON_COMPONENTS);

  // 1. Dynamic Icon Renderer
  const renderIcon = (iconName, size = 16, style = {}) => {
    const IconComp = ICON_COMPONENTS[iconName] || Info;
    return <IconComp size={size} style={style} />;
  };

  // Hydrate form when editing
  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name);
      setType(editingCategory.type);
      setIcon(editingCategory.icon);
      setColor(editingCategory.color);
      setShowAddModal(true);
    }
  }, [editingCategory]);

  // 2. Filtered list
  const filteredCategories = categories.filter(c => c.type === activeTab);

  // 3. Save Category
  const handleSave = () => {
    setFormError('');

    if (!name.trim()) {
      setFormError(t('categories.errName', lang));
      return;
    }

    if (editingCategory) {
      onUpdateCategory({
        ...editingCategory,
        name: name.trim(),
        type,
        icon,
        color,
      });
    } else {
      onAddCategory({
        name: name.trim(),
        type,
        icon,
        color,
      });
    }

    // Reset and close
    setName('');
    setType('expense');
    setIcon('Utensils');
    setColor('#ff7b54');
    setEditingCategory(null);
    setShowAddModal(false);
  };

  const openNewCategory = () => {
    setEditingCategory(null);
    setName('');
    setType(activeTab);
    setIcon('Utensils');
    setColor(activeTab === 'expense' ? '#ff7b54' : '#3cd070');
    setFormError('');
    setShowAddModal(true);
  };

  const handleEdit = (cat) => {
    setEditingCategory(cat);
  };

  const handleDelete = (catId) => {
    const hasTxs = transactions.some(t => t.categoryId === catId);
    if (hasTxs) {
      const confirmDelete = window.confirm(
        t('categories.deleteWarning', lang)
      );
      if (!confirmDelete) return;
    }

    onDeleteCategory(catId);
  };

  return (
    <div style={styles.container}>
      
      {/* Header Bar */}
      <div style={styles.header}>
        <button className="neo-btn neo-btn-round" style={styles.backBtn} onClick={() => onNavigate('dashboard')}>
          <ArrowLeft size={18} />
        </button>
        <h2 style={styles.title}>{t('categories.title', lang)}</h2>
        <button className="neo-btn neo-btn-round" style={styles.addBtn} onClick={openNewCategory}>
          <Plus size={18} />
        </button>
      </div>

      {/* Tabs selector */}
      <div className="neo-pressed-sm" style={styles.segmentContainer}>          {['expense', 'income'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="neo-btn"
            style={{
              ...styles.segmentBtn,
              boxShadow: activeTab === tab ? 'var(--neomorphic-raised-sm)' : 'none',
              color: activeTab === tab 
                ? tab === 'income' ? 'var(--color-income)' : 'var(--color-expense)'
                : 'var(--text-secondary)',
              fontWeight: activeTab === tab ? '700' : '500',
              border: activeTab === tab ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
            }}
          >
            {t(tab === 'income' ? 'income' : 'expense', lang).toUpperCase()}
          </button>
        ))}
      </div>

      {/* Categories Grid List */}
      <div style={styles.listContainer}>
        {filteredCategories.length === 0 ? (
          <div className="neo-pressed-sm" style={styles.emptyState}>
            {t('categories.noCustom', lang)} {t(activeTab === 'income' ? 'income' : 'expense', lang)} {t('categories.categoriesFound', lang)}
          </div>
        ) : (
          <div style={styles.grid}>
            {filteredCategories.map(cat => (
              <div key={cat.id} className="neo-raised-sm" style={styles.catCard} onClick={() => handleEdit(cat)}>
                <div style={styles.cardTop}>
                  <span 
                    style={{ ...styles.iconWrapper, backgroundColor: `${cat.color}22`, color: cat.color }} 
                    className="neo-pressed-sm"
                  >
                    {renderIcon(cat.icon, 20)}
                  </span>
                  <button className="neo-btn" style={styles.deleteCardBtn} onClick={(e) => { e.stopPropagation(); handleDelete(cat.id); }}>
                    <Trash2 size={12} />
                  </button>
                </div>
                <h4 style={styles.catName}>{cat.name}</h4>
                <span style={styles.editHint}>{t('categories.editHint', lang)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide-over Modal to Add Category */}
      {showAddModal && (
        <>
          <div className="drawer-overlay" onClick={() => setShowAddModal(false)} />
          <div className="bottom-drawer" style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{editingCategory ? t('categories.newCategory', lang) : t('categories.newCategory', lang)}</h3>
              <button className="neo-btn neo-btn-round" style={styles.closeModalBtn} onClick={() => setShowAddModal(false)}>
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="neo-pressed-sm" style={styles.errorBox}>
                <AlertCircle size={14} style={{ color: 'var(--color-expense)' }} />
                <span style={styles.errorText}>{formError}</span>
              </div>
            )}

            <div style={styles.form}>
              
              {/* Category Icon Preview Block */}
              <div style={styles.previewSection}>
                <div 
                  className="neo-raised" 
                  style={{ 
                    ...styles.previewBubble, 
                    backgroundColor: 'var(--bg-color)', 
                    color: color,
                    borderColor: color,
                    boxShadow: '0 0 15px ' + color + '22, var(--neomorphic-raised)'
                  }}
                >
                  {renderIcon(icon, 32)}
                </div>
                <span style={styles.previewLabel}>{t('categories.visualPreview', lang)}</span>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('categories.categoryName', lang)}</label>
                <input
                  type="text"
                  placeholder={t('categories.categoryNamePlaceholder', lang)}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="neo-input"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('categories.flowType', lang)}</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="neo-input"
                  style={styles.select}
                >
                  <option value="expense">{t('categories.expenseOutflow', lang)}</option>
                  <option value="income">{t('categories.incomeInflow', lang)}</option>
                </select>
              </div>

              {/* Color Palette Selector */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('categories.themeColor', lang)}</label>
                <div style={styles.colorPalette}>
                  {colors.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={color === c ? 'neo-pressed-sm' : 'neo-raised-sm'}
                      style={{
                        ...styles.colorCircle,
                        backgroundColor: c,
                        border: color === c ? '2px solid var(--text-primary)' : '1px solid transparent',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon grid selector */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>{t('categories.selectIcon', lang)}</label>
                <div style={styles.iconPalette} className="hide-scrollbar">
                  {iconList.map(icName => (
                    <button
                      key={icName}
                      onClick={() => setIcon(icName)}
                      className={icon === icName ? 'neo-pressed-sm' : 'neo-raised-sm'}
                      style={{
                        ...styles.iconOptionBtn,
                        color: icon === icName ? 'var(--accent-color)' : 'var(--text-secondary)',
                        border: icon === icName ? '1px solid var(--accent-color)' : '1px solid transparent',
                      }}
                    >
                      {renderIcon(icName, 18)}
                    </button>
                  ))}
                </div>
              </div>

              <button className="neo-btn neo-btn-primary" style={styles.saveFormBtn} onClick={handleSave}>
                {editingCategory ? t('categories.saveCategory', lang) : t('categories.saveCategory', lang)}
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  backBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    padding: 0,
  },
  addBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    padding: 0,
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  segmentContainer: {
    display: 'flex',
    padding: '4px',
    borderRadius: '16px',
    marginBottom: '20px',
    backgroundColor: 'var(--bg-color)',
  },
  segmentBtn: {
    flex: 1,
    padding: '8px 0',
    fontSize: '11px',
    borderRadius: '12px',
    backgroundColor: 'transparent',
    boxShadow: 'none',
  },
  listContainer: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '2px',
    paddingBottom: '20px',
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  catCard: {
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    borderRadius: '18px',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconWrapper: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCardBtn: {
    width: '26px',
    height: '26px',
    borderRadius: '8px',
    padding: 0,
    border: '1px solid var(--color-expense)',
    color: 'var(--color-expense)',
  },
  catName: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  editHint: {
    fontSize: '8px',
    color: 'var(--text-secondary)',
    opacity: 0.5,
    fontWeight: '500',
    marginTop: '2px',
  },
  modal: {
    paddingBottom: '30px',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  closeModalBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    padding: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  previewSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    margin: '6px 0',
  },
  previewBubble: {
    width: '64px',
    height: '64px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid transparent',
  },
  previewLabel: {
    fontSize: '10px',
    color: 'var(--text-secondary)',
    marginTop: '6px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  formLabel: {
    fontSize: '9px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    letterSpacing: '0.5px',
  },
  select: {
    appearance: 'none',
    cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%237f8c8d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 16px center',
    backgroundSize: '16px',
    paddingRight: '40px',
  },
  option: {
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-primary)',
  },
  colorPalette: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '4px',
  },
  colorCircle: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    cursor: 'pointer',
    padding: 0,
  },
  iconPalette: {
    display: 'flex',
    gap: '10px',
    overflowX: 'auto',
    paddingBottom: '10px',
    marginTop: '4px',
    scrollbarWidth: 'none',
  },
  iconOptionBtn: {
    flexShrink: 0,
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  saveFormBtn: {
    height: '42px',
    marginTop: '10px',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    borderRadius: '10px',
    backgroundColor: 'var(--bg-color)',
    marginBottom: '10px',
  },
  errorText: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--color-expense)',
  },
};

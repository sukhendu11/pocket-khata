import { useState, useRef } from 'react';
import { 
  ArrowLeft, FileSpreadsheet, 
  RefreshCw, ShieldAlert,
  Download, Upload, FileText,
  Bell, Info
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import PropTypes from 'prop-types';
import { t } from '../i18n';
import { formatNumber } from '../utils';
import { db } from '../db';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
} from '../notifications';

export default function Settings({
  onResetDatabase,
  onImportDatabase,
  onExportDatabase,
  transactions,
  accounts,
  categories,
  budgets,
  onNavigate,
  lang
}) {
  // Reset State
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Notification State
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const stored = localStorage.getItem('pocket_khata_notifications_enabled');
    return stored === null ? true : stored === 'true';
  });
  const [reminderAlertsEnabled, setReminderAlertsEnabled] = useState(() => {
    const stored = localStorage.getItem('pocket_khata_reminder_alerts_enabled');
    return stored === null ? true : stored === 'true';
  });

  const notifSupported = isNotificationSupported();
  const notifPermission = getNotificationPermission();

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled && notifPermission !== 'granted') {
      // Turning on — request permission first
      await requestNotificationPermission();
      // Re-check permission after user responds
      if (getNotificationPermission() !== 'granted') {
        // User denied the request — don't toggle on
        return;
      }
    }
    const newVal = !notificationsEnabled;
    setNotificationsEnabled(newVal);
    localStorage.setItem('pocket_khata_notifications_enabled', String(newVal));
  };

  const handleToggleReminderAlerts = () => {
    const newVal = !reminderAlertsEnabled;
    setReminderAlertsEnabled(newVal);
    localStorage.setItem('pocket_khata_reminder_alerts_enabled', String(newVal));
  };

  // PDF Report State
  const [reportPeriod, setReportPeriod] = useState('thisMonth');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // 4. JSON Export download
  const handleExportJSON = () => {
    const jsonStr = onExportDatabase();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Pocket_Khata_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 6. JSON Import via file input
  const fileInputRef = useRef(null);

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const jsonString = evt.target.result;
      const success = onImportDatabase(jsonString);
      if (success) {
        alert(t('settings.importSuccess', lang));
      } else {
        alert(t('settings.importError', lang));
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset so same file can be re-imported
  };

  // ---- Helper: convert hex color to RGB array for jsPDF ----
  const hexToRgb = (hex) => {
    if (!hex || typeof hex !== 'string') return [180, 180, 180];
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [180, 180, 180];
  };

  // PDF Report Generation
  const handleExportPDF = () => {
    if (transactions.length === 0) {
      alert('No transactions to export.');
      return;
    }
    setIsGeneratingPDF(true);

    setTimeout(() => {
      try {
        // Determine date range
        const now = new Date();
        let startDate, endDate;
        
        switch (reportPeriod) {
          case 'thisMonth':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
          case 'lastMonth':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
          case 'last3Months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
          case 'last6Months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
          case 'thisYear':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        const filtered = transactions.filter(tx => {
          const d = new Date(tx.date);
          return d >= startDate && d <= endDate;
        });

        const totalIncome = filtered.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
        const totalExpense = filtered.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
        const net = totalIncome - totalExpense;

        // ---- Compute Budget vs Actual data ----
        const budgetData = budgets.filter(b => {
          const budgetDate = new Date(b.year, b.month, 1);
          return budgetDate >= startDate && budgetDate <= endDate;
        }).map(b => {
          const cat = categories.find(c => c.id === b.categoryId);
          const spent = filtered
            .filter(tx => tx.type === 'expense' && tx.categoryId === b.categoryId)
            .reduce((s, tx) => s + tx.amount, 0);
          return {
            categoryName: cat?.name || 'Unknown',
            color: cat?.color || '#888888',
            limit: b.limit,
            spent,
            remaining: b.limit - spent,
            percentage: b.limit > 0 ? Math.round((spent / b.limit) * 100) : (spent > 0 ? 100 : 0),
            displayPct: b.limit === 0 && spent > 0 ? '100%+' : `${Math.round(b.limit > 0 ? (spent / b.limit) * 100 : 0)}%`,
            isOverBudget: spent > b.limit,
          };
        }).sort((a, b) => b.percentage - a.percentage);

        const budgetTotal = budgetData.reduce((s, b) => ({ limit: s.limit + b.limit, spent: s.spent + b.spent }), { limit: 0, spent: 0 });

        // ---- Compute Smart Insights data ----
        let prevStartDate, prevEndDate;
        switch (reportPeriod) {
          case 'thisMonth':
            prevStartDate = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
            prevEndDate = new Date(startDate.getFullYear(), startDate.getMonth(), 0);
            break;
          case 'lastMonth':
            prevStartDate = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
            prevEndDate = new Date(startDate.getFullYear(), startDate.getMonth(), 0);
            break;
          case 'last3Months':
            prevStartDate = new Date(startDate.getFullYear(), startDate.getMonth() - 3, 1);
            prevEndDate = new Date(startDate.getFullYear(), startDate.getMonth(), 0);
            break;
          case 'last6Months':
            prevStartDate = new Date(startDate.getFullYear(), startDate.getMonth() - 6, 1);
            prevEndDate = new Date(startDate.getFullYear(), startDate.getMonth(), 0);
            break;
          case 'thisYear':
            prevStartDate = new Date(startDate.getFullYear() - 1, 0, 1);
            prevEndDate = new Date(startDate.getFullYear() - 1, 11, 31);
            break;
          default:
            prevStartDate = null;
            prevEndDate = null;
        }

        const prevFiltered = prevStartDate ? transactions.filter(tx => {
          const d = new Date(tx.date);
          return d >= prevStartDate && d <= prevEndDate;
        }) : [];

        const currentCatSpending = {};
        filtered.filter(tx => tx.type === 'expense').forEach(tx => {
          currentCatSpending[tx.categoryId] = (currentCatSpending[tx.categoryId] || 0) + tx.amount;
        });

        const prevCatSpending = {};
        prevFiltered.filter(tx => tx.type === 'expense').forEach(tx => {
          prevCatSpending[tx.categoryId] = (prevCatSpending[tx.categoryId] || 0) + tx.amount;
        });

        const catChanges = [];
        const allCatIds = new Set([...Object.keys(currentCatSpending), ...Object.keys(prevCatSpending)]);
        allCatIds.forEach(catId => {
          const current = currentCatSpending[catId] || 0;
          const prev = prevCatSpending[catId] || 0;
          const diff = current - prev;
          const cat = categories.find(c => c.id === catId);
          catChanges.push({
            name: cat?.name || 'Unknown',
            current, prev, diff,
            pctChange: prev > 0 ? Math.round((diff / prev) * 100) : (current > 0 ? 100 : 0),
          });
        });
        catChanges.sort((a, b) => b.current - a.current);

        const topCategory = catChanges.length > 0 && catChanges[0].current > 0 ? catChanges[0] : null;
        const biggestIncrease = catChanges.filter(c => c.diff > 0).sort((a, b) => b.diff - a.diff)[0] || null;
        const biggestDecrease = catChanges.filter(c => c.diff < 0).sort((a, b) => a.diff - b.diff)[0] || null;

        const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;
        const currentTxCount = filtered.length;
        const prevTxCount = prevFiltered.length;
        const hasComparison = !!prevStartDate;

        // ---- Compute Anomaly Detection data ----
        const categoryTxGroups = {};
        const anomalies = [];
        filtered.filter(tx => tx.type === 'expense').forEach(tx => {
          if (!categoryTxGroups[tx.categoryId]) categoryTxGroups[tx.categoryId] = [];
          categoryTxGroups[tx.categoryId].push(tx);
        });
        Object.entries(categoryTxGroups).forEach(([catId, txs]) => {
          if (txs.length < 2) return;
          const total = txs.reduce((s, tx) => s + tx.amount, 0);
          const avg = total / txs.length;
          txs.forEach(tx => {
            if (tx.amount > avg * 2) {
              const cat = categories.find(c => c.id === catId);
              anomalies.push({
                notes: tx.notes,
                date: tx.date,
                amount: tx.amount,
                categoryName: cat?.name || 'Unknown',
                color: cat?.color || '#888888',
                average: Math.round(avg),
                multiplier: Math.round((tx.amount / avg) * 10) / 10,
              });
            }
          });
        });
        anomalies.sort((a, b) => b.multiplier - a.multiplier);

        // ---- Helper to check if y needs a new page ----
        const checkPage = (needed) => {
          if (y + needed > 270) {
            doc.addPage();
            y = 20;
          }
        };

        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const pageW = 210;
        const marginL = 18;
        const marginR = 18;
        const contentW = pageW - marginL - marginR;
        let y = 15;

        // ---- Helper: draw section header with left accent bar ----
        const drawSectionHeader = (title) => {
          checkPage(16);
          doc.setFillColor(245, 247, 250);
          doc.rect(marginL, y - 4, contentW, 7, 'F');
          doc.setFillColor(59, 130, 246);
          doc.rect(marginL, y - 4, 2.5, 7, 'F');
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(41, 56, 86);
          doc.text(title, marginL + 7, y);
          y += 11;
        };

        // ---- Helper: draw progress bar ----
        const drawProgressBar = (x, yPos, w, h, pct, color) => {
          doc.setFillColor(228, 231, 235);
          doc.rect(x, yPos, w, h, 'F');
          const fillPct = Math.min(pct, 100);
          const fillW = (w * fillPct) / 100;
          if (fillW > 0) {
            doc.setFillColor(color[0], color[1], color[2]);
            doc.rect(x, yPos, fillW, h, 'F');
          }
          doc.setDrawColor(210, 210, 210);
          doc.rect(x, yPos, w, h, 'S');
        };

        // ---- Helper: find category RGB from name (fallback to gray) ----
        const catNameToRgb = (name) => {
          const cat = categories.find(c => c.name === name);
          return hexToRgb(cat?.color);
        };

        const dateLocale = lang === 'bn' ? 'bn-BD' : 'en-US';
        const fmt = (n) => `৳${formatNumber(n, lang)}`;
        const genDate = new Date().toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

        // ==== TITLE BANNER ====
        doc.setFillColor(30, 41, 59);
        doc.rect(marginL - 3, y - 3, contentW + 6, 18, 'F');
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(t('pdf.title', lang) + ' — ' + t('pdf.subtitle', lang), pageW / 2, y + 5, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(203, 213, 225);
        doc.text(t('pdf.subtitle', lang), pageW / 2, y + 12, { align: 'center' });
        y += 24;

        // Period & generation info
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        const periodStart = startDate.toLocaleDateString(dateLocale, { month: 'long', day: 'numeric', year: 'numeric' });
        const periodEnd = endDate.toLocaleDateString(dateLocale, { month: 'long', day: 'numeric', year: 'numeric' });
        doc.text(`${t('pdf.period', lang)} ${periodStart} \u2014 ${periodEnd}`, pageW / 2, y, { align: 'center' });
        y += 4;
        doc.text(`${t('pdf.generated', lang)} ${genDate}`, pageW / 2, y, { align: 'center' });
        y += 10;

        // ==== SUMMARY CARDS (3 across) ====
        const cardW = (contentW - 8) / 3;
        const cardH = 16;

        // Income card
        doc.setFillColor(236, 253, 243);
        doc.rect(marginL, y, cardW, cardH, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 163, 74);
        doc.text(t('pdf.totalIncome', lang), marginL + 4, y + 4);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(21, 128, 61);
        doc.text(fmt(totalIncome), marginL + 4, y + 13);

        // Expense card
        doc.setFillColor(254, 242, 242);
        doc.rect(marginL + cardW + 4, y, cardW, cardH, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38);
        doc.text(t('pdf.totalExpense', lang), marginL + cardW + 4 + 4, y + 4);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(185, 28, 28);
        doc.text(fmt(totalExpense), marginL + cardW + 4 + 4, y + 13);

        // Net card
        const netColor = net >= 0 ? [21, 128, 61] : [185, 28, 28];
        const netBg = net >= 0 ? [236, 253, 243] : [254, 242, 242];
        doc.setFillColor(netBg[0], netBg[1], netBg[2]);
        doc.rect(marginL + (cardW + 4) * 2, y, cardW, cardH, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(netColor[0], netColor[1], netColor[2]);
        doc.text(net >= 0 ? t('pdf.netSavings', lang) : t('pdf.netLoss', lang), marginL + (cardW + 4) * 2 + 4, y + 4);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(netColor[0], netColor[1], netColor[2]);
        doc.text(fmt(Math.abs(net)), marginL + (cardW + 4) * 2 + 4, y + 13);

        y += cardH + 12;

        // ==== INCOME vs EXPENSE TREND CHART ====
        // Compute monthly breakdown from filtered transactions
        const monthlyMap = {};
        filtered.forEach(tx => {
          const d = new Date(tx.date);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          if (!monthlyMap[key]) {
            monthlyMap[key] = {
              label: d.toLocaleDateString(dateLocale, { month: 'short', year: '2-digit' }),
              income: 0,
              expense: 0,
            };
          }
          if (tx.type === 'income') monthlyMap[key].income += tx.amount;
          else if (tx.type === 'expense') monthlyMap[key].expense += tx.amount;
        });
        const monthlyData = Object.keys(monthlyMap).sort().map(k => monthlyMap[k]);

        if (monthlyData.length > 0) {
          // Check for page break BEFORE drawing the header to prevent orphaned header
          // Need: ~11mm section header overhead + 55mm chart + 10mm trailing spacing
          checkPage(55 + 20);
          drawSectionHeader(t('pdf.incomeExpenseTrend', lang));

          const chartX = marginL + 4;
          const chartY = y;
          const chartW = contentW - 8;
          const chartH = 55;
          const chartBottom = chartY + chartH;
          const axisOffset = 22;
          const barAreaX = chartX + axisOffset;
          const barAreaW = chartW - axisOffset - 5;
          const barAreaH = chartH - 16;

          // Find max value for scaling
          const maxVal = Math.max(...monthlyData.flatMap(m => [m.income, m.expense]), 1);
          const scale = (barAreaH - 4) / maxVal;

          // Chart background
          doc.setFillColor(248, 249, 250);
          doc.rect(chartX, chartY, chartW, chartH, 'F');
          doc.setDrawColor(210, 210, 210);
          doc.rect(chartX, chartY, chartW, chartH, 'S');

          // Y-axis grid lines and labels
          const ySteps = [0, 0.25, 0.5, 0.75, 1];
          ySteps.forEach(pct => {
            const yPos = chartY + chartH - 16 - (barAreaH - 4) * pct;
            if (pct > 0) {
              doc.setDrawColor(228, 231, 235);
              doc.line(barAreaX, yPos, barAreaX + barAreaW, yPos);
            }
            doc.setFontSize(5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(140);
            const val = Math.round(maxVal * pct);
            doc.text(
              val >= 100000 ? `${Math.round(val / 1000)}k` : val >= 10000 ? `${(val / 1000).toFixed(1)}k` : formatNumber(val, lang),
              barAreaX - 2, yPos + 1, { align: 'right' }
            );
          });

          // Draw grouped bars
          const numGroups = monthlyData.length;
          const groupW = barAreaW / numGroups;
          const barW = Math.min(groupW * 0.35, 5);
          const gap = Math.max((groupW - barW * 2) / 3, 0.5);

          monthlyData.forEach((m, i) => {
            const groupX = barAreaX + i * groupW + gap;

            // Income bar (green)
            const incomeH = m.income * scale;
            if (incomeH > 0) {
              doc.setFillColor(34, 197, 94);
              doc.rect(groupX, chartBottom - 16 - incomeH, barW, incomeH, 'F');
            }

            // Expense bar (red)
            const expenseH = m.expense * scale;
            if (expenseH > 0) {
              doc.setFillColor(239, 68, 68);
              doc.rect(groupX + barW + gap, chartBottom - 16 - expenseH, barW, expenseH, 'F');
            }

            // X-axis label
            doc.setFontSize(5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text(m.label, groupX + groupW / 2, chartBottom - 4, { align: 'center' });
          });

          // Axes
          doc.setDrawColor(200);
          doc.line(barAreaX, chartBottom - 16, barAreaX + barAreaW, chartBottom - 16);
          doc.line(barAreaX, chartY, barAreaX, chartBottom - 16);

          // Legend
          const legendY = chartY + 4;
          doc.setFontSize(5);
          doc.setFont('helvetica', 'normal');
          doc.setFillColor(34, 197, 94);
          doc.rect(chartX + 6, legendY, 4, 3, 'F');
          doc.setTextColor(34, 197, 94);
          doc.text(t('pdf.income', lang), chartX + 11, legendY + 2.5);
          doc.setFillColor(239, 68, 68);
          doc.rect(chartX + 32, legendY, 4, 3, 'F');
          doc.setTextColor(239, 68, 68);
          doc.text(t('pdf.expense', lang), chartX + 37, legendY + 2.5);

          y += chartH + 10;
        }

        // ==== BUDGET VS ACTUAL ====
        drawSectionHeader(t('pdf.budgetVsActual', lang));

        if (budgetData.length === 0) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(140);
          doc.text(t('pdf.noBudgets', lang), marginL + 4, y);
          y += 8;
        } else {
          // Totals row
          const bTotalPct = budgetTotal.limit > 0 ? Math.round((budgetTotal.spent / budgetTotal.limit) * 100) : (budgetTotal.spent > 0 ? 100 : 0);
          const totalBarColor = bTotalPct > 100 ? [220, 38, 38] : [59, 130, 246];

          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(60);
          doc.text(`${t('pdf.total', lang)} ${fmt(budgetTotal.limit)}`, marginL + 4, y - 1);
          doc.setTextColor(100);
          doc.setFont('helvetica', 'normal');
          doc.text(`${t('pdf.spent', lang)} ${fmt(budgetTotal.spent)}`, marginL + 60, y - 1);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(bTotalPct > 100 ? 185 : 60);
          doc.text(`${bTotalPct}%`, marginL + 130, y - 1);

          // Total progress bar
          const totalBarY = y + 2;
          drawProgressBar(marginL + 4, totalBarY, contentW - 8, 3, bTotalPct, totalBarColor);
          y += 11;

          // Per-budget rows
          budgetData.forEach(b => {
            const rgb = hexToRgb(b.color);
            checkPage(14);

            // Background highlight for over-budget
            if (b.isOverBudget) {
              doc.setFillColor(255, 245, 245);
              doc.rect(marginL + 2, y - 5, contentW - 4, 13, 'F');
            }

            // Color dot
            doc.setFillColor(rgb[0], rgb[1], rgb[2]);
            doc.circle(marginL + 8, y - 1, 1.5, 'F');

            // Category name
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(b.isOverBudget ? 180 : 60, b.isOverBudget ? 40 : 60, b.isOverBudget ? 40 : 60);
            doc.text(b.categoryName, marginL + 13, y);

            // Spent / limit label
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(120);
            doc.text(`${t('pdf.spent', lang)} ${fmt(b.spent)} / ${fmt(b.limit)}`, marginL + 80, y - 1);

            // Percentage / over-budget text
            if (b.isOverBudget) {
              doc.setTextColor(220, 38, 38);
              doc.setFont('helvetica', 'bold');
              doc.text(`${b.displayPct}`, marginL + 140, y - 1);
              doc.setFontSize(6);
              doc.text(`${t('pdf.overBy', lang)} ${fmt(Math.abs(b.remaining))}`, marginL + 155, y - 1);
            } else {
              doc.setTextColor(60);
              doc.setFont('helvetica', 'bold');
              doc.text(`${b.displayPct}`, marginL + 140, y - 1);
            }

            // Mini progress bar
            drawProgressBar(marginL + 8, y + 3, contentW - 16, 2.5, b.percentage,
              b.isOverBudget ? [220, 38, 38] : rgb);

            y += 11;
          });
        }

        // ==== SMART INSIGHTS ====
        if (currentTxCount > 0) {
          drawSectionHeader(t('pdf.smartInsights', lang));

          // Top category card
          if (topCategory) {
            checkPage(14);
            const topRgb = catNameToRgb(topCategory.name);
            doc.setFillColor(248, 249, 250);
            doc.rect(marginL + 2, y - 4, contentW - 4, 12, 'F');
            doc.setFillColor(topRgb[0], topRgb[1], topRgb[2]);
            doc.rect(marginL + 2, y - 4, 1.5, 12, 'F');

            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(60);
            doc.text(t('pdf.topCategory', lang), marginL + 8, y);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(180, 60, 60);
            doc.text(`${topCategory.name} \u2014 ${fmt(topCategory.current)}`, marginL + 8, y + 5);
            y += 14;
          }

          // Biggest increase card
          if (biggestIncrease && hasComparison) {
            checkPage(14);
            doc.setFillColor(255, 247, 237);
            doc.rect(marginL + 2, y - 4, contentW - 4, 12, 'F');
            doc.setFillColor(234, 88, 12);
            doc.rect(marginL + 2, y - 4, 1.5, 12, 'F');

            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(60);
            doc.text(t('pdf.biggestIncrease', lang), marginL + 8, y);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(234, 88, 12);
            doc.text(`${biggestIncrease.name} \u2014 +${fmt(biggestIncrease.diff)} (${biggestIncrease.pctChange > 0 ? '+' : ''}${biggestIncrease.pctChange}%)`, marginL + 8, y + 5);
            y += 14;
          }

          // Biggest decrease card
          if (biggestDecrease && hasComparison) {
            checkPage(14);
            doc.setFillColor(240, 253, 244);
            doc.rect(marginL + 2, y - 4, contentW - 4, 12, 'F');
            doc.setFillColor(22, 163, 74);
            doc.rect(marginL + 2, y - 4, 1.5, 12, 'F');

            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(60);
            doc.text(t('pdf.biggestDecrease', lang), marginL + 8, y);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(22, 163, 74);
            doc.text(`${biggestDecrease.name} \u2014 -${fmt(Math.abs(biggestDecrease.diff))} (${biggestDecrease.pctChange}%)`, marginL + 8, y + 5);
            y += 14;
          }

          // Summary stats row
          checkPage(12);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(80);
          doc.text(`${t('pdf.totalIncomeLabel', lang)} ${fmt(totalIncome)}`, marginL + 4, y);
          doc.text(`${t('pdf.totalExpenseLabel', lang)} ${fmt(totalExpense)}`, marginL + 75, y);
          const savingsColor = savingsRate >= 0 ? [22, 163, 74] : [220, 38, 38];
          doc.setTextColor(savingsColor[0], savingsColor[1], savingsColor[2]);
          doc.setFont('helvetica', 'bold');
          doc.text(`${t('pdf.savingsRate', lang)} ${savingsRate >= 0 ? '+' : ''}${savingsRate}%`, marginL + 145, y);
          y += 7;

          // Tx count
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100);
          doc.setFontSize(7);
          const txCountStr = `${t('pdf.transactions', lang)} ${currentTxCount}` + (hasComparison ? ` (${currentTxCount - prevTxCount >= 0 ? '+' : ''}${currentTxCount - prevTxCount} ${t('pdf.vsPrevPeriod', lang)})` : '');
          doc.text(txCountStr, marginL + 4, y);
          y += 7;
        }

        // ==== ANOMALY DETECTION ====
        drawSectionHeader(t('pdf.anomalyDetection', lang));

        doc.setFontSize(9);
        if (filtered.filter(tx => tx.type === 'expense').length < 3) {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(140);
          doc.text(t('pdf.needMoreTx', lang), marginL + 4, y);
          y += 8;
        } else if (anomalies.length === 0) {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(140);
          doc.text(t('pdf.noAnomalies', lang), marginL + 4, y);
          y += 8;
        } else {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(180, 60, 60);
          doc.text(`${anomalies.length} ${t('pdf.flagged', lang)} (> 2\u00d7 ${t('pdf.avg', lang).replace(':', '')})`, marginL + 4, y);
          y += 8;

          doc.setFontSize(8);
          anomalies.forEach(a => {
            const rgb = hexToRgb(a.color);
            checkPage(14);

            // Card background
            doc.setFillColor(255, 247, 250);
            doc.rect(marginL + 2, y - 4, contentW - 4, 11, 'F');
            // Left accent bar
            doc.setFillColor(rgb[0], rgb[1], rgb[2]);
            doc.rect(marginL + 2, y - 4, 1.5, 11, 'F');

            // Category name
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(60);
            doc.text(a.categoryName, marginL + 8, y - 1);

            // Notes / date
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(120);
            doc.text(a.notes || a.date, marginL + 55, y - 1);

            // Amount (right side)
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(180, 60, 60);
            doc.text(fmt(a.amount), marginL + 130, y - 1);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(120);
            doc.setFontSize(7);
            doc.text(`${a.multiplier}\u00d7 ${t('pdf.avg', lang)} ${fmt(a.average)}`, marginL + 130, y + 4);

            y += 12;
          });
        }

        // ==== TRANSACTIONS ====
        drawSectionHeader(`${t('pdf.transactions', lang).replace(':', '')} (${filtered.length})`);

        // Header row
        doc.setFillColor(41, 56, 86);
        doc.rect(marginL, y - 4, contentW, 6, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        const colPositions = [
          { text: t('pdf.date', lang), x: marginL + 4 },
          { text: t('pdf.type', lang), x: marginL + 44 },
          { text: t('pdf.category', lang), x: marginL + 70 },
          { text: t('pdf.account', lang), x: marginL + 108 },
          { text: t('pdf.amount', lang), x: marginL + contentW - 4, align: 'right' },
        ];
        colPositions.forEach(col => {
          doc.text(col.text, col.x, y, col.align ? { align: col.align } : undefined);
        });
        y += 8;

        // Transaction rows
        const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
        doc.setFontSize(7);
        sorted.forEach((tx, idx) => {
          if (y > 275) {
            doc.addPage();
            y = 20;
            // Re-draw header on new page
            doc.setFillColor(41, 56, 86);
            doc.rect(marginL, y - 4, contentW, 6, 'F');
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            colPositions.forEach(col => {
              doc.text(col.text, col.x, y, col.align ? { align: col.align } : undefined);
            });
            y += 8;
          }

          // Alternating row background
          if (idx % 2 === 1) {
            doc.setFillColor(248, 249, 250);
            doc.rect(marginL, y - 3, contentW, 5.5, 'F');
          }

          const cat = categories.find(c => c.id === tx.categoryId);
          const acc = accounts.find(a => a.id === tx.accountId);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60);
          doc.text(tx.date || '-', marginL + 4, y);

          // Type with color — use localized labels
          const typeColor = tx.type === 'income' ? [22, 163, 74]
            : tx.type === 'expense' ? [220, 38, 38]
            : [59, 130, 246];
          doc.setTextColor(typeColor[0], typeColor[1], typeColor[2]);
          doc.setFont('helvetica', 'bold');
          const typeLabel = tx.type === 'income' ? t('income', lang)
            : tx.type === 'expense' ? t('expense', lang)
            : t('transfer', lang);
          doc.text(typeLabel, marginL + 44, y);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60);
          doc.text(cat?.name || '-', marginL + 70, y);
          doc.text(acc?.name || '-', marginL + 108, y);

          // Amount
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(typeColor[0], typeColor[1], typeColor[2]);
          doc.text(fmt(tx.amount), marginL + contentW - 4, y, { align: 'right' });

          y += 5.5;
        });

        // ==== FOOTER ====
        checkPage(8);
        doc.setDrawColor(210, 210, 210);
        doc.line(marginL, y, marginL + contentW, y);
        y += 4;
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(156, 163, 175);
        doc.text(`${t('pdf.footer', lang)} ${genDate}`, pageW / 2, y, { align: 'center' });

        doc.save(`Pocket_Khata_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      } catch (e) {
        console.error('PDF generation error:', e);
        alert('Failed to generate PDF. Check console for details.');
      }
      setIsGeneratingPDF(false);
    }, 500);
  };

  const handleReset = () => {
    onResetDatabase();
    setShowResetConfirm(false);
    alert(t('settings.resetSuccess', lang));
    onNavigate('dashboard');
  };

  return (
    <div style={styles.container}>
      
      {/* Header Bar */}
      <div style={styles.header}>
        <button className="neo-btn neo-btn-round" style={styles.backBtn} onClick={() => onNavigate('dashboard')}>
          <ArrowLeft size={18} />
        </button>
        <h2 style={styles.title}>{t('settings.title', lang)}</h2>
        <div style={{ width: '36px' }} /> {/* alignment placeholder */}
      </div>

      <div style={styles.content}>
        
        {/* SECTION 1: Data (Export / Import / Reset) */}
        <div className="neo-raised" style={styles.card}>
          <div style={styles.cardHeader}>
            <FileSpreadsheet size={16} style={{ color: 'var(--accent-color)' }} />
            <h3 style={styles.cardTitle}>Data</h3>
          </div>

          <p style={styles.cardDesc}>{t('settings.exportDescJSON', lang)}</p>

          <div style={styles.syncBtnRow}>
            <button className="neo-btn" style={{ ...styles.exportBtn, flex: 1 }} onClick={handleExportJSON}>
              <Download size={14} style={{ color: 'var(--accent-color)' }} /> {t('settings.exportJSON', lang)}
            </button>

            <button className="neo-btn" style={{ ...styles.exportBtn, flex: 1 }} onClick={handleImportClick}>
              <Upload size={14} style={{ color: 'var(--accent-color)' }} /> {t('settings.importJSON', lang)}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <div style={{ height: '14px' }} />

          <p style={styles.cardDesc}>{t('settings.resetDesc', lang)}</p>

          {showResetConfirm ? (
            <div className="neo-pressed-sm" style={styles.resetConfirmPanel}>
              <ShieldAlert size={20} style={{ color: 'var(--color-expense)', marginBottom: '6px' }} />
              <p style={styles.resetConfirmText}>{t('settings.irreversible', lang)}</p>
              <div style={styles.resetBtnGroup}>
                <button className="neo-btn" style={styles.resetYesBtn} onClick={handleReset}>
                  {t('settings.yesFormat', lang)}
                </button>
                <button className="neo-btn" onClick={() => setShowResetConfirm(false)}>
                  {t('cancel', lang)}
                </button>
              </div>
            </div>
          ) : (
            <button className="neo-btn" style={styles.resetBtn} onClick={() => setShowResetConfirm(true)}>
              {t('settings.formatApp', lang)}
            </button>
          )}
        </div>

        {/* SECTION 2: Export PDF */}
        <div className="neo-raised" style={styles.card}>
          <div style={styles.cardHeader}>
            <FileText size={16} style={{ color: 'var(--accent-color)' }} />
            <h3 style={styles.cardTitle}>{t('reports.title', lang)}</h3>
          </div>

          <p style={styles.cardDesc}>
            {t('reports.exportDesc', lang)}
          </p>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>{t('reports.selectPeriod', lang)}</label>
            <select
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value)}
              className="neo-input"
              style={styles.formSelect}
            >
              <option value="thisMonth">{t('reports.thisMonth', lang)}</option>
              <option value="lastMonth">{t('reports.lastMonth', lang)}</option>
              <option value="last3Months">{t('reports.last3Months', lang)}</option>
              <option value="last6Months">{t('reports.last6Months', lang)}</option>
              <option value="thisYear">{t('reports.thisYear', lang)}</option>
            </select>
          </div>

          <button 
            className="neo-btn neo-btn-primary" 
            style={styles.pdfBtn}
            onClick={handleExportPDF}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <RefreshCw size={14} className="spin-anim" />
            ) : (
              <FileText size={14} />
            )}
            {t('reports.exportPDF', lang)}
          </button>
        </div>

        {/* SECTION 3: Notifications */}
        <div className="neo-raised" style={styles.card}>
          <div style={styles.cardHeader}>
            <Bell size={16} style={{ color: 'var(--accent-color)' }} />
            <h3 style={styles.cardTitle}>{t('notif.settingsTitle', lang)}</h3>
          </div>

          <p style={styles.cardDesc}>
            {t('notif.settingsDesc', lang)}
          </p>

          {/* Notification enable toggle */}
          <label style={styles.switchRow}>
            <div style={styles.switchLabelGroup}>
              <span style={styles.switchTitle}>{t('notif.enableToggle', lang)}</span>
              <span style={styles.switchDesc}>{t('notif.enableToggleDesc', lang)}</span>
              {!notifSupported && (
                <span style={{ fontSize: '9px', fontWeight: '600', color: 'var(--color-expense)', marginTop: '2px' }}>
                  {t('notif.permissionUnsupported', lang)}
                </span>
              )}
              {notifSupported && notifPermission !== 'granted' && notificationsEnabled && (
                <span style={{ fontSize: '9px', fontWeight: '600', color: 'var(--color-expense)', marginTop: '2px' }}>
                  {t('notif.noPermission', lang)}
                  <button
                    className="neo-btn"
                    style={{ marginLeft: '6px', fontSize: '9px', padding: '2px 8px', height: '20px', borderRadius: '6px', border: '1px solid var(--accent-color)', color: 'var(--accent-color)' }}
                    onClick={(e) => { e.stopPropagation(); requestNotificationPermission(); }}
                  >
                    {t('notif.grantPermission', lang)}
                  </button>
                </span>
              )}
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={handleToggleNotifications}
              />
              <span className="toggle-slider" />
            </label>
          </label>

          {/* Reminder alerts toggle */}
          <label style={{ ...styles.switchRow, marginTop: '4px' }}>
            <div style={styles.switchLabelGroup}>
              <span style={styles.switchTitle}>{t('notif.reminderAlerts', lang)}</span>
              <span style={styles.switchDesc}>{t('notif.reminderAlertsDesc', lang)}</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={reminderAlertsEnabled}
                onChange={handleToggleReminderAlerts}
                disabled={!notificationsEnabled}
              />
              <span className="toggle-slider" />
            </label>
          </label>
        </div>

        {/* SECTION 4: Info */}
        <div className="neo-raised" style={styles.card}>
          <div style={styles.cardHeader}>
            <Info size={16} style={{ color: 'var(--accent-color)' }} />
            <h3 style={styles.cardTitle}>{t('about.title', lang)}</h3>
          </div>

          <p style={{ ...styles.cardDesc, marginBottom: '4px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {t('settings.version', lang)}
          </p>

          <p style={{ ...styles.cardDesc, marginBottom: '4px' }}>
            {t('settings.dbInfo', lang)} — Schema v{db.getStoredSchemaVersion()}
          </p>

          <p style={styles.cardDesc}>
            {t('about.desc', lang)}
          </p>

          <p style={styles.cardDesc}>
            {t('about.developer', lang)}
          </p>
        </div>

      </div>

    </div>
  );
}

Settings.propTypes = {
  onResetDatabase: PropTypes.func,
  onImportDatabase: PropTypes.func,
  onExportDatabase: PropTypes.func,
  transactions: PropTypes.array,
  accounts: PropTypes.array,
  categories: PropTypes.array,
  budgets: PropTypes.array,
  onNavigate: PropTypes.func,
  lang: PropTypes.string,
};

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    height: '100%',
    paddingRight: '2px',
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
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '30px',
  },
  card: {
    padding: '16px 14px',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  cardDesc: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    marginBottom: '14px',
  },

  syncBtnRow: {
    display: 'flex',
    gap: '12px',
  },
  syncBtn: {
    flex: 1,
    height: '38px',
    fontSize: '12px',
  },
  restoreBtn: {
    flex: 1,
    height: '38px',
    fontSize: '12px',
  },
  syncSuccess: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--color-income)',
    marginTop: '10px',
    paddingLeft: '4px',
  },
  syncError: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--color-expense)',
    marginTop: '10px',
    paddingLeft: '4px',
  },
  exportBtn: {
    width: '100%',
    height: '38px',
    fontSize: '12px',
    justifyContent: 'center',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '10px',
  },
  formLabel: {
    fontSize: '9px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    letterSpacing: '0.5px',
    marginBottom: '2px',
  },
  formSelect: {
    appearance: 'none',
    cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%237f8c8d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 16px center',
    backgroundSize: '16px',
    paddingRight: '40px',
  },
  pdfBtn: {
    width: '100%',
    height: '38px',
    fontSize: '12px',
    justifyContent: 'center',
  },
  sectionToggles: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '14px',
    marginTop: '2px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    padding: '4px 2px',
  },
  checkboxText: {
    fontSize: '11px',
    color: 'var(--text-primary)',
    fontWeight: '500',
  },
  resetBtn: {
    width: '100%',
    height: '38px',
    fontSize: '12px',
    justifyContent: 'center',
    border: '1px solid var(--color-expense)',
    color: 'var(--color-expense)',
  },
  snapshotCard: {
    padding: '10px 12px',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '8px',
  },
  snapshotHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  snapshotLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  snapshotTime: {
    fontSize: '9px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  snapshotStats: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px 10px',
  },
  snapshotStat: {
    fontSize: '9px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  restoreSnapshotBtn: {
    alignSelf: 'flex-end',
    fontSize: '10px',
    height: '26px',
    padding: '0 10px',
    borderRadius: '8px',
    backgroundColor: 'var(--accent-color)',
    color: '#fff',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
  },
  resetConfirmPanel: {
    padding: '12px',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  resetConfirmText: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '10px',
  },
  resetBtnGroup: {
    display: 'flex',
    gap: '10px',
    width: '100%',
  },
  resetYesBtn: {
    flex: 1,
    border: '1px solid var(--color-expense)',
    backgroundColor: 'var(--bg-color)',
    color: 'var(--color-expense)',
  },
  footer: {
    textAlign: 'center',
    fontSize: '10px',
    color: 'var(--text-secondary)',
    opacity: 0.6,
    marginTop: '10px',
    fontWeight: '500',
  },
};

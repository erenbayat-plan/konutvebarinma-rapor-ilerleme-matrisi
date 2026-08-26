const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

const tabStyles = `

/* Tab Navigation Redesign */
.portal-tabs-bar {
  display: flex;
  gap: 8px;
  padding: 0 48px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-main);
  margin-bottom: 24px;
}

.portal-tab-btn {
  padding: 16px 24px;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-light);
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: -1px;
}

.portal-tab-btn:hover {
  color: var(--text-main);
  background: var(--bg-elevated);
}

.portal-tab-btn.active.tab-indigo {
  color: #4f46e5;
  border-bottom-color: #4f46e5;
  background: #eef2ff;
}

.portal-tab-btn.active.tab-amber {
  color: #d97706;
  border-bottom-color: #d97706;
  background: #fffbeb;
}

@media (max-width: 1024px) {
  .portal-tabs-bar {
    padding: 0 24px;
  }
}
@media (max-width: 768px) {
  .portal-tabs-bar {
    padding: 0 16px;
    flex-direction: column;
    gap: 0;
  }
  .portal-tab-btn {
    padding: 12px 16px;
    font-size: 14px;
    border-bottom: none;
    border-left: 3px solid transparent;
  }
  .portal-tab-btn.active.tab-indigo {
    border-left-color: #4f46e5;
  }
  .portal-tab-btn.active.tab-amber {
    border-left-color: #d97706;
  }
}
`;

code += tabStyles;
fs.writeFileSync('src/index.css', code);

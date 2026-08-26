const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const tabHtmlOld = `        {/* Tab Navigation */}
        <div className="tab-navigation flex space-x-2 border-b border-gray-200/50 mb-6 pb-2">
          <button 
            className={\`px-4 py-2 font-medium text-sm transition-all rounded-t-md \${activeTab === 'mevcut_durum' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}\`}
            onClick={() => { setActiveTab('mevcut_durum'); setSelectedChapterFilter('all'); }}
          >
            Konut ve Barınma Alanlarının Mevcut Durumu
          </button>
          <button 
            className={\`px-4 py-2 font-medium text-sm transition-all rounded-t-md \${activeTab === 'politika' ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}\`}
            onClick={() => { setActiveTab('politika'); setSelectedChapterFilter('all'); }}
          >
            Politikalar, Yatırımlar ve Teşviklerin Konut ve Barınmaya Etkisi
          </button>
        </div>`;

code = code.replace(tabHtmlOld, '');

const headerEnd = `      </header>`;
const newTabs = `      </header>
      
      <div className="portal-tabs-bar">
        <button 
          className={\`portal-tab-btn \${activeTab === 'mevcut_durum' ? 'active tab-indigo' : ''}\`}
          onClick={() => { setActiveTab('mevcut_durum'); setSelectedChapterFilter('all'); }}
        >
          Konut ve Barınma Alanlarının Mevcut Durumu
        </button>
        <button 
          className={\`portal-tab-btn \${activeTab === 'politika' ? 'active tab-amber' : ''}\`}
          onClick={() => { setActiveTab('politika'); setSelectedChapterFilter('all'); }}
        >
          Politikalar, Yatırımlar ve Teşviklerin Etkisi
        </button>
      </div>`;

code = code.replace(headerEnd, newTabs);

fs.writeFileSync('src/App.tsx', code);

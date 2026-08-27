import React, { useState, useEffect } from 'react';
import { X, Layers, Edit3, AlertCircle } from 'lucide-react';
import type { AnalysisItem } from '../reportData';
import { ConfirmModal } from './ConfirmModal';

interface AnalysisModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  itemCode?: string;
  itemTitle?: string;
  initialData?: Partial<AnalysisItem>;
  onClose: () => void;
  onSubmit: (data: { name: string; category?: string; status: 'Tamamlandı' | 'Devam Ediyor' | 'Başlamadı' | 'İncelemede' }) => void;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({
  isOpen,
  mode,
  itemCode = '',
  itemTitle = '',
  initialData,
  onClose,
  onSubmit
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('CBS / Harita Analizi');
  const [status, setStatus] = useState<'Tamamlandı' | 'Devam Ediyor' | 'Başlamadı' | 'İncelemede'>('Başlamadı');
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setCategory(initialData.category || 'CBS / Harita Analizi');
        setStatus(initialData.status || 'Başlamadı');
      } else {
        setName('');
        setCategory('CBS / Harita Analizi');
        setStatus('Başlamadı');
      }
      setError(null);
      setShowConfirm(false);
    }
  }, [isOpen, initialData, mode]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    if (!name.trim()) {
      setError('Lütfen analiz adını girin');
      return false;
    }
    setError(null);
    return true;
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setShowConfirm(true);
    }
  };

  const handleFinalConfirm = () => {
    setShowConfirm(false);
    onSubmit({
      name: name.trim(),
      category: category.trim() || undefined,
      status
    });
    onClose();
  };

  return (
    <>
      <div className="custom-modal-backdrop" onClick={onClose}>
        <div 
          className="custom-modal-dialog analysis-modal-dialog"
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="custom-modal-header">
            <div className="cmh-title-row">
              <div className="cmh-icon-badge">
                {mode === 'add' ? <Layers size={18} /> : <Edit3 size={18} />}
              </div>
              <div>
                <h3 className="custom-modal-title">
                  {mode === 'add' ? 'Yeni Analiz Ekle' : 'Analizi Düzenle'}
                </h3>
                {itemTitle && (
                  <span className="custom-modal-subtitle">
                    Bağlı Başlık: <b>{itemCode} {itemTitle}</b>
                  </span>
                )}
              </div>
            </div>
            <button 
              type="button" 
              className="custom-modal-close" 
              onClick={onClose}
              title="Kapat"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handlePreSubmit}>
            <div className="custom-modal-body">
              {error && (
                <div className="form-error-banner">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <div className="form-field-group">
                <label className="form-label">
                  Analiz / Harita Adı <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Örn: Bina Yaş Dağılımı ve Ruhsat Yoğunluk Analizi"
                  value={name}
                  onChange={e => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  required
                />
              </div>

              <div className="form-grid-2">
                <div className="form-field-group">
                  <label className="form-label">
                    Analiz Kategorisi / Türü
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Örn: CBS / Harita Analizi"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    list="category-suggestions"
                  />
                  <datalist id="category-suggestions">
                    <option value="CBS / Harita Analizi" />
                    <option value="Tipoloji & Morfoloji Analizi" />
                    <option value="Demografik & Sosyo-Ekonomik" />
                    <option value="Yapı Stoğu & Ruhsat Analizi" />
                    <option value="Fiyat, Değer & Kira Dağılımı" />
                    <option value="Ulaşım & Erişilebilirlik" />
                  </datalist>
                </div>

                <div className="form-field-group">
                  <label className="form-label">
                    Mevcut Durum
                  </label>
                  <select
                    className="form-select"
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                  >
                    <option value="Başlamadı">Başlamadı</option>
                    <option value="Devam Ediyor">Devam Ediyor</option>
                    <option value="Tamamlandı">Tamamlandı</option>
                    <option value="İncelemede">İncelemede</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="custom-modal-footer">
              <button 
                type="button" 
                className="btn-modal-cancel" 
                onClick={onClose}
              >
                İptal
              </button>
              <button 
                type="submit" 
                className="btn-modal-submit"
              >
                {mode === 'add' ? 'Ekle ve Onayla' : 'Değişiklikleri Onayla'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title={mode === 'add' ? 'Yeni Analizi Eklemek İstiyor musunuz?' : 'Analiz Değişikliklerini Kaydetmek İstiyor musunuz?'}
        message={
          mode === 'add'
            ? `"${name}" analizi "${itemCode} ${itemTitle}" başlığı altına eklenecektir.`
            : `"${name}" analizi güncellenecektir.`
        }
        confirmLabel={mode === 'add' ? 'Evet, Ekle' : 'Evet, Güncelle'}
        cancelLabel="Vazgeç"
        variant="primary"
        details={
          <div className="confirm-preview-box">
            <div className="cp-row">
              <span className="cp-label">Analiz:</span>
              <span className="cp-val">{name}</span>
            </div>
            {category && (
              <div className="cp-row">
                <span className="cp-label">Kategori:</span>
                <span className="cp-val">{category}</span>
              </div>
            )}
            <div className="cp-row">
              <span className="cp-label">Durum:</span>
              <span className="cp-val">{status}</span>
            </div>
          </div>
        }
        onConfirm={handleFinalConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
};

import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, BookmarkPlus, Edit3 } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

export interface HeadingFormData {
  code: string;
  title: string;
  defaultPages?: string;
  icerikOzeti?: string;
  sartnameUyum?: string;
}

interface HeadingModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  degree: 2 | 3 | 4;
  parentCode?: string;
  parentTitle?: string;
  initialData?: HeadingFormData;
  existingCodes?: string[];
  onClose: () => void;
  onSubmit: (data: HeadingFormData) => void;
}

export const HeadingModal: React.FC<HeadingModalProps> = ({
  isOpen,
  mode,
  degree,
  parentCode = '',
  parentTitle = '',
  initialData,
  existingCodes = [],
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState<HeadingFormData>({
    code: '',
    title: '',
    defaultPages: '8-10 sf',
    icerikOzeti: '',
    sartnameUyum: ''
  });

  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          code: initialData.code || '',
          title: initialData.title || '',
          defaultPages: initialData.defaultPages || '8-10 sf',
          icerikOzeti: initialData.icerikOzeti || '',
          sartnameUyum: initialData.sartnameUyum || ''
        });
      } else {
        // Auto generate next code based on parent and existing codes
        let nextCode = '';
        if (degree === 2) {
          // Parent is chapter (e.g. '2' or '3')
          const prefix = parentCode ? `${parentCode}.` : '1.';
          const matching = existingCodes.filter(c => c.startsWith(prefix));
          let maxIndex = 0;
          matching.forEach(c => {
            const parts = c.split('.');
            if (parts.length === 2) {
              const num = parseInt(parts[1], 10);
              if (!isNaN(num) && num > maxIndex) maxIndex = num;
            }
          });
          nextCode = `${prefix}${maxIndex + 1}`;
        } else if (degree === 3) {
          // Parent is level 2 (e.g. '3.1')
          const prefix = parentCode ? `${parentCode}.` : '3.1.';
          const matching = existingCodes.filter(c => c.startsWith(prefix));
          let maxIndex = 0;
          matching.forEach(c => {
            const parts = c.split('.');
            if (parts.length === 3) {
              const num = parseInt(parts[2], 10);
              if (!isNaN(num) && num > maxIndex) maxIndex = num;
            }
          });
          nextCode = `${prefix}${maxIndex + 1}`;
        } else if (degree === 4) {
          // Parent is level 3 (e.g. '3.2.1')
          const prefix = parentCode ? `${parentCode}.` : '3.2.1.';
          const matching = existingCodes.filter(c => c.startsWith(prefix));
          let maxIndex = 0;
          matching.forEach(c => {
            const parts = c.split('.');
            if (parts.length === 4) {
              const num = parseInt(parts[3], 10);
              if (!isNaN(num) && num > maxIndex) maxIndex = num;
            }
          });
          nextCode = `${prefix}${maxIndex + 1}`;
        }

        setFormData({
          code: nextCode,
          title: '',
          defaultPages: '8-10 sf',
          icerikOzeti: '',
          sartnameUyum: ''
        });
      }
      setError(null);
      setShowConfirm(false);
    }
  }, [isOpen, initialData, mode, degree, parentCode, existingCodes]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    if (!formData.code.trim()) {
      setError('Lütfen başlık kodunu girin (Örn: 2.2, 3.1.2 veya 3.2.1.1)');
      return false;
    }

    const parts = formData.code.trim().split('.').filter(Boolean);
    if (degree === 2 && parts.length !== 2) {
      setError('2. derece başlık kodu tam 2 kısımdan oluşmalıdır (Örn: 2.2 veya 3.5)');
      return false;
    }
    if (degree === 3 && parts.length !== 3) {
      setError('3. derece başlık kodu tam 3 kısımdan oluşmalıdır (Örn: 3.1.3)');
      return false;
    }
    if (degree === 4 && parts.length !== 4) {
      setError('4. derece başlık kodu tam 4 kısımdan oluşmalıdır (Örn: 3.2.1.2)');
      return false;
    }

    if (!formData.title.trim()) {
      setError('Lütfen başlık adını girin');
      return false;
    }

    // Check code uniqueness if changed
    if (mode === 'add' || (initialData && initialData.code !== formData.code.trim())) {
      if (existingCodes.includes(formData.code.trim())) {
        setError(`"${formData.code.trim()}" kodu zaten mevcut. Lütfen farklı bir kod belirleyin.`);
        return false;
      }
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
      ...formData,
      code: formData.code.trim(),
      title: formData.title.trim()
    });
    onClose();
  };

  return (
    <>
      <div className="custom-modal-backdrop" onClick={onClose}>
        <div 
          className="custom-modal-dialog heading-modal-dialog"
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="custom-modal-header">
            <div className="cmh-title-row">
              <div className="cmh-icon-badge">
                {mode === 'add' ? <BookmarkPlus size={18} /> : <Edit3 size={18} />}
              </div>
              <div>
                <h3 className="custom-modal-title">
                  {mode === 'add' 
                    ? `${degree}. Derece Yeni Başlık Ekle` 
                    : `${degree}. Derece Başlığı Düzenle`}
                </h3>
                {parentTitle && (
                  <span className="custom-modal-subtitle">
                    Üst Başlık: <b>{parentCode} {parentTitle}</b>
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

              <div className="form-grid-2">
                <div className="form-field-group">
                  <label className="form-label">
                    Başlık Kodu <span className="req-star">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input code-input"
                    placeholder={degree === 2 ? "Örn: 2.3" : degree === 3 ? "Örn: 3.1.4" : "Örn: 3.2.1.3"}
                    value={formData.code}
                    onChange={e => {
                      setFormData(prev => ({ ...prev, code: e.target.value }));
                      if (error) setError(null);
                    }}
                    required
                  />
                  <span className="form-field-hint">
                    {degree === 2 
                      ? "2 kademeli ana alt başlık (X.Y)" 
                      : degree === 3 
                        ? "3 kademeli hiyerarşi (X.Y.Z)" 
                        : "4 kademeli alt hiyerarşi (X.Y.Z.W)"}
                  </span>
                </div>

                <div className="form-field-group">
                  <label className="form-label">
                    Tahmini Sayfa Sayısı
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Örn: 8-10 sf veya 12 sf"
                    value={formData.defaultPages}
                    onChange={e => setFormData(prev => ({ ...prev, defaultPages: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-field-group">
                <label className="form-label">
                  Başlık Adı <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Başlığı açıklayıcı şekilde girin…"
                  value={formData.title}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, title: e.target.value }));
                    if (error) setError(null);
                  }}
                  required
                />
              </div>

              <div className="form-field-group">
                <label className="form-label">
                  İçerik & Metodoloji Özeti (İsteğe Bağlı)
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Bu başlık altında incelenecek konular, veri kaynakları ve yaklaşım özeti…"
                  value={formData.icerikOzeti}
                  onChange={e => setFormData(prev => ({ ...prev, icerikOzeti: e.target.value }))}
                />
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

      {/* Confirmation Step */}
      <ConfirmModal
        isOpen={showConfirm}
        title={mode === 'add' ? 'Yeni Başlığı Eklemek İstiyor musunuz?' : 'Başlık Değişikliklerini Kaydetmek İstiyor musunuz?'}
        message={
          mode === 'add'
            ? `"${formData.code} ${formData.title}" başlıklı ${degree}. derece bölüm çatkıya eklenecektir.`
            : `"${formData.code} ${formData.title}" başlığı güncellenecektir.`
        }
        confirmLabel={mode === 'add' ? 'Evet, Ekle' : 'Evet, Güncelle'}
        cancelLabel="Vazgeç"
        variant="primary"
        details={
          <div className="confirm-preview-box">
            <div className="cp-row">
              <span className="cp-label">Kod:</span>
              <span className="cp-val">{formData.code}</span>
            </div>
            <div className="cp-row">
              <span className="cp-label">Başlık:</span>
              <span className="cp-val">{formData.title}</span>
            </div>
            {formData.defaultPages && (
              <div className="cp-row">
                <span className="cp-label">Tahmini Sayfa:</span>
                <span className="cp-val">{formData.defaultPages}</span>
              </div>
            )}
          </div>
        }
        onConfirm={handleFinalConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
};

import React from 'react';
import { AlertCircle, AlertTriangle, Trash2, CheckCircle2, HelpCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  details?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Onayla',
  cancelLabel = 'Vazgeç',
  variant = 'primary',
  details,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <Trash2 size={20} className="modal-icon-danger" />;
      case 'warning':
        return <AlertTriangle size={20} className="modal-icon-warning" />;
      default:
        return <CheckCircle2 size={20} className="modal-icon-primary" />;
    }
  };

  return (
    <div className="custom-modal-backdrop" onClick={onCancel}>
      <div 
        className="custom-modal-dialog confirm-dialog"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="confirm-modal-header">
          <div className={`confirm-icon-box variant-${variant}`}>
            {getIcon()}
          </div>
          <div className="confirm-title-wrap">
            <h3 className="confirm-title">{title}</h3>
            <p className="confirm-message">{message}</p>
          </div>
        </div>

        {details && (
          <div className="confirm-details-box">
            {details}
          </div>
        )}

        <div className="confirm-modal-actions">
          <button 
            type="button" 
            className="btn-modal-cancel" 
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button 
            type="button" 
            className={`btn-modal-confirm variant-${variant}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// src/components/Modal.jsx
export default function Modal({
  title,
  children,
  onCancel,
  onSubmit,
  submitLabel = "Submit",
  cancelLabel = "Cancel",
}) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{title}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit?.();
          }}
        >
          {children}
          <div className="modal-actions">
            <button type="button" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button type="submit">{submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

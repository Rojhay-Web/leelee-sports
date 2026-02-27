type ConfirmToastProps = { 
    onConfirm: () => void,
    onCancel: () => void, 
    message: string,
    confirmText?: string,
    cancelText?: string
};

const ConfirmToastContent = ({ onCancel, onConfirm, message, confirmText, cancelText }: ConfirmToastProps) => (
    <div className="confirm-toast-container">
        <p>{message}</p>
        <div className="btn-container">
            <button className="confirm-btn" onClick={onConfirm}>{confirmText || "OK"}</button>
            <button className="cancel-btn" onClick={onCancel}>{cancelText || "Cancel"}</button>
        </div>
    </div>
);

export default ConfirmToastContent;